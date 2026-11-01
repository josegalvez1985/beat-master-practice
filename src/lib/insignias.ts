import type { LucideIcon } from "lucide-react";
import {
  Award,
  Crosshair,
  Flame,
  Hourglass,
  Medal,
  Mic,
  Repeat,
  Send,
  Star,
  Trophy,
} from "lucide-react";
import { MUY_ESTABLE_MS } from "@/lib/analisis";
import type { EntradaDiario, Entrega, Logros, RecordRudimento } from "@/lib/data";
import { sumarDias } from "@/lib/dates";
import { avanceDeNivel } from "@/lib/ruta";

// Badges earned from what is already saved (deliveries, diary, records, learning path): they
// are computed in the browser, nothing new is stored.

export type Insignia = {
  id: string;
  nombre: string;
  descripcion: string;
  icon: LucideIcon;
  ganada: boolean;
  // How far along, for the ones not earned yet ("3 de 7 días").
  avance?: string;
};

// Longest run of consecutive days with practice in the diary.
export function mejorRacha(diario: EntradaDiario[]) {
  const dias = [...new Set(diario.map((e) => e.fecha))].sort();
  let mejor = 0;
  let actual = 0;
  dias.forEach((dia, i) => {
    actual = i > 0 && sumarDias(dias[i - 1]!, 1) === dia ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
  });
  return mejor;
}

export function insignias({
  entregas,
  diario,
  records,
  logros,
}: {
  entregas: Entrega[];
  diario: EntradaDiario[];
  records: RecordRudimento[];
  logros: Logros[];
}): Insignia[] {
  const racha = mejorRacha(diario);
  const horas = diario.reduce((total, e) => total + e.minutos, 0) / 60;
  const archivos = entregas.flatMap((e) => e.archivos);
  const cincos = entregas.some((e) =>
    Object.values(e.evaluacion?.criterios ?? {}).some((v) => v === 5),
  );
  const afinada = archivos.some((a) => (a.analisis?.afinacion ?? 0) >= 90);
  const aTiempo = archivos.some(
    (a) => a.analisis?.desvioMs !== undefined && a.analisis.desvioMs <= MUY_ESTABLE_MS,
  );
  const nivelCompleto = logros.some(
    (l) => avanceDeNivel(l.instrumento, l.nivel, l.cumplidos) === 100,
  );
  const recital = logros.some((l) => l.cumplidos.some((id) => id.endsWith("-recital")));
  const conteo = (valor: number, meta: number, unidad: string) =>
    `${Math.min(Math.floor(valor), meta)} de ${meta} ${unidad}`;

  return [
    {
      id: "primera-entrega",
      nombre: "Primera entrega",
      descripcion: "Enviaste tu primera grabación",
      icon: Send,
      ganada: entregas.length >= 1,
    },
    {
      id: "diez-entregas",
      nombre: "Constancia",
      descripcion: "10 clases entregadas",
      icon: Medal,
      ganada: entregas.length >= 10,
      avance: conteo(entregas.length, 10, "entregas"),
    },
    {
      id: "racha-7",
      nombre: "Semana en llamas",
      descripcion: "7 días seguidos practicando",
      icon: Flame,
      ganada: racha >= 7,
      avance: conteo(racha, 7, "días"),
    },
    {
      id: "racha-30",
      nombre: "Un mes sin parar",
      descripcion: "30 días seguidos practicando",
      icon: Flame,
      ganada: racha >= 30,
      avance: conteo(racha, 30, "días"),
    },
    {
      id: "horas-10",
      nombre: "10 horas",
      descripcion: "10 horas de práctica anotadas",
      icon: Hourglass,
      ganada: horas >= 10,
      avance: conteo(horas, 10, "horas"),
    },
    {
      id: "horas-50",
      nombre: "50 horas",
      descripcion: "50 horas de práctica anotadas",
      icon: Hourglass,
      ganada: horas >= 50,
      avance: conteo(horas, 50, "horas"),
    },
    {
      id: "afinado",
      nombre: "Oído fino",
      descripcion: "Una grabación con 90% o más de notas afinadas",
      icon: Mic,
      ganada: afinada,
    },
    {
      id: "a-tiempo",
      nombre: "Reloj",
      descripcion: "Una grabación con el tiempo muy estable",
      icon: Crosshair,
      ganada: aTiempo,
    },
    {
      id: "excelente",
      nombre: "Excelente",
      descripcion: "Un 5 en la evaluación de tu profesor",
      icon: Star,
      ganada: cincos,
    },
    {
      id: "nivel",
      nombre: "Nivel superado",
      descripcion: "Todos los objetivos de un nivel cumplidos",
      icon: Trophy,
      ganada: nivelCompleto,
    },
    {
      id: "recital",
      nombre: "Escenario",
      descripcion: "Tocaste en un recital",
      icon: Award,
      ganada: recital,
    },
    ...(records.length
      ? [
          {
            id: "rudimentos-5",
            nombre: "Rudimentario",
            descripcion: "Récords en 5 rudimentos",
            icon: Repeat,
            ganada: records.length >= 5,
            avance: conteo(records.length, 5, "rudimentos"),
          },
        ]
      : []),
  ];
}
