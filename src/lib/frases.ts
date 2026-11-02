import texto from "./frases.md?raw";
import type { Role } from "@/lib/auth";

// Motivational lines for the home greeting, kept in frases.md: one list per role, one line each.
// One line per day (Paraguay time), the same all day: a round goes through the whole list
// without repeating, then the next round starts in another order.

function lista(titulo: string) {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n");
  const inicio = lineas.indexOf(`## ${titulo}`);
  if (inicio < 0) return [];
  const resto = lineas.slice(inicio + 1);
  const fin = resto.findIndex((l) => l.startsWith("## "));
  return (fin < 0 ? resto : resto.slice(0, fin))
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

const frases: Record<Role, string[]> = {
  alumno: lista("Alumnos"),
  profesor: lista("Profesores"),
};

// Small seeded generator (mulberry32): the same round always gives the same order.
function generador(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ordenDeLaVuelta(cantidad: number, vuelta: number) {
  const azar = generador(vuelta * 7919 + cantidad);
  const orden = Array.from({ length: cantidad }, (_, i) => i);
  for (let i = cantidad - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [orden[i], orden[j]] = [orden[j]!, orden[i]!];
  }
  return orden;
}

const PY_MS = 3 * 60 * 60 * 1000; // Paraguay is UTC-3 all year.
const DIA_MS = 24 * 60 * 60 * 1000;

export function fraseDelDia(rol: Role, fecha = new Date()) {
  const deRol = frases[rol];
  if (!deRol.length) return null;
  const dia = Math.floor((fecha.getTime() - PY_MS) / DIA_MS);
  const vuelta = Math.floor(dia / deRol.length);
  const orden = ordenDeLaVuelta(deRol.length, vuelta);
  return deRol[orden[dia % deRol.length]!] ?? null;
}
