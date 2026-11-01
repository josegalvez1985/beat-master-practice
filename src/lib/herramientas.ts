import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Crosshair,
  Drum,
  Ear,
  Hand,
  Mic,
  Music4,
  NotebookPen,
  Repeat,
  Timer,
  Waves,
} from "lucide-react";
import { afinable } from "@/lib/afinador";
import type { Inscripcion } from "@/lib/data";
import { instruments, type InstrumentId } from "@/lib/instruments";

// Practice tools and the instruments each one makes sense for: a student only sees the tools
// of the instruments they study (profile + the profesor lists they are in).

export type HerramientaId =
  | "afinador"
  | "metronomo"
  | "tiempo"
  | "grooves"
  | "rudimentos"
  | "ritmo"
  | "oidoRitmico"
  | "grabadora"
  | "acordes"
  | "oido"
  | "lectura"
  | "diario";

// Instruments that play chords (chord dictionary, chord ear training).
const ARMONICOS: InstrumentId[] = [
  "guitarra",
  "ukelele",
  "piano",
  "acordeon",
  "arpa",
  "teclado",
  "requinto",
];
// Timing, rhythm reading and rhythmic ear training also serve hand percussion.
const esPercusion = (instrumento: InstrumentId) =>
  instrumento === "bateria" || instrumento === "percusion";

export const tocaAcordes = (instrumento: InstrumentId) => ARMONICOS.includes(instrumento);

// Clefs each instrument reads (the drum kit uses its own percussion notation).
const CLAVES: Partial<Record<InstrumentId, Clave[]>> = {
  guitarra: ["sol"],
  ukelele: ["sol"],
  violin: ["sol"],
  flauta: ["sol"],
  saxofon: ["sol"],
  bajo: ["fa"],
  voz: ["sol", "fa"],
  piano: ["sol", "fa"],
  acordeon: ["sol", "fa"],
  arpa: ["sol", "fa"],
  requinto: ["sol"],
  teclado: ["sol", "fa"],
  trompeta: ["sol"],
  violonchelo: ["fa"],
  contrabajo: ["fa"],
};
export type Clave = "sol" | "fa";
export const clavesPara = (instrumento: InstrumentId) => CLAVES[instrumento] ?? [];

export const herramientas: {
  id: HerramientaId;
  label: string;
  descripcion: string;
  icon: LucideIcon;
  para: (instrumento: InstrumentId) => boolean;
}[] = [
  {
    id: "afinador",
    label: "Afinador",
    descripcion: "Afina con el micrófono",
    icon: Waves,
    para: afinable,
  },
  {
    id: "metronomo",
    label: "Metrónomo",
    descripcion: "Compás, subdivisiones y tempo que sube solo",
    icon: Timer,
    para: () => true,
  },
  {
    id: "tiempo",
    label: "Medidor de tiempo",
    descripcion: "¿Te apuras o vas atrás del click?",
    icon: Crosshair,
    para: esPercusion,
  },
  {
    id: "grooves",
    label: "Grooves",
    descripcion: "Patrones por estilo para tocar encima",
    icon: Drum,
    para: esPercusion,
  },
  {
    id: "rudimentos",
    label: "Rudimentos",
    descripcion: "Escalera de tempo y tus récords",
    icon: Repeat,
    para: esPercusion,
  },
  {
    id: "ritmo",
    label: "Lectura rítmica",
    descripcion: "Lee un compás y tócalo en el pad",
    icon: Music4,
    para: esPercusion,
  },
  {
    id: "oidoRitmico",
    label: "Oído rítmico",
    descripcion: "Escucha un ritmo y encuéntralo escrito",
    icon: Ear,
    para: esPercusion,
  },
  {
    id: "grabadora",
    label: "Grabadora",
    descripcion: "Grábate y escúchate",
    icon: Mic,
    para: () => true,
  },
  {
    id: "acordes",
    label: "Acordes",
    descripcion: "Busca un acorde, míralo y escúchalo",
    icon: Hand,
    para: tocaAcordes,
  },
  {
    id: "oido",
    label: "Oído",
    descripcion: "Reconoce intervalos y acordes",
    icon: Ear,
    para: (instrumento) => !esPercusion(instrumento),
  },
  {
    id: "lectura",
    label: "Lectura",
    descripcion: "Lee notas en el pentagrama",
    icon: BookOpenText,
    para: (instrumento) => clavesPara(instrumento).length > 0,
  },
  {
    id: "diario",
    label: "Diario",
    descripcion: "Anota tu práctica y tu meta semanal",
    icon: NotebookPen,
    para: () => true,
  },
];

export const herramientasPara = (instrumento: InstrumentId) =>
  herramientas.filter((h) => h.para(instrumento));

// The instruments someone studies or teaches: their profile plus the lists they are in, in the
// usual order.
export function instrumentosDe(propios: InstrumentId[], inscripciones: Inscripcion[] = []) {
  return instruments
    .map((i) => i.id)
    .filter((id) => propios.includes(id) || inscripciones.some((i) => i.instrumento === id));
}
