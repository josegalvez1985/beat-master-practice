import { colors } from "@/lib/theme";

// Two octaves of keyboard from C4 (middle Do) with the given notes lit. Notes outside the range
// are shown an octave inside it.

const DESDE = 60;
const BLANCAS = 15; // C4 … C6
const BLANCA_PC = [0, 2, 4, 5, 7, 9, 11];
// Black keys: position (in white keys) of their left edge, and pitch class.
const NEGRAS = [
  { pc: 1, x: 0.65 },
  { pc: 3, x: 1.75 },
  { pc: 6, x: 3.65 },
  { pc: 8, x: 4.7 },
  { pc: 10, x: 5.75 },
];

export function Teclado({
  notas,
  ancho = 320,
  dedos,
}: {
  notas: number[];
  ancho?: number;
  // Finger number (1 thumb … 5 little finger) to write on each lit key.
  dedos?: Map<number, number>;
}) {
  const hasta = DESDE + 24;
  const plegar = (m: number) => {
    let n = m;
    while (n < DESDE) n += 12;
    while (n > hasta) n -= 12;
    return n;
  };
  const dentro = new Set(notas.map(plegar));
  const dedoEn = new Map([...(dedos ?? [])].map(([m, d]) => [plegar(m), d]));
  const w = 20;
  const h = 80;
  const blancas = Array.from({ length: BLANCAS }, (_, i) => {
    const octava = Math.floor(i / 7);
    return { x: i * w, midi: DESDE + octava * 12 + BLANCA_PC[i % 7]! };
  });
  const negras = [0, 1].flatMap((octava) =>
    NEGRAS.map((n) => ({ x: (n.x + octava * 7) * w, midi: DESDE + octava * 12 + n.pc })),
  );

  return (
    <svg
      viewBox={`0 0 ${BLANCAS * w} ${h}`}
      width="100%"
      style={{ maxWidth: ancho }}
      aria-hidden="true"
    >
      {blancas.map((k) => (
        <rect
          key={k.midi}
          x={k.x + 0.5}
          y={0.5}
          width={w - 1}
          height={h - 1}
          rx={3}
          fill={dentro.has(k.midi) ? colors.primary : colors.paper}
          stroke={colors.border}
        />
      ))}
      {negras.map((k) => (
        <rect
          key={k.midi}
          x={k.x}
          y={0}
          width={w * 0.6}
          height={h * 0.6}
          rx={2}
          fill={dentro.has(k.midi) ? colors.primary : colors.paperInk}
        />
      ))}
      {blancas
        .filter((k) => dedoEn.has(k.midi))
        .map((k) => (
          <text
            key={`d${k.midi}`}
            x={k.x + w / 2}
            y={h - 22}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            fill={colors.primaryForeground}
          >
            {dedoEn.get(k.midi)}
          </text>
        ))}
      {negras
        .filter((k) => dedoEn.has(k.midi))
        .map((k) => (
          <text
            key={`d${k.midi}`}
            x={k.x + w * 0.3}
            y={h * 0.6 - 8}
            fontSize={10}
            fontWeight={700}
            textAnchor="middle"
            fill={colors.primaryForeground}
          >
            {dedoEn.get(k.midi)}
          </text>
        ))}
      {/* Middle Do marker. */}
      <circle cx={w / 2} cy={h - 9} r={2.5} fill={colors.mutedForeground} />
    </svg>
  );
}
