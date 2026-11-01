// Notes in equal temperament (A4 = 440 Hz), by MIDI number: 60 = C4 (middle Do), 69 = A4.

export const LA4 = 440;
export const LATINAS = [
  "Do",
  "Do#",
  "Re",
  "Re#",
  "Mi",
  "Fa",
  "Fa#",
  "Sol",
  "Sol#",
  "La",
  "La#",
  "Si",
];
const AMERICANAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BASE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// `nombre` in Do-Re-Mi, `cifrado` in letters with the octave ("E2").
export type Nota = { midi: number; nombre: string; cifrado: string; frecuencia: number };

export const frecuenciaDe = (midi: number) => LA4 * 2 ** ((midi - 69) / 12);

export function nota(midi: number): Nota {
  const clase = ((midi % 12) + 12) % 12;
  return {
    midi,
    nombre: LATINAS[clase]!,
    cifrado: `${AMERICANAS[clase]}${Math.floor(midi / 12) - 1}`,
    frecuencia: frecuenciaDe(midi),
  };
}

// "E2", "D#4", "Bb3" (the alphaTex tunings in plan.ts) → MIDI number.
export function midiDeTexto(texto: string) {
  const [, letra = "A", alteracion, octava = "4"] = texto.match(/^([A-G])([#b]?)(-?\d)$/) ?? [];
  const desvio = alteracion === "#" ? 1 : alteracion === "b" ? -1 : 0;
  return (Number(octava) + 1) * 12 + BASE[letra]! + desvio;
}

export const notaDeTexto = (texto: string) => nota(midiDeTexto(texto));

export const cents = (frecuencia: number, objetivo: number) =>
  1200 * Math.log2(frecuencia / objetivo);

export const midiMasCercano = (frecuencia: number) =>
  Math.round(69 + 12 * Math.log2(frecuencia / LA4));
