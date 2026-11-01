import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Drum,
  Dumbbell,
  FileMusic,
  Flame,
  Guitar,
  Hand,
  ListChecks,
  ListMusic,
  Music2,
  Paperclip,
  PlaySquare,
  Repeat,
  Timer,
  Type,
  Wind,
} from "lucide-react";
import { ESTILOS, type Groove, type Voz } from "@/lib/bateria";
import type { TipoEscala } from "@/lib/escalas";
import type { Material } from "@/lib/files";
import type { InstrumentId } from "@/lib/instruments";
import { colors } from "@/lib/theme";

// --- Lesson plan of a class: header ("ficha") + ordered blocks. Stored in clases/{id}. ---

export type Etapa = "calentamiento" | "tecnica" | "repertorio" | "teoria" | "tarea" | "libre";

export type Compas = "4/4" | "3/4" | "6/8";
// One slot per eighth note: down, up, muted hit, or rest.
export type Golpe = "D" | "U" | "x" | "-";

type BloqueBase = {
  id: string;
  etapa: Etapa;
  titulo: string;
  minutos: number;
  notas: string;
};

export type Bloque = BloqueBase &
  (
    | { tipo: "texto" }
    | { tipo: "tablatura"; tex: string }
    | { tipo: "acordes"; acordes: string[] }
    | { tipo: "rasgueo"; compas: Compas; golpes: Golpe[]; bpm: number }
    | { tipo: "tempo"; inicio: number; objetivo: number; paso: number }
    | { tipo: "youtube"; url: string }
    | { tipo: "archivos"; archivos: Material[] }
    // Written notation with sound (alphaTex with \tuning piano: notes by name, no tab).
    | { tipo: "partitura"; tex: string }
    // Scale or arpeggio from a tonic (0 = Do), see src/lib/escalas.ts.
    | {
        tipo: "escala";
        tonica: number;
        escala: TipoEscala;
        octavas: number;
        bpm: number;
        porPulso: 1 | 2;
      }
    // Breathing (voice and winds), with an optional long note to sing or play (MIDI).
    | {
        tipo: "respiracion";
        inhalar: number;
        sostener: number;
        exhalar: number;
        repeticiones: number;
        nota: number | null;
      }
    // Drum kit (see src/lib/bateria.ts).
    | ({ tipo: "groove" } & Groove)
    | {
        tipo: "rudimento";
        rudimento: string;
        inicio: number;
        objetivo: number;
        paso: number;
        empiezaCon: "R" | "L";
      }
  );

export type TipoBloque = Bloque["tipo"];

export type Ficha = {
  nivel: "principiante" | "intermedio" | "avanzado";
  estilo: string;
  afinacion: string;
  capo: number;
  duracion: number;
  // Drum kit only: practice pad, drum kit or both, and how many drums.
  superficie?: "pad" | "bateria" | "ambas";
  kit?: number;
};

export type Plan = { ficha: Ficha; bloques: Bloque[] };

// Limits (keep the class document far below Firestore's 1 MiB; also in firestore.rules).
export const MAX_BLOQUES = 40;
export const MAX_TEX = 20000;

export const etapas: { value: Etapa; label: string; icon: LucideIcon; color: string }[] = [
  { value: "calentamiento", label: "Calentamiento", icon: Flame, color: colors.etapaCalentamiento },
  { value: "tecnica", label: "Técnica", icon: Dumbbell, color: colors.etapaTecnica },
  { value: "repertorio", label: "Repertorio", icon: Music2, color: colors.etapaRepertorio },
  { value: "teoria", label: "Teoría", icon: BookOpen, color: colors.etapaTeoria },
  { value: "tarea", label: "Tarea", icon: ListChecks, color: colors.etapaTarea },
  { value: "libre", label: "Libre", icon: Type, color: colors.mutedForeground },
];

// Families of instruments (which blocks and which 60-minute template they get).
const TECLADOS: InstrumentId[] = ["piano", "teclado", "acordeon"];
const ARCO: InstrumentId[] = ["violin", "violonchelo", "contrabajo"];
const VIENTO: InstrumentId[] = ["flauta", "saxofon", "trompeta"];
export const esPercusion = (i: InstrumentId) => i === "bateria" || i === "percusion";
// Instruments read from a staff, without tab.
export const conPartitura = (i: InstrumentId) =>
  [...TECLADOS, ...ARCO, ...VIENTO, "arpa", "voz"].includes(i);
