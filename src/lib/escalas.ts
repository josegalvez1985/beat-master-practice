import type { InstrumentId } from "@/lib/instruments";

// Scales and arpeggios for the "escala" block: the notes from a tonic (pitch class 0 = Do) in
// the instrument's own register, going up and back down.

export type TipoEscala =
  | "mayor"
  | "menorNatural"
  | "menorArmonica"
  | "menorMelodica"
  | "pentatonicaMayor"
  | "pentatonicaMenor"
  | "blues"
  | "cromatica"
  | "arpegioMayor"
  | "arpegioMenor";

// Steps in semitones from one note to the next (they add up to an octave).
export const ESCALAS: { value: TipoEscala; label: string; pasos: number[] }[] = [
  { value: "mayor", label: "Mayor", pasos: [2, 2, 1, 2, 2, 2, 1] },
  { value: "menorNatural", label: "Menor natural", pasos: [2, 1, 2, 2, 1, 2, 2] },
  { value: "menorArmonica", label: "Menor armónica", pasos: [2, 1, 2, 2, 1, 3, 1] },
  { value: "menorMelodica", label: "Menor melódica", pasos: [2, 1, 2, 2, 2, 2, 1] },
  { value: "pentatonicaMayor", label: "Pentatónica mayor", pasos: [2, 2, 3, 2, 3] },
  { value: "pentatonicaMenor", label: "Pentatónica menor", pasos: [3, 2, 2, 3, 2] },
  { value: "blues", label: "Blues", pasos: [3, 2, 1, 1, 3, 2] },
  { value: "cromatica", label: "Cromática", pasos: Array(12).fill(1) },
  { value: "arpegioMayor", label: "Arpegio mayor", pasos: [4, 3, 5] },
  { value: "arpegioMenor", label: "Arpegio menor", pasos: [3, 4, 5] },
];

export const escala = (tipo: TipoEscala) => ESCALAS.find((e) => e.value === tipo) ?? ESCALAS[0]!;

// The Do the scale starts from (MIDI), around where each instrument is comfortable.
const REGISTRO: Partial<Record<InstrumentId, number>> = {
  contrabajo: 36,
  bajo: 36,
  violonchelo: 36,
  voz: 48,
  guitarra: 48,
  requinto: 52,
  trompeta: 58,
  saxofon: 60,
  flauta: 72,
};
export const registro = (instrumento: InstrumentId) => REGISTRO[instrumento] ?? 60;

// Up `octavas` octaves and back down (the top note once).
export function notasDeEscala(
  instrumento: InstrumentId,
  tonica: number,
  tipo: TipoEscala,
  octavas: number,
) {
  const inicio = registro(instrumento) + tonica;
  const subida = [inicio];
  for (let o = 0; o < octavas; o++)
    for (const paso of escala(tipo).pasos) subida.push(subida.at(-1)! + paso);
  return [...subida, ...subida.slice(0, -1).reverse()];
}
