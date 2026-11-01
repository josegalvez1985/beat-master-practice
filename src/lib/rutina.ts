import type { Clase, Entrega, Meta, Obra } from "@/lib/data";
import type { HerramientaId } from "@/lib/herramientas";
import { herramientasPara } from "@/lib/herramientas";
import type { InstrumentId } from "@/lib/instruments";
import { esPercusion } from "@/lib/plan";
import { proximaClase } from "@/lib/practica";
import { habilidades } from "@/lib/rubrica";

// "Tu práctica de hoy": a routine for the minutes the alumno has, built from what is already
// saved: warm-up, the pending class, the weakest skill of their rubric and a piece to review.
// Nothing new is stored.

export type Paso = {
  id: string;
  titulo: string;
  detalle: string;
  minutos: number;
  // Where it is done: a class (practice mode) or a tool.
  href?: string;
  // A piece to mark as reviewed.
  obra?: Obra;
};

// The tool that trains each rubric criterion (the first one the instrument has).
const PARA_CRITERIO: Record<string, HerramientaId[]> = {
  tiempo: ["tiempo", "metronomo"],
  afinacion: ["afinador", "oido"],
  lectura: ["lectura"],
  tecnica: ["rudimentos", "metronomo"],
  independencia: ["metronomo"],
  coordinacion: ["grooves", "metronomo"],
  groove: ["grooves"],
  dinamica: ["rudimentos", "metronomo"],
  arco: ["afinador", "metronomo"],
  sonido: ["grabadora"],
  respiracion: ["afinador"],
  diccion: ["grabadora"],
  expresion: ["grabadora"],
};

const herramienta = (instrumento: InstrumentId, ids: HerramientaId[]) => {
  const disponibles = herramientasPara(instrumento).map((h) => h.id);
  return ids.find((id) => disponibles.includes(id)) ?? "metronomo";
};

const enlace = (instrumento: InstrumentId, h: HerramientaId) =>
  `/herramientas?instrumento=${instrumento}&h=${h}`;

export function rutinaDeHoy({
  minutos,
  instrumentos,
  clases,
  entregas,
  obras,
}: {
  minutos: number;
  instrumentos: InstrumentId[];
  clases: Clase[];
  entregas: Entrega[];
  obras: Obra[];
}): Paso[] {
  const clase = proximaClase(clases, entregas);
  const instrumento = clase?.instrumento ?? instrumentos[0];
  if (!instrumento) return [];

  // The lowest average of the rubric in that instrument, if there are evaluations.
  const debil = habilidades(instrumento, entregas)
    .filter((h) => h.promedio !== null)
    .sort((a, b) => a.promedio! - b.promedio!)[0];

  // The piece reviewed longest ago among the ones already learned.
  const repaso = obras
    .filter((o) => o.instrumento === instrumento && o.estado !== "aprendiendo")
    .sort((a, b) => (a.repasadoEn ?? "").localeCompare(b.repasadoEn ?? ""))[0];

  // Shares of the time; what is missing gives its share to the class or the warm-up.
  const partes = {
    calentamiento: 0.15,
    clase: clase ? 0.5 : 0,
    debil: debil ? 0.2 : 0,
    repaso: repaso ? 0.15 : 0,
  };
  const libre = 1 - Object.values(partes).reduce((a, b) => a + b, 0);
  if (clase) partes.clase += libre;
  else if (debil) partes.debil += libre;
  else partes.calentamiento += libre;
  const de = (parte: number) => Math.max(2, Math.round((minutos * parte) / 2) * 2);

  const pasos: Paso[] = [
    {
      id: "calentamiento",
      titulo: "Calentamiento",
      detalle: esPercusion(instrumento)
        ? "Golpes simples y dobles con el metrónomo, lento y parejo."
        : "Escala o ejercicio lento con el metrónomo: sonido limpio antes que velocidad.",
      minutos: de(partes.calentamiento),
      href: enlace(instrumento, "metronomo"),
    },
  ];
  if (clase)
    pasos.push({
      id: "clase",
      titulo: clase.titulo,
      detalle: clase.bloques?.length
        ? "Tu clase pendiente, bloque por bloque."
        : "Lo que pidió tu profesor en la clase pendiente.",
      minutos: de(partes.clase),
      href: `/clases/${clase.id}${clase.bloques?.length ? "?practicar=1" : ""}`,
    });
  if (debil)
    pasos.push({
      id: "debil",
      titulo: `Refuerza: ${debil.criterio.label.toLowerCase()}`,
      detalle: `Es tu punto más flojo según tu profesor (${debil.promedio!.toFixed(1)} de 5). ${debil.criterio.ayuda}.`,
      minutos: de(partes.debil),
      href: enlace(instrumento, herramienta(instrumento, PARA_CRITERIO[debil.criterio.id] ?? [])),
    });
  if (repaso)
    pasos.push({
      id: "repaso",
      titulo: `Repasa: ${repaso.obra}`,
      detalle: repaso.repasadoEn
        ? "Es la obra que hace más tiempo no tocas: tócala entera, sin parar."
        : "Tócala entera, sin parar, para no olvidarla.",
      minutos: de(partes.repaso),
      obra: repaso,
    });
  return pasos;
}

// This week's goals still open (for the routine's reminder).
export const metasPendientes = (metas: Meta[], semana: string) =>
  metas.filter((m) => m.semana === semana && !m.cumplida);