export const conRespiracion = (i: InstrumentId) => i === "voz" || VIENTO.includes(i);

export const etapa = (value: Etapa) =>
  etapas.find((e) => e.value === value) ?? etapas[etapas.length - 1]!;

export const tiposDeBloque: {
  value: TipoBloque;
  label: string;
  descripcion: string;
  icon: LucideIcon;
  // Only for string instruments with frets (guitarra, bajo, ukelele) / with chords / drums.
  soloCuerdas?: boolean;
  soloAcordes?: boolean;
  soloBateria?: boolean;
  // Any other condition on the instrument.
  para?: (instrumento: InstrumentId) => boolean;
}[] = [
  {
    value: "partitura",
    label: "Partitura",
    descripcion: "Pentagrama con sonido",
    icon: FileMusic,
    para: conPartitura,
  },
  {
    value: "escala",
    label: "Escala o arpegio",
    descripcion: "Notas, teclado y sonido",
    icon: ListMusic,
    para: (i) => !esPercusion(i),
  },
  {
    value: "respiracion",
    label: "Respiración",
    descripcion: "Inhalar, sostener, exhalar y nota larga",
    icon: Wind,
    para: conRespiracion,
  },
  {
    value: "groove",
    label: "Groove",
    descripcion: "Ritmo de batería con sonido",
    icon: Drum,
    soloBateria: true,
  },
  {
    value: "rudimento",
    label: "Rudimento",
    descripcion: "Digitación R/L y escalera de tempo",
    icon: Repeat,
    soloBateria: true,
  },
  {
    value: "tablatura",
    label: "Tablatura",
    descripcion: "Pentagrama + tab con sonido",
    icon: Guitar,
    soloCuerdas: true,
  },
  {
    value: "acordes",
    label: "Acordes",
    descripcion: "Diagramas de acordes",
    icon: Hand,
    soloAcordes: true,
  },
  {
    value: "rasgueo",
    label: "Rasgueo",
    descripcion: "Patrón ↓↑ con tempo",
    icon: Music2,
    soloAcordes: true,
  },
  { value: "tempo", label: "Tempo", descripcion: "Ejercicio con metrónomo", icon: Timer },
  { value: "youtube", label: "YouTube", descripcion: "Video de referencia", icon: PlaySquare },
  {
    value: "archivos",
    label: "Archivos",
    descripcion: "Imágenes, PDF, audio, video, Guitar Pro",
    icon: Paperclip,
  },
  { value: "texto", label: "Texto", descripcion: "Indicaciones y teoría", icon: Type },
];

export const conCuerdas = (instrumento: InstrumentId) =>
  instrumento === "guitarra" ||
  instrumento === "bajo" ||
  instrumento === "ukelele" ||
  instrumento === "requinto";
export const conAcordes = (instrumento: InstrumentId) =>
  instrumento === "guitarra" || instrumento === "ukelele";

export const tiposPara = (instrumento: InstrumentId) =>
  tiposDeBloque.filter(
    (t) =>
      (!t.soloCuerdas || conCuerdas(instrumento)) &&
      (!t.soloAcordes || conAcordes(instrumento)) &&
      (!t.soloBateria || instrumento === "bateria") &&
      (!t.para || t.para(instrumento)),
  );

export const niveles: { value: Ficha["nivel"]; label: string }[] = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

export const estilos = [
  "Clásica",
  "Popular",
  "Folclore paraguayo",
  "Rock",
  "Blues",
  "Jazz",
  "Cumbia",
  "Worship",
];

// alphaTex tuning (high string first) per instrument and option.
export const afinaciones: Record<
  "guitarra" | "bajo" | "ukelele" | "requinto",
  { label: string; tex: string }[]
> = {
  guitarra: [
    { label: "Estándar (E)", tex: "E4 B3 G3 D3 A2 E2" },
    { label: "Drop D", tex: "E4 B3 G3 D3 A2 D2" },
    { label: "Medio tono abajo (Eb)", tex: "D#4 A#3 F#3 C#3 G#2 D#2" },
    { label: "DADGAD", tex: "D4 A3 G3 D3 A2 D2" },
    { label: "Open G", tex: "D4 B3 G3 D3 G2 D2" },
  ],
  bajo: [
    { label: "Estándar (E)", tex: "G2 D2 A1 E1" },
    { label: "Drop D", tex: "G2 D2 A1 D1" },
  ],
  ukelele: [{ label: "Estándar (GCEA)", tex: "A4 E4 C4 G4" }],
  // The Paraguayan requinto: a guitar tuned a fourth higher.
  requinto: [{ label: "Requinto (La)", tex: "A4 E4 C4 G3 D3 A2" }],
};

