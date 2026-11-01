import type { Entrega } from "@/lib/data";
import type { InstrumentId } from "@/lib/instruments";
import { familia, type Familia } from "@/lib/plan";

// The profesor's rubric for a delivery: 1 to 5 in each criterion of the instrument family.
// Criteria ids are stored in Firestore (`evaluacion.criterios`): only add, never rename.

export type Criterio = { id: string; label: string; ayuda: string };

const COMUNES: Criterio[] = [
  { id: "tiempo", label: "Tiempo", ayuda: "Pulso estable, sin apurarse ni atrasarse" },
  { id: "expresion", label: "Expresión", ayuda: "Dinámicas, fraseo y carácter de la obra" },
];

const CRITERIOS: Record<Familia, Criterio[]> = {
  cuerdas: [
    { id: "afinacion", label: "Afinación", ayuda: "Instrumento afinado, notas limpias" },
    COMUNES[0]!,
    { id: "tecnica", label: "Técnica", ayuda: "Digitación, pulsación y postura de las manos" },
    { id: "sonido", label: "Sonido", ayuda: "Sin trastes que zumban ni cuerdas apagadas" },
    COMUNES[1]!,
  ],
  teclados: [
    COMUNES[0]!,
    { id: "tecnica", label: "Técnica", ayuda: "Digitación, muñeca suelta, postura" },
    {
      id: "independencia",
      label: "Independencia",
      ayuda: "Las dos manos juntas, cada una lo suyo",
    },
    { id: "lectura", label: "Lectura", ayuda: "Notas y ritmos como están escritos" },
    COMUNES[1]!,
  ],
  arco: [
    { id: "afinacion", label: "Afinación", ayuda: "Notas justas, sobre todo en los cambios" },
    COMUNES[0]!,
    { id: "arco", label: "Arco", ayuda: "Arco recto, peso y punto de contacto" },
    { id: "sonido", label: "Sonido", ayuda: "Sonido parejo, sin chirridos" },
    COMUNES[1]!,
  ],
  viento: [
    { id: "afinacion", label: "Afinación", ayuda: "Notas justas en todo el registro" },
    COMUNES[0]!,
    { id: "respiracion", label: "Respiración", ayuda: "Aire y apoyo para frases completas" },
    { id: "sonido", label: "Sonido", ayuda: "Embocadura y sonido parejo" },
    COMUNES[1]!,
  ],
  voz: [
    { id: "afinacion", label: "Afinación", ayuda: "Notas justas, sin quedarse bajo" },
    COMUNES[0]!,
    { id: "respiracion", label: "Respiración", ayuda: "Apoyo y aire para cada frase" },
    { id: "diccion", label: "Dicción", ayuda: "Se entiende la letra" },
    COMUNES[1]!,
  ],
  percusion: [
    COMUNES[0]!,
    { id: "tecnica", label: "Técnica", ayuda: "Agarre, rebote y golpes parejos" },
    { id: "dinamica", label: "Dinámica", ayuda: "Acentos y notas fantasma" },
    { id: "coordinacion", label: "Coordinación", ayuda: "Manos y pies independientes" },
    { id: "groove", label: "Groove", ayuda: "Suena con estilo y se puede bailar" },
  ],
};

export const criteriosPara = (instrumento: InstrumentId) => CRITERIOS[familia(instrumento)];

export const NOTAS_RUBRICA = [
  { valor: 1, label: "Empezando" },
  { valor: 2, label: "En camino" },
  { valor: 3, label: "Bien" },
  { valor: 4, label: "Muy bien" },
  { valor: 5, label: "Excelente" },
] as const;

export const etiquetaNota = (valor: number) =>
  NOTAS_RUBRICA.find((n) => n.valor === Math.round(valor))?.label ?? "";

// Average per criterion over the evaluated deliveries (oldest to newest), with the latest value
// and whether it is going up: the "skills" chart of the alumno.
export function habilidades(instrumento: InstrumentId, entregas: Entrega[]) {
  const evaluadas = entregas
    .filter((e) => e.instrumento === instrumento && e.evaluacion)
    .sort((a, b) => a.evaluacion!.fecha - b.evaluacion!.fecha);
  return criteriosPara(instrumento).map((criterio) => {
    const valores = evaluadas
      .map((e) => e.evaluacion!.criterios[criterio.id])
      .filter((v): v is number => typeof v === "number");
    const ultimo = valores.at(-1) ?? null;
    const anterior = valores.at(-2) ?? null;
    return {
      criterio,
      promedio: valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null,
      ultimo,
      tendencia: ultimo !== null && anterior !== null ? Math.sign(ultimo - anterior) : 0,
      cantidad: valores.length,
    };
  });
}
