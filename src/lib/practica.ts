import { useSyncExternalStore } from "react";
import type { Clase, Entrega } from "@/lib/data";
import { hoy, sumarDias } from "@/lib/dates";

// Which plan blocks an alumno marked done in this browser. It opens at once and keeps what was
// marked before `practicas` existed; what counts on every device, and what the profesor sees, is
// that collection (marcarBloque). The days and minutes of the week come from the diary.

type Registro = { fecha: string; clase: string; bloque: string; minutos: number };

const clave = (uid: string) => `pulso-practica-${uid}`;
const listeners = new Set<() => void>();
const cache = new Map<string, Registro[]>();

function leer(uid: string): Registro[] {
  const enCache = cache.get(uid);
  if (enCache) return enCache;
  let registros: Registro[] = [];
  try {
    registros = JSON.parse(localStorage.getItem(clave(uid)) ?? "[]") as Registro[];
  } catch {
    // Blocked or corrupt storage: start empty.
  }
  cache.set(uid, registros);
  return registros;
}

function escribir(uid: string, registros: Registro[]) {
  // Only the last 6 months matter.
  const desde = sumarDias(hoy(), -180);
  const vigentes = registros.filter((r) => r.fecha >= desde);
  cache.set(uid, vigentes);
  try {
    localStorage.setItem(clave(uid), JSON.stringify(vigentes));
  } catch {
    // Without storage the log lasts until the page is closed.
  }
  listeners.forEach((listener) => listener());
}

export function usePractica(uid: string) {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => leer(uid),
  );
}

export const hechosDeClase = (registros: Registro[], claseId: string) =>
  new Set(registros.filter((r) => r.clase === claseId).map((r) => r.bloque));

export function marcarHecho(
  uid: string,
  claseId: string,
  bloqueId: string,
  minutos: number,
  hecho: boolean,
) {
  const sinEste = leer(uid).filter((r) => !(r.clase === claseId && r.bloque === bloqueId));
  escribir(
    uid,
    hecho ? [...sinEste, { fecha: hoy(), clase: claseId, bloque: bloqueId, minutos }] : sinEste,
  );
}

// The class to practice next: not delivered yet, today or the closest upcoming one; if none,
// the most recent overdue one.
export function proximaClase(clases: Clase[], entregas: Entrega[]) {
  const entregadas = new Set(entregas.map((e) => e.claseId));
  const pendientes = clases.filter((c) => !entregadas.has(c.id));
  const fechaHoy = hoy();
  const proximas = pendientes
    .filter((c) => c.fecha >= fechaHoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const atrasadas = pendientes
    .filter((c) => c.fecha < fechaHoy)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return proximas[0] ?? atrasadas[0] ?? null;
}

export function cuandoEs(fecha: string) {
  const fechaHoy = hoy();
  if (fecha === fechaHoy) return "Hoy";
  if (fecha === sumarDias(fechaHoy, 1)) return "Mañana";
  if (fecha < fechaHoy) return "Atrasada";
  return null;
}