export const estilosBateria = [
  "Rock",
  "Pop",
  "Funk",
  "Shuffle / blues",
  "Jazz",
  "Bossa nova",
  "Cumbia",
  "Polca paraguaya",
  "Guarania",
  "Galopa",
  "Worship",
];

export const estilosPara = (instrumento: InstrumentId) =>
  instrumento === "bateria" ? estilosBateria : estilos;

export const superficies = [
  { value: "pad", label: "Pad de práctica" },
  { value: "bateria", label: "Batería" },
  { value: "ambas", label: "Pad y batería" },
] as const;

export function afinacionesPara(instrumento: InstrumentId) {
  return instrumento === "bajo" || instrumento === "ukelele" || instrumento === "requinto"
    ? afinaciones[instrumento]
    : afinaciones.guitarra;
}

export function fichaInicial(instrumento: InstrumentId): Ficha {
  if (instrumento === "bateria")
    return {
      nivel: "principiante",
      estilo: "Rock",
      afinacion: "",
      capo: 0,
      duracion: 60,
      superficie: "ambas",
      kit: 5,
    };
  return {
    nivel: "principiante",
    estilo: "Popular",
    afinacion: afinacionesPara(instrumento)[0]?.label ?? "",
    capo: 0,
    duracion: 60,
  };
}

export const golpesPorCompas: Record<Compas, number> = { "4/4": 8, "3/4": 6, "6/8": 6 };

const nuevoId = () => Math.random().toString(36).slice(2, 10);

// Starting content for each block type, ready to edit.
export function nuevoBloque<T extends TipoBloque>(
  tipo: T,
  instrumento: InstrumentId,
  etapaInicial: Etapa = "libre",
): Extract<Bloque, { tipo: T }> {
  return crearBloque(tipo, instrumento, etapaInicial) as Extract<Bloque, { tipo: T }>;
}

function crearBloque(tipo: TipoBloque, instrumento: InstrumentId, etapaInicial: Etapa): Bloque {
  const base = { id: nuevoId(), etapa: etapaInicial, titulo: "", minutos: 10, notas: "" };
  switch (tipo) {
    case "tablatura":
      return { ...base, tipo, titulo: "Ejercicio", tex: texInicial(instrumento) };
    case "acordes":
      return {
        ...base,
        tipo,
        titulo: "Acordes",
        acordes: instrumento === "ukelele" ? ["C", "G", "Am", "F"] : ["G", "C", "D", "Em"],
      };
    case "rasgueo":
      return {
        ...base,
        tipo,
        titulo: "Rasgueo",
        compas: "4/4",
        golpes: ["D", "-", "D", "U", "-", "U", "D", "U"],
        bpm: 80,
      };
    case "tempo":
      return { ...base, tipo, titulo: "Subir el tempo", inicio: 60, objetivo: 90, paso: 5 };
    case "youtube":
      return { ...base, tipo, titulo: "Video de referencia", url: "" };
    case "archivos":
      return { ...base, tipo, titulo: "Material", archivos: [] };
    case "texto":
      return { ...base, tipo, titulo: "Indicaciones" };
    case "partitura":
      return { ...base, tipo, titulo: "Lectura", tex: texPartitura(instrumento) };
    case "escala":
      return {
        ...base,
        tipo,
        titulo: "Escala de Do mayor",
        tonica: 0,
        escala: "mayor",
        octavas: 1,
        bpm: 70,
        porPulso: 1,
      };
    case "respiracion":
      return {
        ...base,
        tipo,
        titulo: "Respiración",
        minutos: 5,
        inhalar: 4,
        sostener: 2,
        exhalar: 6,
        repeticiones: 6,
        nota: null,
      };
    case "groove":
      return { ...base, tipo, titulo: "Groove", ...ESTILOS[0]!.groove };
    case "rudimento":
      return {
        ...base,
        tipo,
        titulo: "Rudimento",
        rudimento: "simples",
        inicio: 60,
        objetivo: 90,
        paso: 5,
        empiezaCon: "R",
      };
  }
}

