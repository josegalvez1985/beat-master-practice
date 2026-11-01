import type { ReactNode } from "react";
import { colors } from "@/lib/theme";

// One 4/4 bar of rhythm on a single percussion line: note heads, stems, eighth and sixteenth
// beams (or flags for a lone note), dots and rests, beat by beat. `estados` colors each written
// note after playing it: green on time, amber close, red missed.

const MUSICA = "'Noto Music', 'Segoe UI Symbol', 'Apple Symbols', 'Bravura', serif";
const SILENCIO = { 4: "\u{1D13D}", 2: "\u{1D13E}", 1: "\u{1D13F}" } as const;

type Nota = { pos: number; dur: number };

export function Ritmo({
  ritmo,
  estados,
  ancho = 340,
}: {
  ritmo: boolean[];
  estados?: ("ok" | "casi" | "falta")[];
  ancho?: number;
}) {
  const w = 340;
  const h = 96;
  const linea = 66;
  const arriba = 30;
  const izq = 14;
  const anchoPulso = (w - izq * 2) / 4;
  const x = (beat: number, pos: number) => izq + beat * anchoPulso + pos * (anchoPulso / 4) + 10;
  const tinta = colors.paperInk;
  const elementos: ReactNode[] = [];
  let indiceNota = 0;

  for (let beat = 0; beat < 4; beat++) {
    const slots = ritmo.slice(beat * 4, beat * 4 + 4);
    const posiciones = slots.flatMap((g, i) => (g ? [i] : []));
    if (!posiciones.length) {
      elementos.push(
        <text
          key={`r${beat}`}
          x={x(beat, 0) - 4}
          y={linea + 8}
          fontSize={30}
          fill={tinta}
          fontFamily={MUSICA}
        >
          {SILENCIO[4]}
        </text>,
      );
      continue;
    }
    // Leading rest: 1, 2 or 3 sixteenths (3 = eighth + sixteenth).
    const primero = posiciones[0]!;
    const silencios = primero === 3 ? [2, 1] : primero ? [primero as 1 | 2] : [];
    let corrido = 0;
    silencios.forEach((dur, i) => {
      elementos.push(
        <text
          key={`s${beat}-${i}`}
          x={x(beat, corrido) - 4}
          y={linea + 6}
          fontSize={26}
          fill={tinta}
          fontFamily={MUSICA}
        >
          {SILENCIO[dur as 1 | 2]}
        </text>,
      );
      corrido += dur;
    });

    const notas: Nota[] = posiciones.map((pos, i) => ({
      pos,
      dur: (posiciones[i + 1] ?? 4) - pos,
    }));

    notas.forEach((nota) => {
      const cx = x(beat, nota.pos);
      const estado = estados?.[indiceNota];
      const color =
        estado === "ok"
          ? colors.success
          : estado === "casi"
            ? colors.primary
            : estado === "falta"
              ? colors.destructive
              : tinta;
      elementos.push(
        <g key={`n${beat}-${nota.pos}`}>
          <ellipse
            cx={cx}
            cy={linea}
            rx={6}
            ry={4.4}
            fill={color}
            transform={`rotate(-20 ${cx} ${linea})`}
          />
          <line
            x1={cx + 5.4}
            x2={cx + 5.4}
            y1={linea - 2}
            y2={arriba}
            stroke={color}
            strokeWidth={1.6}
          />
          {nota.dur === 3 ? <circle cx={cx + 11} cy={linea - 2} r={1.8} fill={color} /> : null}
          {estado ? <circle cx={cx} cy={14} r={4} fill={color} /> : null}
        </g>,
      );
      indiceNota += 1;
    });

    const plica = (n: Nota) => x(beat, n.pos) + 5.4;
    if (notas.length === 1) {
      // Lone note: quarter (nothing), eighth / dotted eighth (one flag), sixteenth (two).
      const n = notas[0]!;
      const banderas = n.dur === 4 ? 0 : n.dur === 1 ? 2 : 1;
      for (let b = 0; b < banderas; b++)
        elementos.push(
          <path
            key={`f${beat}-${b}`}
            d={`M ${plica(n)} ${arriba + b * 7} q 8 6 6 16`}
            fill="none"
            stroke={tinta}
            strokeWidth={2}
          />,
        );
    } else {
      // Beam over the beat; a second beam joins sixteenths (a stub for a lone one).
      const a = notas[0]!;
      const z = notas[notas.length - 1]!;
      elementos.push(
        <rect
          key={`b${beat}`}
          x={plica(a)}
          y={arriba}
          width={plica(z) - plica(a)}
          height={4}
          fill={tinta}
        />,
      );
      notas.forEach((n, i) => {
        if (n.dur !== 1) return;
        const siguiente = notas[i + 1];
        const anterior = notas[i - 1];
        if (siguiente && siguiente.dur === 1)
          elementos.push(
            <rect
              key={`b2${beat}-${i}`}
              x={plica(n)}
              y={arriba + 7}
              width={plica(siguiente) - plica(n)}
              height={4}
              fill={tinta}
            />,
          );
        else if (!(anterior && anterior.dur === 1)) {
          const haciaAtras = !siguiente;
          elementos.push(
            <rect
              key={`b2${beat}-${i}`}
              x={haciaAtras ? plica(n) - 8 : plica(n)}
              y={arriba + 7}
              width={8}
              height={4}
              fill={tinta}
            />,
          );
        }
      });
    }
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: ancho }} aria-hidden="true">
      <line x1={izq - 6} x2={w - izq + 6} y1={linea} y2={linea} stroke={tinta} strokeWidth={1.2} />
      <line
        x1={izq - 6}
        x2={izq - 6}
        y1={linea - 14}
        y2={linea + 14}
        stroke={tinta}
        strokeWidth={1.4}
      />
      <line
        x1={w - izq + 6}
        x2={w - izq + 6}
        y1={linea - 14}
        y2={linea + 14}
        stroke={tinta}
        strokeWidth={1.4}
      />
      {elementos}
    </svg>
  );
}
