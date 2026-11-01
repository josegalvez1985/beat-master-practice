import type { Clase, EntradaDiario, Entrega } from "@/lib/data";

// Progress percentages, as pure functions (same numbers on every screen, and testable).

// Minutes logged in the diary between two dates (YYYY-MM-DD, both included).
export const minutosEntre = (entradas: EntradaDiario[], desde: string, hasta: string) =>
  entradas
    .filter((e) => e.fecha >= desde && e.fecha <= hasta)
    .reduce((total, e) => total + e.minutos, 0);

export type AvanceSemanal =
  | { tipo: "meta"; porcentaje: number; minutos: number; meta: number }
  | { tipo: "clases"; porcentaje: number; entregadas: number; total: number }
  | { tipo: "sin-datos"; minutos: number };

// The alumno's week. With a weekly goal: diary minutes (all instruments) against it. Without
// one: this week's classes delivered. Otherwise only the minutes.
export function avanceSemanal({
  diario,
  meta,
  clases,
  entregas,
  desde,
  hasta,
}: {
  diario: EntradaDiario[];
  meta?: number;
  clases: Clase[];
  entregas: Entrega[];
  desde: string;
  hasta: string;
}): AvanceSemanal {
  const minutos = minutosEntre(diario, desde, hasta);
  if (meta && meta > 0)
    return { tipo: "meta", porcentaje: Math.round((minutos / meta) * 100), minutos, meta };
  const deLaSemana = clases.filter((c) => c.fecha >= desde && c.fecha <= hasta);
  if (deLaSemana.length) {
    const entregadas = deLaSemana.filter((c) => entregas.some((e) => e.claseId === c.id)).length;
    return {
      tipo: "clases",
      porcentaje: Math.round((entregadas / deLaSemana.length) * 100),
      entregadas,
      total: deLaSemana.length,
    };
  }
  return { tipo: "sin-datos", minutos };
}