const estilo = (id: string) => (ESTILOS.find((e) => e.id === id) ?? ESTILOS[0]!).groove;

// A typical 60-minute drum lesson: hands, coordination, groove, fill, music and homework.
function plantillaBateria(): Bloque[] {
  const ostinato: Groove = {
    compas: "4/4",
    subdivision: 2,
    compases: 1,
    bpm: 70,
    pistas: { hihatPie: "..x...x.", caja: "x.x..xx.", bombo: "x...x..." } satisfies Partial<
      Record<Voz, string>
    >,
  };
  const fill: Groove = {
    ...estilo("rock"),
    compases: 4,
    pistas: {
      crash: "x...............................",
      hihat: "xxxxxxxxxxxxxxxxxxxxxxxx........",
      caja: "..>...>...>...>...>...>.xx......",
      tom1: "..........................xx....",
      tom2: "............................xx..",
      tomPiso: "..............................xx",
      bombo: "x...xx..x...xx..x...xx..........",
    },
  };
  return [
    {
      ...nuevoBloque("rudimento", "bateria", "calentamiento"),
      titulo: "Golpes simples en el pad",
      minutos: 10,
      rudimento: "simples",
      inicio: 60,
      objetivo: 90,
    },
    {
      ...nuevoBloque("rudimento", "bateria", "tecnica"),
      titulo: "Rudimento del día",
      minutos: 10,
      rudimento: "paradiddle",
      inicio: 60,
      objetivo: 85,
    },
    {
      ...nuevoBloque("groove", "bateria", "tecnica"),
      ...ostinato,
      titulo: "Coordinación: ostinato de pies y caja",
      minutos: 10,
    },
    {
      ...nuevoBloque("groove", "bateria", "repertorio"),
      ...estilo("rock"),
      titulo: "Groove del estilo",
      minutos: 15,
    },
    {
      ...nuevoBloque("groove", "bateria", "repertorio"),
      ...fill,
      titulo: "3 compases de groove + 1 de fill",
      minutos: 5,
    },
    {
      ...nuevoBloque("youtube", "bateria", "repertorio"),
      titulo: "Toca encima de la canción",
      minutos: 5,
    },
    {
      ...nuevoBloque("texto", "bateria", "tarea"),
      titulo: "Para practicar en casa",
      minutos: 5,
      notas:
        "20 minutos por día: 5 de rudimentos en el pad, 10 del groove con metrónomo y 5 sin click. Graba el groove al tempo objetivo y súbelo como entrega.",
    },
  ];
}

// alphaTex: one bar of chromatic "spider" exercise for the instrument, with its sound (General
// MIDI program) and, for the bass, the bass clef.
const SONIDO: Partial<Record<InstrumentId, { nombre: string; programa: number }>> = {
  guitarra: { nombre: "Guitarra", programa: 25 },
  bajo: { nombre: "Bajo", programa: 33 },
  ukelele: { nombre: "Ukelele", programa: 24 },
  requinto: { nombre: "Requinto", programa: 25 },
};

// Staff notation (no tab) for the instrument: its General MIDI sound, its clef and a starting
// phrase in its register.
const PARTITURA: Partial<
  Record<InstrumentId, { nombre: string; programa: number; clave?: string; frase: string }>
> = {
  piano: { nombre: "Piano", programa: 0, frase: ":4 C4 D4 E4 F4 | G4 F4 E4 D4 | :2 C4 r" },
  teclado: { nombre: "Teclado", programa: 4, frase: ":4 C4 E4 G4 E4 | :2 C4 G4 | :1 C4" },
  acordeon: { nombre: "Acordeón", programa: 21, frase: ":4 C4 D4 E4 G4 | :2 E4 C4 | :1 C4" },
  arpa: { nombre: "Arpa", programa: 46, frase: ":8 G3 B3 D4 G4 D4 B3 G3 B3 | :2 G3 D4" },
  violin: { nombre: "Violín", programa: 40, frase: ":4 G4 A4 B4 C5 | D5 C5 B4 A4 | :1 G4" },
  violonchelo: {
    nombre: "Violonchelo",
    programa: 42,
    clave: "F4",
    frase: ":4 C3 D3 E3 F3 | G3 F3 E3 D3 | :1 C3",
  },
  contrabajo: {
    nombre: "Contrabajo",
    programa: 43,
    clave: "F4",
    frase: ":4 E2 F#2 G2 A2 | B2 A2 G2 F#2 | :1 E2",
  },
  flauta: { nombre: "Flauta", programa: 73, frase: ":4 D5 E5 F#5 G5 | A5 G5 F#5 E5 | :1 D5" },
  saxofon: { nombre: "Saxofón", programa: 65, frase: ":4 D4 E4 F#4 G4 | A4 G4 F#4 E4 | :1 D4" },
  trompeta: { nombre: "Trompeta", programa: 56, frase: ":4 C4 D4 E4 F4 | G4 F4 E4 D4 | :1 C4" },
  voz: { nombre: "Voz", programa: 53, frase: ":4 C4 D4 E4 F4 | G4 F4 E4 D4 | :1 C4" },
};

