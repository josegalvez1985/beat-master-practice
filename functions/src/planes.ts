import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { exigirAdmin, refAdmin } from "./admin.js";

// Profesor plans (src/lib/planes.ts explains them). The Admin SDK skips the security rules, so
// every check is here:
// - agregarAlumno: the only way to add an alumno to a list (the rules deny creating inscripciones
//   from the app), so the plan's limit (alumnos counted by person) cannot be skipped.
// - activarPlan: the admin records a payment and extends the plan (optionally with a number of
//   alumnos of its own), in one transaction.
// - habilitarDias: the admin grants days as an exception (no payment, with a reason), keeping
//   the plan; recorded in pagos as a "cortesia" of Gs. 0.
// - planesAdmin: the admin's list of profesores with their plan and phone, and the trials that
//   are missing.
// Keep PLANES, the 30 days of trial and the 5 working days of grace in sync with
// src/lib/planes.ts, firestore.rules and storage.rules.

const PLANES = {
  inicial: { nombre: "Inicial", alumnos: 5 },
  profesor: { nombre: "Profesor", alumnos: 20 },
  academia: { nombre: "Academia", alumnos: 60 },
} as const;
type PlanPago = keyof typeof PLANES;
const ALUMNOS_EN_PRUEBA = 60;
const DIAS_DE_PRUEBA = 30;
// Profesores registered before the plans were published get their 30 days from that day:
// 2 November 2026, 00:00 in Paraguay.
const LANZAMIENTO = new Date("2026-11-02T03:00:00Z");

const REGION = "southamerica-east1";
const PY_MS = 3 * 60 * 60 * 1000; // Paraguay is UTC-3 all year.
const DIA_MS = 24 * 60 * 60 * 1000;

const db = () => getFirestore();

// `venceEn`: a paid plan or days granted by the admin (also during the trial); without it, the
// trial lasts 30 days from `pruebaDesde`. `maxAlumnos`: a limit set by the admin for this profesor.
type Suscripcion = {
  plan: "prueba" | PlanPago;
  pruebaDesde?: Timestamp;
  venceEn?: Timestamp;
  maxAlumnos?: number;
};
const MAX_ALUMNOS = 500;

const esPlanPago = (plan: unknown): plan is PlanPago =>
  typeof plan === "string" && Object.hasOwn(PLANES, plan);

const alumnosDelPlan = (plan: Suscripcion["plan"]) =>
  plan === "prueba" ? ALUMNOS_EN_PRUEBA : (PLANES[plan]?.alumnos ?? 0);

const limiteDe = (s: Suscripcion) => s.maxAlumnos ?? alumnosDelPlan(s.plan);

function venceDe(s: Suscripcion) {
  if (s.venceEn) return s.venceEn.toDate();
  if (s.plan !== "prueba") throw new HttpsError("internal", "Plan sin fecha de vencimiento.");
  if (!s.pruebaDesde) throw new HttpsError("internal", "Plan de prueba sin fecha de inicio.");
  return new Date(s.pruebaDesde.toMillis() + DIAS_DE_PRUEBA * DIA_MS);
}

// The current due date, also for a profesor without a plan record (from before the plans).
const venceActualDe = (s: Suscripcion | undefined, usuario: FirebaseFirestore.DocumentData) =>
  s
    ? venceDe(s)
    : new Date(
        Math.max(creadoEnDe(usuario).getTime(), LANZAMIENTO.getTime()) + DIAS_DE_PRUEBA * DIA_MS,
      );

// 5 working days after the due date (Monday to Friday, Paraguay time; holidays count).
function bloqueoDe(vence: Date) {
  const dia = new Date(vence.getTime() - PY_MS).getUTCDay();
  return new Date(vence.getTime() + (dia === 6 ? 6 : dia === 0 ? 5 : 7) * DIA_MS);
}

// Calendar months in Paraguay time; the 31st becomes the last day of a shorter month.
function sumarMeses(fecha: Date, meses: number) {
  const local = new Date(fecha.getTime() - PY_MS);
  const anio = local.getUTCFullYear();
  const mes = local.getUTCMonth() + meses;
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const resultado = Date.UTC(
    anio,
    mes,
    Math.min(local.getUTCDate(), ultimoDia),
    local.getUTCHours(),
    local.getUTCMinutes(),
    local.getUTCSeconds(),
  );
  return new Date(resultado + PY_MS);
}

const creadoEnDe = (usuario: FirebaseFirestore.DocumentData) =>
  usuario.creadoEn instanceof Timestamp ? usuario.creadoEn.toDate() : LANZAMIENTO;

// --- Adding an alumno to a list ---

