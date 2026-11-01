import type { InstrumentId } from "@/lib/instruments";
import { familia, type Familia } from "@/lib/plan";

// Learning path: four levels with concrete objectives per instrument family. The profesor
// marks what the alumno reached (`logros` in Firestore stores the level and the ids). Ids are
// stored: only add objectives, never rename or remove them.

export type Nivel = "inicial" | "basico" | "intermedio" | "avanzado";

export const NIVELES: { value: Nivel; label: string }[] = [
  { value: "inicial", label: "Inicial" },
  { value: "basico", label: "Básico" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

export type Objetivo = { id: string; texto: string };

type Ruta = Record<Nivel, Objetivo[]>;

const RUTAS: Record<Familia, Ruta> = {
  cuerdas: {
    inicial: [
      { id: "c-postura", texto: "Postura y forma de sostener el instrumento" },
      { id: "c-afinar", texto: "Afina solo con el afinador" },
      { id: "c-acordes-abiertos", texto: "Cinco acordes abiertos limpios" },
      { id: "c-cambio-60", texto: "Cambia de acorde a tiempo a 60 BPM" },
      { id: "c-rasgueo-basico", texto: "Rasgueo abajo-arriba en 4/4" },
    ],
    basico: [
      { id: "c-tab", texto: "Lee tablatura sencilla" },
      { id: "c-polca", texto: "Acompaña una polca en 6/8" },
      { id: "c-guarania", texto: "Acompaña una guarania" },
      { id: "c-pentatonica", texto: "Escala pentatónica en una posición" },
      { id: "c-cancion-completa", texto: "Una canción completa de principio a fin" },
    ],
    intermedio: [
      { id: "c-cejilla", texto: "Acordes con cejilla" },
      { id: "c-arpegios", texto: "Arpegios con los dedos (pulgar alternado)" },
      { id: "c-mayor-posiciones", texto: "Escala mayor en tres posiciones" },
      { id: "c-galopa", texto: "Galopa con su rasgueo característico" },
      { id: "c-tocar-otros", texto: "Toca con otros músicos sin perderse" },
    ],
    avanzado: [
      { id: "c-solo", texto: "Un solo o punteo propio" },
      { id: "c-armonia", texto: "Arma los acordes de una canción de oído" },
      { id: "c-tempo-alto", texto: "Repertorio al tempo original" },
      { id: "c-recital", texto: "Toca en un recital" },
    ],
  },
  teclados: {
    inicial: [
      { id: "t-postura", texto: "Postura, altura del banco y mano redonda" },
      { id: "t-cinco-dedos", texto: "Cinco dedos en Do con cada mano" },
      { id: "t-lectura-do", texto: "Lee las notas cerca del Do central" },
      { id: "t-pulso", texto: "Toca a tiempo con el metrónomo a 60 BPM" },
    ],
    basico: [
      { id: "t-escalas-1", texto: "Escalas de Do, Sol y Fa con manos separadas" },
      { id: "t-manos-juntas", texto: "Pieza sencilla con manos juntas" },
      { id: "t-acordes", texto: "Acordes mayores y menores en estado fundamental" },
      { id: "t-polca-bajo", texto: "Bajo de polca con la mano izquierda" },
    ],
    intermedio: [
      { id: "t-escalas-2", texto: "Escalas de dos octavas con manos juntas" },
      { id: "t-inversiones", texto: "Inversiones de acordes" },
      { id: "t-pedal", texto: "Pedal sin ensuciar el sonido" },
      { id: "t-lectura-2", texto: "Lee a primera vista una pieza fácil" },
    ],
    avanzado: [
      { id: "t-obra", texto: "Una obra completa de memoria" },
      { id: "t-acompanar", texto: "Acompaña a un cantante con cifrado" },
      { id: "t-recital", texto: "Toca en un recital" },
    ],
  },
  arco: {
    inicial: [
      { id: "a-postura", texto: "Postura del instrumento y del arco" },
      { id: "a-cuerdas-al-aire", texto: "Cuerdas al aire con arco recto" },
      { id: "a-primera-posicion", texto: "Primeros dedos en primera posición" },
      { id: "a-pulso", texto: "Negras y corcheas a tiempo" },
    ],
    basico: [
      { id: "a-escalas-1", texto: "Escalas de una octava afinadas" },
      { id: "a-legato", texto: "Legato de dos y cuatro notas" },
      { id: "a-lectura", texto: "Lee en su clave sin escribir los nombres" },
      { id: "a-pieza", texto: "Una pieza corta completa" },
    ],
    intermedio: [
      { id: "a-cambio-posicion", texto: "Cambios de posición limpios" },
      { id: "a-golpes-arco", texto: "Detaché, staccato y martelé" },
      { id: "a-escalas-2", texto: "Escalas de dos octavas" },
      { id: "a-conjunto", texto: "Toca en conjunto u orquesta" },
    ],
    avanzado: [
      { id: "a-vibrato", texto: "Vibrato controlado" },
      { id: "a-obra", texto: "Una obra con acompañamiento" },
      { id: "a-recital", texto: "Toca en un recital" },
    ],
  },
  viento: {
    inicial: [
      { id: "v-respiracion", texto: "Respiración diafragmática y apoyo" },
      { id: "v-embocadura", texto: "Embocadura y primer sonido estable" },
      { id: "v-notas-1", texto: "Las primeras cinco notas" },
      { id: "v-notas-largas", texto: "Notas largas de 8 tiempos" },
    ],
    basico: [
      { id: "v-escalas-1", texto: "Escalas de una octava" },
      { id: "v-articulacion", texto: "Picado y ligado" },
      { id: "v-lectura", texto: "Lee una melodía sencilla" },
      { id: "v-pieza", texto: "Una pieza corta completa" },
    ],
    intermedio: [
      { id: "v-registro", texto: "Registro agudo con buen sonido" },
      { id: "v-escalas-2", texto: "Escalas mayores y menores de dos octavas" },
      { id: "v-dinamicas", texto: "Dinámicas de piano a forte afinado" },
      { id: "v-conjunto", texto: "Toca en una banda o conjunto" },
    ],
    avanzado: [
      { id: "v-improvisa", texto: "Improvisa sobre una base" },
      { id: "v-obra", texto: "Una obra con acompañamiento" },
      { id: "v-recital", texto: "Toca en un recital" },
    ],
  },
  voz: {
    inicial: [
      { id: "z-respiracion", texto: "Respiración y apoyo" },
      { id: "z-postura", texto: "Postura y cuerpo relajado" },
      { id: "z-afinar", texto: "Repite una nota afinada" },
      { id: "z-vocalizos", texto: "Vocalizos de cinco notas" },
    ],
    basico: [
      { id: "z-extension", texto: "Conoce su extensión y su tesitura" },
      { id: "z-cancion", texto: "Una canción completa afinada" },
      { id: "z-diccion", texto: "Dicción clara en español y guaraní" },
      { id: "z-intervalos", texto: "Canta intervalos de tercera y quinta" },
    ],
    intermedio: [
      { id: "z-registros", texto: "Pasa de pecho a cabeza sin quiebre" },
      { id: "z-segunda-voz", texto: "Canta una segunda voz" },
      { id: "z-interpretacion", texto: "Interpreta con dinámicas y carácter" },
      { id: "z-microfono", texto: "Uso del micrófono" },
    ],
    avanzado: [
      { id: "z-repertorio", texto: "Repertorio variado de memoria" },
      { id: "z-improvisa", texto: "Improvisa o adorna la melodía" },
      { id: "z-recital", texto: "Canta en un recital" },
    ],
  },
  percusion: {
    inicial: [
      { id: "p-agarre", texto: "Agarre y postura frente al instrumento" },
      { id: "p-simples", texto: "Golpes simples parejos a 80 BPM" },
      { id: "p-rock-basico", texto: "Ritmo básico en corcheas" },
      { id: "p-contar", texto: "Cuenta en voz alta mientras toca" },
    ],
    basico: [
      { id: "p-dobles", texto: "Golpes dobles y paradiddle" },
      { id: "p-lectura", texto: "Lee negras, corcheas y semicorcheas" },
      { id: "p-polca", texto: "Ritmo de polca paraguaya" },
      { id: "p-fill", texto: "Un fill de un compás y vuelve al ritmo" },
    ],
    intermedio: [
      { id: "p-fantasma", texto: "Notas fantasma y acentos" },
      { id: "p-estilos", texto: "Cuatro estilos distintos" },
      { id: "p-independencia", texto: "Independencia de pies y manos" },
      { id: "p-banda", texto: "Toca con una banda" },
    ],
    avanzado: [
      { id: "p-solo", texto: "Un solo propio" },
      { id: "p-tempo-alto", texto: "Repertorio al tempo original" },
      { id: "p-recital", texto: "Toca en un recital" },
    ],
  },
};

export const rutaPara = (instrumento: InstrumentId) => RUTAS[familia(instrumento)];

export const nivelLabel = (nivel: string) => NIVELES.find((n) => n.value === nivel)?.label ?? nivel;

// Percentage of the current level reached (only that level's objectives count).
export function avanceDeNivel(instrumento: InstrumentId, nivel: string, cumplidos: string[]) {
  const objetivos = rutaPara(instrumento)[nivel as Nivel] ?? [];
  if (!objetivos.length) return 0;
  return Math.round(
    (objetivos.filter((o) => cumplidos.includes(o.id)).length / objetivos.length) * 100,
  );
}

// The alumno's own description of each level (first-time welcome): a hint for the profesor.
const COMO_TOCO: Record<Familia, Record<Nivel, string>> = {
  cuerdas: {
    inicial: "Recién empiezo o sé pocos acordes",
    basico: "Toco acordes abiertos y algunas canciones",
    intermedio: "Uso cejilla, arpegios y leo tablatura",
    avanzado: "Toco solos y repertorio completo",
  },
  teclados: {
    inicial: "Recién empiezo",
    basico: "Toco piezas sencillas con las dos manos",
    intermedio: "Leo partituras y toco con pedal",
    avanzado: "Toco obras completas de memoria",
  },
  arco: {
    inicial: "Recién empiezo",
    basico: "Toco en primera posición y piezas cortas",
    intermedio: "Hago cambios de posición y leo bien",
    avanzado: "Toco con vibrato y obras completas",
  },
  viento: {
    inicial: "Recién empiezo",
    basico: "Saco sonido estable y toco melodías sencillas",
    intermedio: "Toco escalas y uso el registro agudo",
    avanzado: "Toco obras completas e improviso",
  },
  voz: {
    inicial: "Recién empiezo",
    basico: "Canto canciones afinado",
    intermedio: "Controlo registros y dinámicas",
    avanzado: "Canto repertorio variado con soltura",
  },
  percusion: {
    inicial: "Recién empiezo",
    basico: "Toco ritmos básicos con el metrónomo",
    intermedio: "Toco varios estilos y fills",
    avanzado: "Toco con banda y solos propios",
  },
};

export const comoToco = (instrumento: InstrumentId) => COMO_TOCO[familia(instrumento)];
