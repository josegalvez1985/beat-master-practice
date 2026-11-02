import type { Timestamp } from "firebase/firestore";

// Profesor plans: a 30-day free trial from registration, then a monthly plan paid by transfer or
// QR to Pulso's ueno account (src/lib/datos-de-pago.ts) and activated by hand in /admin.
// After the due date there are 5 working days (Monday to Friday, Paraguay time) to pay; then the
// profesor can no longer create classes, add alumnos or upload files. Nothing is ever deleted.
//
// The same rules live in three places; keep them in sync:
// - here (what the app shows),
// - functions/src/planes.ts (adding alumnos and activating plans),
// - firestore.rules and storage.rules (venceDe / bloqueoDe / habilitado).

export type PlanId = "prueba" | "inicial" | "profesor" | "academia";

export const PLANES = [
  { id: "inicial", nombre: "Inicial", alumnos: 5, precio: 50_000 },
  { id: "profesor", nombre: "Profesor", alumnos: 20, precio: 150_000 },
  { id: "academia", nombre: "Academia", alumnos: 60, precio: 300_000 },
] as const;
export type PlanPago = (typeof PLANES)[number]["id"];

export const DIAS_DE_PRUEBA = 30;
// The trial has everything enabled: the largest plan's limit.
export const ALUMNOS_EN_PRUEBA = 60;
export const DIAS_HABILES_DE_GRACIA = 5;

// suscripciones/{uid}: one per profesor, never deleted. The trial keeps its start (written by
// the server clock) and lasts 30 days, unless `venceEn` is set: a paid plan, or days the admin
// granted as an exception (habilitarDias), which keep the plan. `maxAlumnos`: a limit the admin
// set by hand when recording a payment, instead of the plan's.
export type Suscripcion = {
  plan: PlanId;
  pruebaDesde?: Timestamp | null;
  venceEn?: Timestamp;
  maxAlumnos?: number;
  actualizadoEn?: Timestamp;
};

// Paraguay is UTC-3 all year (since October 2024).
const PY_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

export const nombreDelPlan = (plan: PlanId) =>
  plan === "prueba" ? "Prueba gratis" : (PLANES.find((p) => p.id === plan)?.nombre ?? plan);

export const alumnosDelPlan = (plan: PlanId) =>
  plan === "prueba" ? ALUMNOS_EN_PRUEBA : (PLANES.find((p) => p.id === plan)?.alumnos ?? 0);

export const limiteDeAlumnos = (s: Suscripcion) => s.maxAlumnos ?? alumnosDelPlan(s.plan);

export function venceDe(s: Suscripcion): Date | null {
  if (s.venceEn) return s.venceEn.toDate();
  if (s.plan !== "prueba") return null;
  // Just written: the server time is not back yet.
  const desde = s.pruebaDesde?.toDate() ?? new Date();
  return new Date(desde.getTime() + DIAS_DE_PRUEBA * DIA_MS);
}

// 5 working days after the due date, at the same time of day: from a weekday that is the same
// weekday next week; from Saturday or Sunday, the next Friday. Holidays count as working days.
export function bloqueoDe(vence: Date) {
  const dia = new Date(vence.getTime() - PY_MS).getUTCDay(); // 0 Sunday … 6 Saturday
  const dias = dia === 6 ? 6 : dia === 0 ? 5 : 7;
  return new Date(vence.getTime() + dias * DIA_MS);
}

export type EstadoPlan = "prueba" | "activo" | "gracia" | "bloqueado";

export function estadoDelPlan(s: Suscripcion | null, ahora = new Date()) {
  // Without a plan record (a profesor from before the plans, until /admin creates the trials)
  // the rules already block creating.
  if (!s)
    return {
      estado: "bloqueado" as EstadoPlan,
      plan: null,
      vence: null,
      bloqueo: null,
      limite: 0,
      aMedida: false,
    };
  const vence = venceDe(s);
  const bloqueo = vence ? bloqueoDe(vence) : null;
  let estado: EstadoPlan;
  if (!vence || !bloqueo || ahora >= bloqueo) estado = "bloqueado";
  else if (ahora >= vence) estado = "gracia";
  else estado = s.plan === "prueba" ? "prueba" : "activo";
  return {
    estado,
    plan: s.plan,
    vence,
    bloqueo,
    limite: limiteDeAlumnos(s),
    aMedida: s.maxAlumnos != null,
  };
}

export const diasHasta = (fecha: Date, ahora = new Date()) =>
  Math.max(0, Math.ceil((fecha.getTime() - ahora.getTime()) / DIA_MS));

// "2 de diciembre de 2026", in Paraguay time.
export const formatoFechaPlan = (fecha: Date) =>
  new Date(fecha.getTime() - PY_MS).toLocaleDateString("es-PY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export const guaranies = (monto: number) => `Gs. ${monto.toLocaleString("es-PY")}`;