export function texPartitura(instrumento: InstrumentId) {
  const p = PARTITURA[instrumento] ?? PARTITURA.piano!;
  return [
    "\\tempo 80",
    ".",
    `\\track "${p.nombre}"`,
    `\\instrument ${p.programa}`,
    "\\tuning piano",
    ...(p.clave ? [`\\clef ${p.clave}`] : []),
    p.frase,
  ].join("\n");
}

export function texInicial(instrumento: InstrumentId) {
  const tuning = afinacionesPara(instrumento)[0]?.tex ?? afinaciones.guitarra[0]!.tex;
  const cuerdas = tuning.split(" ").length;
  const notas = Array.from({ length: Math.min(cuerdas, 4) }, (_, i) => cuerdas - i)
    .map((cuerda) => `1.${cuerda} 2.${cuerda} 3.${cuerda} 4.${cuerda}`)
    .join(" ");
  const sonido = SONIDO[instrumento] ?? SONIDO.guitarra!;
  return [
    "\\tempo 80",
    ".",
    `\\track "${sonido.nombre}"`,
    `\\instrument ${sonido.programa}`,
    `\\tuning ${tuning}`,
    ...(instrumento === "bajo" ? ["\\clef F4"] : []),
    `:16 ${notas}`,
  ].join("\n");
}

// A typical 60-minute class to start from, in the right order.
// 60-minute templates by family: keyboards, bowed strings, winds, voice and harp.
function plantillaPorFamilia(instrumento: InstrumentId): Bloque[] | null {
  const tarea = (notas: string): Bloque => ({
    ...nuevoBloque("texto", instrumento, "tarea"),
    titulo: "Para practicar en casa",
    minutos: 5,
    notas,
  });
  const escala = (titulo: string, minutos: number, cambios: Partial<Bloque> = {}) =>
    ({
      ...nuevoBloque("escala", instrumento, "tecnica"),
      titulo,
      minutos,
      ...cambios,
    }) as Bloque;
  const partitura = (titulo: string, minutos: number, etapa: Etapa): Bloque => ({
    ...nuevoBloque("partitura", instrumento, etapa),
    titulo,
    minutos,
  });
  const respiracion = (titulo: string, minutos: number, cambios: Partial<Bloque> = {}) =>
    ({
      ...nuevoBloque("respiracion", instrumento, "calentamiento"),
      titulo,
      minutos,
      ...cambios,
    }) as Bloque;

  if (TECLADOS.includes(instrumento))
    return [
      escala("Escala de Do mayor, manos separadas", 10, {
        etapa: "calentamiento",
      } as Partial<Bloque>),
      escala("Arpegio de Do mayor", 10, { escala: "arpegioMayor", octavas: 2 } as Partial<Bloque>),
      partitura("Lectura a primera vista", 10, "tecnica"),
      partitura("Obra de la semana", 20, "repertorio"),
      tarea(
        "15 minutos por día: la escala y el arpegio lentos, después la obra por frases, primero manos separadas.",
      ),
    ];
  if (ARCO.includes(instrumento))
    return [
      {
        ...nuevoBloque("tempo", instrumento, "calentamiento"),
        titulo: "Cuerdas al aire con arco largo",
        minutos: 10,
        inicio: 50,
        objetivo: 70,
      },
      escala("Escala de una octava", 10, {
        tonica: instrumento === "contrabajo" ? 7 : 0,
      } as Partial<Bloque>),
      partitura("Estudio de técnica", 15, "tecnica"),
      partitura("Obra de la semana", 20, "repertorio"),
      tarea(
        "20 minutos por día: afina, cuerdas al aire mirando el arco, la escala y la obra. Grábate y súbelo.",
      ),
    ];
  if (VIENTO.includes(instrumento))
    return [
      respiracion("Respiración", 5),
      respiracion("Notas largas", 10, {
        nota: 60,
        inhalar: 3,
        sostener: 0,
        exhalar: 8,
      } as Partial<Bloque>),
      escala("Escala mayor", 10),
      partitura("Estudio", 10, "tecnica"),
      partitura("Obra de la semana", 20, "repertorio"),
      tarea(
        "15 a 20 minutos por día: respiración y notas largas con afinador, la escala y la obra.",
      ),
    ];
  if (instrumento === "voz")
    return [
      respiracion("Respiración costo-diafragmática", 5),
      respiracion("Vocalización con nota", 10, {
        nota: 57,
        inhalar: 3,
        sostener: 0,
        exhalar: 6,
      } as Partial<Bloque>),
      escala("Escala para vocalizar", 10, { escala: "mayor", bpm: 60 } as Partial<Bloque>),
      partitura("Melodía de la canción", 15, "repertorio"),
      {
        ...nuevoBloque("youtube", instrumento, "repertorio"),
        titulo: "Canta sobre la versión de referencia",
        minutos: 15,
      },
      tarea(
        "Todos los días: respiración, 5 minutos de vocalización y la canción con afinador. Graba la canción y súbela.",
      ),
    ];
  if (instrumento === "arpa")
    return [
      escala("Arpegios en Sol mayor", 10, {
        etapa: "calentamiento",
        tonica: 7,
        escala: "arpegioMayor",
        octavas: 2,
      } as Partial<Bloque>),
      escala("Escala de Sol mayor", 10, { tonica: 7, octavas: 2 } as Partial<Bloque>),
      partitura("Bajo y acompañamiento de polca", 15, "tecnica"),
      partitura("Obra de la semana (polca, guarania o galopa)", 20, "repertorio"),
      tarea(
        "20 minutos por día: arpegios con las dos manos, el bajo de la polca con metrónomo y la obra por frases.",
      ),
    ];
  return null;
}