export const agregarAlumno = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Entra a tu cuenta.");
  const { alumnoId, instrumento } = (request.data ?? {}) as Record<string, unknown>;
  if (typeof alumnoId !== "string" || !/^[A-Za-z0-9]{10,64}$/.test(alumnoId))
    throw new HttpsError("invalid-argument", "Alumno no válido.");
  if (typeof instrumento !== "string" || !/^[a-z]{2,20}$/.test(instrumento))
    throw new HttpsError("invalid-argument", "Instrumento no válido.");

  const ref = db().doc(`inscripciones/${uid}_${alumnoId}_${instrumento}`);
  return db().runTransaction(async (tx) => {
    const [admin, profesor, alumno, suscripcion, existente, lista] = await Promise.all([
      tx.get(refAdmin()),
      tx.get(db().doc(`usuarios/${uid}`)),
      tx.get(db().doc(`usuarios/${alumnoId}`)),
      tx.get(db().doc(`suscripciones/${uid}`)),
      tx.get(ref),
      tx.get(db().collection("inscripciones").where("profesorId", "==", uid)),
    ]);
    const p = profesor.data();
    const a = alumno.data();
    if (p?.rol !== "profesor")
      throw new HttpsError("permission-denied", "Solo un profesor agrega alumnos.");
    if (!Array.isArray(p.instrumentos) || !p.instrumentos.includes(instrumento))
      throw new HttpsError("invalid-argument", "No enseñas ese instrumento.");
    if (a?.rol !== "alumno") throw new HttpsError("not-found", "No encontramos a ese alumno.");
    if (existente.exists) return { agregado: false };

    // The admin account (documentos/4169298) has everything enabled: no due date, no limit.
    const esAdmin = admin.get("uid") === uid;
    const s = suscripcion.data() as Suscripcion | undefined;
    if (!esAdmin && (!s || Date.now() >= bloqueoDe(venceDe(s)).getTime()))
      throw new HttpsError(
        "failed-precondition",
        "Tu plan venció: renuévalo en Mi plan para agregar alumnos.",
      );
    // Alumnos counted by person: a second instrument of someone already in a list is free.
    const alumnos = new Set(lista.docs.map((d) => d.get("alumnoId") as string));
    const limite = esAdmin || !s ? Infinity : limiteDe(s);
    if (!alumnos.has(alumnoId) && alumnos.size >= limite)
      throw new HttpsError(
        "resource-exhausted",
        `Tu plan permite hasta ${limite} alumnos y ya tienes ${alumnos.size}. Cambia de plan en Mi plan para agregar más.`,
      );

    tx.create(ref, {
      profesorId: uid,
      profesorNombre: p.nombre,
      alumnoId,
      alumnoNombre: a.nombre,
      alumnoDocumento: a.nro_documento,
      instrumento,
      creadoEn: FieldValue.serverTimestamp(),
    });
    return { agregado: true };
  });
});

// --- Admin: recording a payment ---

export const activarPlan = onCall({ region: REGION, maxInstances: 2 }, async (request) => {
  await exigirAdmin(request.auth?.uid);
  const { profesorId, plan, meses, monto, referencia, alumnos } = (request.data ?? {}) as Record<
    string,
    unknown
  >;
  if (typeof profesorId !== "string" || !/^[A-Za-z0-9]{10,64}$/.test(profesorId))
    throw new HttpsError("invalid-argument", "Profesor no válido.");
  if (!esPlanPago(plan)) throw new HttpsError("invalid-argument", "Plan no válido.");
  // Optional: a number of alumnos of its own for this profesor, instead of the plan's.
  if (
    alumnos != null &&
    (!Number.isInteger(alumnos) || (alumnos as number) < 1 || (alumnos as number) > MAX_ALUMNOS)
  )
    throw new HttpsError("invalid-argument", `Los alumnos van de 1 a ${MAX_ALUMNOS}.`);
  const maxAlumnos =
    alumnos != null && alumnos !== alumnosDelPlan(plan) ? (alumnos as number) : undefined;
  if (!Number.isInteger(meses) || (meses as number) < 1 || (meses as number) > 12)
    throw new HttpsError("invalid-argument", "Los meses van de 1 a 12.");
  if (!Number.isInteger(monto) || (monto as number) < 1 || (monto as number) > 100_000_000)
    throw new HttpsError("invalid-argument", "Monto no válido.");
  const ref = typeof referencia === "string" ? referencia.trim() : "";
  const clave = ref
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (ref.length > 80 || clave.length < 3)
    throw new HttpsError(
      "invalid-argument",
      "Escribe la referencia del pago (por ejemplo, el número de la transferencia).",
    );
  // Exceptions use ids that start with "cortesia": a payment cannot take one.
  if (clave.startsWith("cortesia"))
    throw new HttpsError("invalid-argument", "Usa la referencia real del pago.");

  const pagoRef = db().doc(`pagos/${profesorId}_${clave}`);
  const suscripcionRef = db().doc(`suscripciones/${profesorId}`);
  return db().runTransaction(async (tx) => {
    const [usuario, suscripcion, pago] = await Promise.all([
      tx.get(db().doc(`usuarios/${profesorId}`)),
      tx.get(suscripcionRef),
      tx.get(pagoRef),
    ]);
    const u = usuario.data();
    if (u?.rol !== "profesor") throw new HttpsError("not-found", "Ese profesor no existe.");
    // The same reference twice is the same payment: never extend the plan twice for it.
    if (pago.exists)
      throw new HttpsError("already-exists", "Ese pago ya está registrado para este profesor.");

    const actual = suscripcion.data() as Suscripcion | undefined;
    const ahora = new Date();
    const venceActual = venceActualDe(actual, u);
    // Paid before the block: the new period follows the previous one without a gap (the grace
    // days are not free days). Paid once blocked: it starts now.
    const desde = ahora < bloqueoDe(venceActual) ? venceActual : ahora;
    const hasta = sumarMeses(desde, meses as number);

    // The whole record is replaced: a payment without its own number of alumnos goes back to
    // the plan's.
    tx.set(suscripcionRef, {
      plan,
      venceEn: Timestamp.fromDate(hasta),
      ...(maxAlumnos ? { maxAlumnos } : {}),
      actualizadoEn: FieldValue.serverTimestamp(),
    });
    tx.create(pagoRef, {
      tipo: "pago",
      profesorId,
      plan,
      meses,
      monto,
      alumnos: maxAlumnos ?? alumnosDelPlan(plan),
      referencia: ref,
      desde: Timestamp.fromDate(desde),
      hasta: Timestamp.fromDate(hasta),
      registradoEn: FieldValue.serverTimestamp(),
      registradoPor: request.auth?.uid,
    });
    return { desde: desde.toISOString(), hasta: hasta.toISOString() };
  });
});

