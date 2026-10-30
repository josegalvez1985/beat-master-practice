import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Dumbbell,
  Flame,
  Guitar,
  Hand,
  ListChecks,
  Music2,
  Paperclip,
  PlaySquare,
  Timer,
  Type,
} from "lucide-react";
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
  );

export type TipoBloque = Bloque["tipo"];

export type Ficha = {
  nivel: "principiante" | "intermedio" | "avanzado";
  estilo: string;
  afinacion: string;
  capo: number;
  duracion: number;
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

export const etapa = (value: Etapa) =>
  etapas.find((e) => e.value === value) ?? etapas[etapas.length - 1]!;

export const tiposDeBloque: {
  value: TipoBloque;
  label: string;
  descripcion: string;
  icon: LucideIcon;
  // Only for string instruments with frets (guitarra, bajo, ukelele) / with chords.
  soloCuerdas?: boolean;
  soloAcordes?: boolean;
}[] = [
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
  instrumento === "guitarra" || instrumento === "bajo" || instrumento === "ukelele";
export const conAcordes = (instrumento: InstrumentId) =>
  instrumento === "guitarra" || instrumento === "ukelele";

export const tiposPara = (instrumento: InstrumentId) =>
  tiposDeBloque.filter(
    (t) =>
      (!t.soloCuerdas || conCuerdas(instrumento)) && (!t.soloAcordes || conAcordes(instrumento)),
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
  "guitarra" | "bajo" | "ukelele",
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
};

export function afinacionesPara(instrumento: InstrumentId) {
  return instrumento === "bajo" || instrumento === "ukelele"
    ? afinaciones[instrumento]
    : afinaciones.guitarra;
}

export function fichaInicial(instrumento: InstrumentId): Ficha {
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
  }
}

// alphaTex: one bar of chromatic "spider" exercise for the instrument, with its sound (General
// MIDI program) and, for the bass, the bass clef.
const SONIDO: Partial<Record<InstrumentId, { nombre: string; programa: number }>> = {
  guitarra: { nombre: "Guitarra", programa: 25 },
  bajo: { nombre: "Bajo", programa: 33 },
  ukelele: { nombre: "Ukelele", programa: 24 },
};

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
export function plantilla(instrumento: InstrumentId): Bloque[] {
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
