// Chord fingerings for diagrams. Frets go from the lowest string to the highest
// (guitar: E A D G B e; ukulele: G C E A); -1 = muted, 0 = open.

export type Digitacion = { trastes: number[]; cejilla?: number };

const NOTAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BEMOLES: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
const SOLFEO: Record<string, string> = {
  do: "C",
  re: "D",
  mi: "E",
  fa: "F",
  sol: "G",
  la: "A",
  si: "B",
};

// Qualities the generator understands, with their usual spellings.
const CALIDADES: Record<string, string> = {
  "": "",
  M: "",
  maj: "",
  m: "m",
  min: "m",
  "-": "m",
  "7": "7",
  m7: "m7",
  maj7: "maj7",
  M7: "maj7",
  "7M": "maj7",
  sus2: "sus2",
  sus4: "sus4",
  sus: "sus4",
  dim: "dim",
  "°": "dim",
  add9: "add9",
  "5": "5",
  "6": "6",
  m6: "m6",
  "9": "9",
};

// Normalizes "Lam", "la m", "Am", "Bbmaj7", "Fa#7"… to { raiz: "A", calidad: "m" }.
export function analizar(nombre: string) {
  const texto = nombre.trim().replace(/\s+/g, "");
  const solfeo = texto.match(/^(do|re|mi|fa|sol|la|si)([#b]?)(.*)$/i);
  let raiz: string;
  let resto: string;
  if (solfeo) {
    const [, nota = "", alteracion = "", sufijo = ""] = solfeo;
    raiz = (SOLFEO[nota.toLowerCase()] ?? "") + alteracion;
    resto = sufijo;
  } else {
    const ingles = texto.match(/^([A-Ga-g])([#b]?)(.*)$/);
    if (!ingles) return null;
    const [, nota = "", alteracion = "", sufijo = ""] = ingles;
    raiz = nota.toUpperCase() + alteracion;
    resto = sufijo;
  }
  raiz = BEMOLES[raiz] ?? raiz;
  if (raiz === "E#") raiz = "F";
  if (raiz === "B#") raiz = "C";
  if (raiz === "Cb") raiz = "B";
  if (raiz === "Fb") raiz = "E";
  if (!NOTAS.includes(raiz)) return null;
  const calidad = CALIDADES[resto] ?? CALIDADES[resto.toLowerCase()];
  if (calidad === undefined) return null;
  return { raiz, calidad };
}

// Open-position voicings teachers actually use.
const GUITARRA: Record<string, number[]> = {
  C: [-1, 3, 2, 0, 1, 0],
  Cmaj7: [-1, 3, 2, 0, 0, 0],
  C7: [-1, 3, 2, 3, 1, 0],
  Cadd9: [-1, 3, 2, 0, 3, 0],
  D: [-1, -1, 0, 2, 3, 2],
  Dm: [-1, -1, 0, 2, 3, 1],
  D7: [-1, -1, 0, 2, 1, 2],
  Dm7: [-1, -1, 0, 2, 1, 1],
  Dmaj7: [-1, -1, 0, 2, 2, 2],
  Dsus2: [-1, -1, 0, 2, 3, 0],
  Dsus4: [-1, -1, 0, 2, 3, 3],
  D5: [-1, -1, 0, 2, 3, -1],
  E: [0, 2, 2, 1, 0, 0],
  Em: [0, 2, 2, 0, 0, 0],
  E7: [0, 2, 0, 1, 0, 0],
  Em7: [0, 2, 2, 0, 3, 0],
  Esus4: [0, 2, 2, 2, 0, 0],
  E5: [0, 2, 2, -1, -1, -1],
  F: [1, 3, 3, 2, 1, 1],
  Fmaj7: [-1, -1, 3, 2, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
  G7: [3, 2, 0, 0, 0, 1],
  Gmaj7: [3, 2, 0, 0, 0, 2],
  G5: [3, 5, 5, -1, -1, -1],
  A: [-1, 0, 2, 2, 2, 0],
  Am: [-1, 0, 2, 2, 1, 0],
  A7: [-1, 0, 2, 0, 2, 0],
  Am7: [-1, 0, 2, 0, 1, 0],
  Amaj7: [-1, 0, 2, 1, 2, 0],
  Asus2: [-1, 0, 2, 2, 0, 0],
  Asus4: [-1, 0, 2, 2, 3, 0],
  A5: [-1, 0, 2, 2, -1, -1],
  B7: [-1, 2, 1, 2, 0, 2],
  Bdim: [-1, 2, 3, 4, 3, -1],
};

const UKELELE: Record<string, number[]> = {
  C: [0, 0, 0, 3],
  C7: [0, 0, 0, 1],
  Cm: [0, 3, 3, 3],
  D: [2, 2, 2, 0],
  Dm: [2, 2, 1, 0],
  D7: [2, 2, 2, 3],
  E: [4, 4, 4, 2],
  Em: [0, 4, 3, 2],
  E7: [1, 2, 0, 2],
  F: [2, 0, 1, 0],
  Fm: [1, 0, 1, 3],
  G: [0, 2, 3, 2],
  Gm: [0, 2, 3, 1],
  G7: [0, 2, 1, 2],
  A: [2, 1, 0, 0],
  Am: [2, 0, 0, 0],
  A7: [0, 1, 0, 0],
  Am7: [0, 0, 0, 0],
  "A#": [3, 2, 1, 1],
  B: [4, 3, 2, 2],
  Bm: [4, 2, 2, 2],
  B7: [2, 3, 2, 2],
};

// Movable barre shapes: E shape (root on the 6th string) and A shape (root on the 5th).
const FORMA_MI: Record<string, number[]> = {
  "": [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  "7": [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, -1, 1, 1, 0, -1],
  sus4: [0, 2, 2, 2, 0, 0],
  "5": [0, 2, 2, -1, -1, -1],
  m6: [0, 2, 2, 0, 2, 0],
  "6": [0, 2, 2, 1, 2, 0],
};
const FORMA_LA: Record<string, number[]> = {
  "": [-1, 0, 2, 2, 2, 0],
  m: [-1, 0, 2, 2, 1, 0],
  "7": [-1, 0, 2, 0, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0],
  maj7: [-1, 0, 2, 1, 2, 0],
  sus2: [-1, 0, 2, 2, 0, 0],
  sus4: [-1, 0, 2, 2, 3, 0],
  dim: [-1, 0, 1, 2, 1, -1],
  "5": [-1, 0, 2, 2, -1, -1],
  add9: [-1, 0, 2, 4, 2, 0],
};

const mover = (forma: number[], traste: number) => forma.map((f) => (f < 0 ? -1 : f + traste));

function cejilla(raiz: string, calidad: string): Digitacion | null {
  const mi = (NOTAS.indexOf(raiz) - NOTAS.indexOf("E") + 12) % 12 || 12;
  const la = (NOTAS.indexOf(raiz) - NOTAS.indexOf("A") + 12) % 12 || 12;
  const opciones: Digitacion[] = [];
  if (FORMA_MI[calidad]) opciones.push({ trastes: mover(FORMA_MI[calidad], mi), cejilla: mi });
  if (FORMA_LA[calidad]) opciones.push({ trastes: mover(FORMA_LA[calidad], la), cejilla: la });
  // The lower position is easier to reach.
  return opciones.sort((a, b) => (a.cejilla ?? 0) - (b.cejilla ?? 0))[0] ?? null;
}

export type InstrumentoAcordes = "guitarra" | "ukelele" | "requinto";

export function digitacion(nombre: string, instrumento: InstrumentoAcordes): Digitacion | null {
  const acorde = analizar(nombre);
  if (!acorde) return null;
  // The Paraguayan requinto is tuned a fourth above the guitar: its chord X is played with the
  // guitar shape of the chord a fourth below (the requinto's A is the E shape).
  if (instrumento === "requinto")
    return digitacion(NOTAS[(NOTAS.indexOf(acorde.raiz) + 7) % 12]! + acorde.calidad, "guitarra");
  const clave = acorde.raiz + acorde.calidad;
  if (instrumento === "ukelele") {
    const abierto = UKELELE[clave];
    return abierto ? { trastes: abierto } : null;
  }
  const abierto = GUITARRA[clave];
  if (abierto) return { trastes: abierto, cejilla: clave === "F" ? 1 : undefined };
  return cejilla(acorde.raiz, acorde.calidad);
}

// Suggestions for the chord picker.
export const ACORDES_COMUNES = {
  guitarra: [
    "C",
    "D",
    "E",
    "F",
    "G",
    "A",
    "Am",
    "Dm",
    "Em",
    "Bm",
    "A7",
    "B7",
    "D7",
    "E7",
    "G7",
    "Cmaj7",
    "Fmaj7",
  ],
  ukelele: ["C", "G", "Am", "F", "D", "Em", "A", "Dm", "G7", "E7", "A7", "Bm"],
  // Keys of Paraguayan folk music on the requinto.
  requinto: ["A", "D", "E", "E7", "Bm", "F#m", "A7", "B7", "G", "C", "Am", "Dm"],
};

// --- Notes of a chord (dictionary and ear training) ---

// Semitones above the root for each quality the generator understands.
export const INTERVALOS: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  add9: [0, 4, 7, 14],
  "5": [0, 7],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  "9": [0, 4, 7, 10, 14],
};

export const NOMBRE_CALIDAD: Record<string, string> = {
  "": "mayor",
  m: "menor",
  "7": "séptima",
  m7: "menor séptima",
  maj7: "séptima mayor",
  sus2: "con segunda suspendida",
  sus4: "con cuarta suspendida",
  dim: "disminuido",
  add9: "con novena agregada",
  "5": "quinta (power chord)",
  "6": "sexta",
  m6: "menor sexta",
  "9": "novena",
};

const SOLFEO_DE: Record<string, string> = {
  C: "Do",
  "C#": "Do#",
  D: "Re",
  "D#": "Re#",
  E: "Mi",
  F: "Fa",
  "F#": "Fa#",
  G: "Sol",
  "G#": "Sol#",
  A: "La",
  "A#": "La#",
  B: "Si",
};

// MIDI notes of the chord in close position, root between C4 and B4.
export function notasDelAcorde(nombre: string) {
  const acorde = analizar(nombre);
  if (!acorde) return null;
  const raiz = 60 + NOTAS.indexOf(acorde.raiz);
  return {
    ...acorde,
    nombre: `${SOLFEO_DE[acorde.raiz]} ${NOMBRE_CALIDAD[acorde.calidad]}`,
    midis: (INTERVALOS[acorde.calidad] ?? [0]).map((i) => raiz + i),
  };
}

// Open strings (MIDI), lowest to highest, as in the fingerings.
const AL_AIRE = {
  guitarra: [40, 45, 50, 55, 59, 64],
  ukelele: [67, 60, 64, 69],
  requinto: [45, 50, 55, 60, 64, 69],
};

// What the fingering sounds like, string by string (for a strum).
export function notasDeDigitacion(nombre: string, instrumento: InstrumentoAcordes) {
  const forma = digitacion(nombre, instrumento);
  if (!forma) return null;
  return forma.trastes.flatMap((traste, i) =>
    traste < 0 ? [] : [AL_AIRE[instrumento][i]! + traste],
  );
}