// --- Admin: days granted as an exception ---

const MAX_DIAS = 365;

// "2026-12-15" → the end of that day in Paraguay.
function finDelDia(fecha: string) {
  const [anio = 0, mes = 1, dia = 1] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia, 23, 59, 59) + PY_MS);
}

export const habilitarDias = onCall({ region: REGION, maxInstances: 2 }, async (request) => {
  await exigirAdmin(request.auth?.uid);
  const { profesorId, dias, hasta, motivo } = (request.data ?? {}) as Record<string, unknown>;
  if (typeof profesorId !== "string" || !/^[A-Za-z0-9]{10,64}$/.test(profesorId))
    throw new HttpsError("invalid-argument", "Profesor no válido.");
  const porDias = dias != null;
  if (porDias === (hasta != null))
    throw new HttpsError("invalid-argument", "Elige una cantidad de días o una fecha.");
  if (porDias && (!Number.isInteger(dias) || (dias as number) < 1 || (dias as number) > MAX_DIAS))
    throw new HttpsError("invalid-argument", `Los días van de 1 a ${MAX_DIAS}.`);
  if (!porDias && (typeof hasta !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)))
    throw new HttpsError("invalid-argument", "Fecha no válida.");
  const razon = typeof motivo === "string" ? motivo.trim() : "";
  if (razon.length < 3 || razon.length > 200)
    throw new HttpsError("invalid-argument", "Escribe el motivo (de 3 a 200 caracteres).");

  const suscripcionRef = db().doc(`suscripciones/${profesorId}`);
  return db().runTransaction(async (tx) => {
    const [usuario, suscripcion] = await Promise.all([
      tx.get(db().doc(`usuarios/${profesorId}`)),
      tx.get(suscripcionRef),
    ]);
    const u = usuario.data();
    if (u?.rol !== "profesor") throw new HttpsError("not-found", "Ese profesor no existe.");
    const actual = suscripcion.data() as Suscripcion | undefined;
    const ahora = new Date();
    // From today if it already expired, from its due date if not: it never shortens a plan.
    const desde = new Date(Math.max(ahora.getTime(), venceActualDe(actual, u).getTime()));
    const nuevo = porDias
      ? new Date(desde.getTime() + (dias as number) * DIA_MS)
      : finDelDia(hasta as string);
    if (nuevo <= desde)
      throw new HttpsError(
        "failed-precondition",
        "Ya está habilitado hasta esa fecha o más: elige una fecha posterior.",
      );
    if (nuevo.getTime() - ahora.getTime() > MAX_DIAS * DIA_MS)
      throw new HttpsError("invalid-argument", "Como máximo, un año desde hoy.");

    // Keeps the plan, the trial start and the number of alumnos; only the due date changes.
    const base: Suscripcion = actual ?? {
      plan: "prueba",
      pruebaDesde: Timestamp.fromMillis(Math.max(creadoEnDe(u).getTime(), LANZAMIENTO.getTime())),
    };
    tx.set(suscripcionRef, {
      ...base,
      venceEn: Timestamp.fromDate(nuevo),
      actualizadoEn: FieldValue.serverTimestamp(),
    });
    tx.create(db().doc(`pagos/${profesorId}_cortesia-${ahora.getTime()}`), {
      tipo: "cortesia",
      profesorId,
      plan: base.plan,
      meses: 0,
      monto: 0,
      alumnos: limiteDe(base),
      referencia: "Cortesía",
      motivo: razon,
      desde: Timestamp.fromDate(desde),
      hasta: Timestamp.fromDate(nuevo),
      registradoEn: FieldValue.serverTimestamp(),
      registradoPor: request.auth?.uid,
    });
    return { hasta: nuevo.toISOString() };
  });
});