export function plantilla(instrumento: InstrumentId): Bloque[] {
  if (instrumento === "bateria") return plantillaBateria();
  const porFamilia = plantillaPorFamilia(instrumento);
  if (porFamilia) return porFamilia;
  const bloques: Bloque[] = [
    {
      ...nuevoBloque("tempo", instrumento, "calentamiento"),
      titulo: "Cromático 1-2-3-4",
      minutos: 10,
      inicio: 60,
      objetivo: 80,
    },
  ];
  if (conCuerdas(instrumento))
    bloques.push({
      ...nuevoBloque("tablatura", instrumento, "tecnica"),
      titulo: "Ejercicio de técnica",
      minutos: 15,
    });
  if (conAcordes(instrumento)) {
    bloques.push({
      ...nuevoBloque("acordes", instrumento, "repertorio"),
      titulo: "Acordes de la canción",
      minutos: 10,
    });
    bloques.push({
      ...nuevoBloque("rasgueo", instrumento, "repertorio"),
      titulo: "Rasgueo de la canción",
      minutos: 15,
    });
  } else {
    bloques.push({
      ...nuevoBloque("archivos", instrumento, "repertorio"),
      titulo: "Partitura de la obra",
      minutos: 25,
    });
  }
  bloques.push({
    ...nuevoBloque("texto", instrumento, "tarea"),
    titulo: "Para practicar en casa",
    minutos: 5,
    notas:
      "Practica 20 minutos por día. Graba el ejercicio al tempo objetivo y súbelo como entrega.",
  });
  return bloques;
}

export const minutosTotales = (bloques: Bloque[]) =>
  bloques.reduce((total, b) => total + (b.minutos || 0), 0);

// Every Storage file the plan points at (for cascade deletes).
export const archivosDelPlan = (bloques: Bloque[] | undefined) =>
  (bloques ?? []).flatMap((b) => (b.tipo === "archivos" ? b.archivos : []));

// YouTube video id and start second from any usual URL form.
export function youtube(url: string) {
  const match =
    url.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
    ) ?? null;
  if (!match) return null;
  const t = url.match(/[?&](?:t|start)=(\d+)(?:s)?/);
  return { id: match[1], inicio: t ? Number(t[1]) : 0 };
}
