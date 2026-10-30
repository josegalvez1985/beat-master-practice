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

export function digitacion(nombre: string, instrumento: "guitarra" | "ukelele"): Digitacion | null {
  const acorde = analizar(nombre);
  if (!acorde) return null;
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
};