// --- Admin: the profesores and their plans ---

async function listar() {
  const [profesores, suscripciones, inscripciones, pagos, telefonos, admin] = await Promise.all([
    db().collection("usuarios").where("rol", "==", "profesor").get(),
    db().collection("suscripciones").get(),
    db().collection("inscripciones").select("profesorId", "alumnoId").get(),
    db().collection("pagos").orderBy("registradoEn", "desc").limit(100).get(),
    db().collection("telefonos").get(),
    refAdmin().get(),
  ]);
  const uidAdmin = admin.get("uid") as string | undefined;
  const telefonoDe = new Map(telefonos.docs.map((d) => [d.id, d.get("telefono") as string]));
  const planDe = new Map(suscripciones.docs.map((d) => [d.id, d.data() as Suscripcion]));
  const alumnosDe = new Map<string, Set<string>>();
  for (const d of inscripciones.docs) {
    const set = alumnosDe.get(d.get("profesorId")) ?? new Set<string>();
    set.add(d.get("alumnoId"));
    alumnosDe.set(d.get("profesorId"), set);
  }
  const nombres = new Map(profesores.docs.map((d) => [d.id, d.get("nombre") as string]));
  return {
    profesores: profesores.docs
      .map((d) => {
        const s = planDe.get(d.id);
        const vence = s ? venceDe(s) : null;
        return {
          uid: d.id,
          nombre: d.get("nombre") as string,
          documento: d.get("nro_documento") as string,
          telefono: telefonoDe.get(d.id) ?? null,
          admin: d.id === uidAdmin,
          plan: s?.plan ?? null,
          vence: vence?.toISOString() ?? null,
          bloqueo: vence ? bloqueoDe(vence).toISOString() : null,
          alumnos: alumnosDe.get(d.id)?.size ?? 0,
          limite: s ? limiteDe(s) : 0,
          aMedida: s?.maxAlumnos != null,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    pagos: pagos.docs.map((d) => ({
      id: d.id,
      tipo: (d.get("tipo") as string | undefined) ?? "pago",
      motivo: (d.get("motivo") as string | undefined) ?? null,
      alumnos: (d.get("alumnos") as number | undefined) ?? null,
      profesor: nombres.get(d.get("profesorId")) ?? d.get("profesorId"),
      plan: d.get("plan") as string,
      meses: d.get("meses") as number,
      monto: d.get("monto") as number,
      referencia: d.get("referencia") as string,
      hasta: (d.get("hasta") as Timestamp).toDate().toISOString(),
      registradoEn: (d.get("registradoEn") as Timestamp | null)?.toDate().toISOString() ?? null,
    })),
  };
}

// Profesores without a plan record (registered before the plans): a trial from the later of their
// registration and the launch day. `create` never overwrites a plan that appeared meanwhile.
async function crearPruebas() {
  const [profesores, suscripciones] = await Promise.all([
    db().collection("usuarios").where("rol", "==", "profesor").get(),
    db().collection("suscripciones").select().get(),
  ]);
  const conPlan = new Set(suscripciones.docs.map((d) => d.id));
  const faltan = profesores.docs.filter((d) => !conPlan.has(d.id));
  for (let i = 0; i < faltan.length; i += 400) {
    const batch = db().batch();
    for (const d of faltan.slice(i, i + 400)) {
      const desde = Math.max(creadoEnDe(d.data()).getTime(), LANZAMIENTO.getTime());
      batch.create(db().doc(`suscripciones/${d.id}`), {
        plan: "prueba",
        pruebaDesde: Timestamp.fromMillis(desde),
      });
    }
    await batch.commit();
  }
  return { creadas: faltan.length };
}

export const planesAdmin = onCall(
  { region: REGION, timeoutSeconds: 60, maxInstances: 2 },
  async (request) => {
    await exigirAdmin(request.auth?.uid);
    const { que } = (request.data ?? {}) as { que?: unknown };
    if (que === "listar") return listar();
    if (que === "crearPruebas") return crearPruebas();
    throw new HttpsError("invalid-argument", "Pedido no válido.");
  },
);
