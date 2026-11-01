// Typical harmonic forms of Paraguayan music to accompany and practice: the chords of each
// measure by degree, so they can be played in any key. No songs (and no lyrics): the forms
// are common ground, the songs belong to their authors.

// Degree: semitones from the tonic and the chord quality.
type Grado = { semitonos: number; calidad: "" | "m" | "7" };

const I: Grado = { semitonos: 0, calidad: "" };
const I7: Grado = { semitonos: 0, calidad: "7" };
const IV: Grado = { semitonos: 5, calidad: "" };
const V7: Grado = { semitonos: 7, calidad: "7" };
const i: Grado = { semitonos: 0, calidad: "m" };
const iv: Grado = { semitonos: 5, calidad: "m" };
const VI: Grado = { semitonos: 8, calidad: "" };
const III: Grado = { semitonos: 3, calidad: "" };

// One measure in eighths: "b" bass, "a" chord, "-" silence.
type Patron = ("b" | "a" | "-")[];

export type FormaId = "polca" | "guarania" | "galopa";

export type Forma = {
  id: FormaId;
  nombre: string;
  modo: "mayor" | "menor";
  // Beats per minute of the quarter note (three per 6/8 measure felt in 3/4).
  bpm: number;
  patron: Patron;
  compases: Grado[];
  descripcion: string;
  consejo: string;
};

export const FORMAS: Forma[] = [
  {
    id: "polca",
    nombre: "Polca paraguaya",
    modo: "mayor",
    bpm: 168,
    patron: ["b", "-", "a", "-", "a", "-"],
    compases: [I, I, V7, V7, V7, V7, I, I, I, I7, IV, IV, I, V7, I, I],
    descripcion:
      "En 6/8, con el acompañamiento que se siente en 3/4: esa mezcla (sesquiáltera) es su sello.",
    consejo: "Marca el bajo en el uno y deja que la melodía cuente en dos; no apures los cambios.",
  },
  {
    id: "guarania",
    nombre: "Guarania",
    modo: "menor",
    bpm: 84,
    patron: ["b", "-", "-", "a", "a", "-"],
    compases: [i, i, iv, iv, V7, V7, i, i, III, III, iv, iv, VI, V7, i, i],
    descripcion:
      "Lenta y melancólica, creada por José Asunción Flores en 1925. Casi siempre en tono menor.",
    consejo: "Toca suave y deja respirar el compás; el acorde llega después del bajo, sin prisa.",
  },
  {
    id: "galopa",
    nombre: "Galopa",
    modo: "mayor",
    bpm: 184,
    patron: ["b", "-", "a", "a", "-", "a"],
    compases: [I, I, IV, IV, V7, V7, I, I, I, I, IV, IV, I, V7, I, I],
    descripcion: "Polca de ritmo vivo y festivo, la de las galoperas y la danza de la botella.",
    consejo: "Acentúa con energía y mantén el tempo parejo: es para bailar.",
  },
];

export const forma = (id: FormaId) => FORMAS.find((f) => f.id === id) ?? FORMAS[0]!;

const NOMBRES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SOLFEO = ["Do", "Do#", "Re", "Mib", "Mi", "Fa", "Fa#", "Sol", "Lab", "La", "Sib", "Si"];

// Keys that sit well on the instruments that accompany (guitar, harp, piano), by mode.
export const TONOS: Record<Forma["modo"], number[]> = {
  mayor: [7, 2, 9, 0, 4, 5],
  menor: [4, 9, 2, 11, 7, 0],
};

export const nombreTono = (tonica: number, modo: Forma["modo"]) =>
  `${SOLFEO[tonica]}${modo === "menor" ? " menor" : " mayor"}`;

export function acordesDe(f: Forma, tonica: number) {
  return f.compases.map(
    (g) => `${NOMBRES[(tonica + g.semitonos) % 12]}${g.calidad === "m" ? "m" : g.calidad}`,
  );
}

// Bass note of a chord name (lowest Mi of the guitar up), as MIDI.
export function bajoDe(acorde: string) {
  const raiz = NOMBRES.indexOf(acorde.match(/^[A-G][#b]?/)?.[0] ?? "C");
  return 40 + ((raiz - 4 + 12) % 12);
}
