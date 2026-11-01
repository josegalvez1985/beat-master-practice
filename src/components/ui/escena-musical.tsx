import { Drum, Guitar, MicVocal, Piano } from "lucide-react";
import { instrumento, type InstrumentId } from "@/lib/instruments";
import { colors } from "@/lib/theme";

// Animated music scene: a Paraguayan harp with vibrating strings (or an equalizer), floating
// bubbles with instruments, rising notes and the brand's pulse line running along the bottom.
// Only inline SVG and CSS animations of transform and opacity (handled by the GPU): no images,
// no animation libraries, almost no memory. Still when the device asks for reduced motion.

const CSS = `
.pulso-escena { position: relative; width: 100%; overflow: hidden; pointer-events: none; }
.pulso-escena svg.pulso-arte { position: absolute; inset: 0; width: 100%; height: 100%; }
.pulso-burbuja {
  position: absolute; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; background: ${colors.card}; border: 1px solid ${colors.border};
  box-shadow: ${colors.shadow}; will-change: transform;
  animation: pulso-flotar var(--dur, 6s) ease-in-out var(--delay, 0s) infinite;
}
.pulso-cuerda { animation: pulso-cuerda 0.9s ease-in-out var(--delay, 0s) infinite; }
.pulso-eq { transform-box: fill-box; transform-origin: 50% 100%;
  animation: pulso-eq var(--dur, 1.2s) ease-in-out var(--delay, 0s) infinite; }
.pulso-nota { transform-box: fill-box; transform-origin: center;
  animation: pulso-nota 4.2s ease-out var(--delay, 0s) infinite; opacity: 0; }
.pulso-recorrido { animation: pulso-recorrido 3.2s linear infinite; }
.pulso-halo { transform-box: fill-box; transform-origin: center;
  animation: pulso-halo 5s ease-in-out infinite; }
@keyframes pulso-flotar {
  0%, 100% { transform: translateY(0) rotate(var(--giro, 0deg)); }
  50% { transform: translateY(-9px) rotate(calc(var(--giro, 0deg) * -1)); }
}
@keyframes pulso-cuerda {
  0%, 100% { transform: translateX(0); } 25% { transform: translateX(0.8px); } 75% { transform: translateX(-0.8px); }
}
@keyframes pulso-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes pulso-nota {
  0% { transform: translateY(0) scale(0.8); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateY(-70px) scale(1.15); opacity: 0; }
}
@keyframes pulso-recorrido { from { stroke-dashoffset: 520; } to { stroke-dashoffset: 0; } }
@keyframes pulso-halo { 0%, 100% { opacity: 0.45; transform: scale(0.94); } 50% { opacity: 0.8; transform: scale(1.04); } }
@media (prefers-reduced-motion: reduce) {
  .pulso-escena, .pulso-escena * { animation: none !important; }
  .pulso-nota { opacity: 0.6; }
}
`;

if (!document.getElementById("pulso-escena")) {
  const style = document.createElement("style");
  style.id = "pulso-escena";
  style.textContent = CSS;
  document.head.appendChild(style);
}

// --- The harp (viewBox 0 0 400 240): pillar, curved neck and soundboard, strings between them ---

const CUELLO = { a: [250, 70], b: [205, 24], c: [148, 56] } as const;
const enCuello = (t: number) => {
  const u = 1 - t;
  return [
    u * u * CUELLO.a[0] + 2 * u * t * CUELLO.b[0] + t * t * CUELLO.c[0],
    u * u * CUELLO.a[1] + 2 * u * t * CUELLO.b[1] + t * t * CUELLO.c[1],
  ] as const;
};
// Height of the neck above a given x (bisection on the curve, x decreases as t grows).
const alturaCuello = (x: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (enCuello(mid)[0] > x) lo = mid;
    else hi = mid;
  }
  return enCuello((lo + hi) / 2)[1];
};
const CUERDAS = Array.from({ length: 9 }, (_, i) => {
  const x = 180 + i * 8;
  return { x, arriba: alturaCuello(x) + 3, abajo: 226 - 2 * (x - 172) - 5 };
});

function Arpa() {
  return (
    <g>
      <ellipse
        className="pulso-halo"
        cx={200}
        cy={140}
        rx={95}
        ry={95}
        fill={colors.primary}
        fillOpacity={0.12}
      />
      {CUERDAS.map((c, i) => (
        <line
          key={c.x}
          className="pulso-cuerda"
          style={{ ["--delay" as string]: `${i * 0.11}s` }}
          x1={c.x}
          x2={c.x}
          y1={c.arriba}
          y2={c.abajo}
          stroke={colors.foreground}
          strokeOpacity={0.55}
          strokeWidth={1.2}
        />
      ))}
      <path
        d={`M ${CUELLO.a[0]} ${CUELLO.a[1]} Q ${CUELLO.b[0]} ${CUELLO.b[1]} ${CUELLO.c[0]} ${CUELLO.c[1]}`}
        fill="none"
        stroke={colors.primary}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <line
        x1={148}
        y1={56}
        x2={160}
        y2={226}
        stroke={colors.primary}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <line
        x1={172}
        y1={226}
        x2={250}
        y2={70}
        stroke={colors.highlight}
        strokeWidth={12}
        strokeLinecap="round"
      />
      <line
        x1={154}
        y1={228}
        x2={182}
        y2={228}
        stroke={colors.primary}
        strokeWidth={6}
        strokeLinecap="round"
      />
    </g>
  );
}

function Ecualizador() {
  const barras = 11;
  return (
    <g>
      <ellipse
        className="pulso-halo"
        cx={200}
        cy={150}
        rx={110}
        ry={80}
        fill={colors.primary}
        fillOpacity={0.1}
      />
      {Array.from({ length: barras }, (_, i) => {
        const centro = 1 - Math.abs(i - (barras - 1) / 2) / ((barras - 1) / 2);
        const alto = 40 + centro * 110;
        return (
          <rect
            key={i}
            className="pulso-eq"
            style={{
              ["--delay" as string]: `${(i % 4) * 0.17 + i * 0.05}s`,
              ["--dur" as string]: `${1 + (i % 3) * 0.25}s`,
            }}
            x={128 + i * 13.5}
            y={214 - alto}
            width={8}
            height={alto}
            rx={4}
            fill={i % 2 ? colors.highlight : colors.primary}
          />
        );
      })}
    </g>
  );
}

// Small harp for a bubble (lucide has no harp).
function IconoArpa({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 4 Q12 1 6 4 L7.5 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d="M17 4 L10 21 L6 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {[9, 11, 13].map((x) => (
        <line key={x} x1={x} x2={x} y1={4} y2={21 - (x - 8) * 1.6} stroke={color} strokeWidth={1} />
      ))}
    </svg>
  );
}

const POR_DEFECTO: InstrumentId[] = ["guitarra", "bateria", "piano", "voz"];
const ICONOS_FIJOS: Partial<Record<InstrumentId, typeof Guitar>> = {
  guitarra: Guitar,
  bateria: Drum,
  piano: Piano,
  voz: MicVocal,
};

// Bubble slots (percent of the scene) with their own float timing and tilt.
const LUGARES = [
  { left: "5%", top: "14%", dur: "6.2s", delay: "0s", giro: "-6deg" },
  { right: "5%", top: "20%", dur: "5.6s", delay: "0.8s", giro: "5deg" },
  { left: "13%", bottom: "12%", dur: "6.8s", delay: "1.6s", giro: "4deg" },
  { right: "12%", bottom: "14%", dur: "5.9s", delay: "0.4s", giro: "-5deg" },
];

export function EscenaMusical({
  alto,
  centro = "arpa",
  instrumentos = [],
  etiqueta,
  compacta = false,
}: {
  alto: number;
  centro?: "arpa" | "ecualizador";
  // The person's instruments float first; the rest of the bubbles use the usual four.
  instrumentos?: InstrumentId[];
  // Description for screen readers; without it the scene is decorative.
  etiqueta?: string;
  compacta?: boolean;
}) {
  const burbujas = [...instrumentos, ...POR_DEFECTO]
    .filter((id, i, lista) => lista.indexOf(id) === i)
    .filter((id) => !(centro === "arpa" && id === "arpa"))
    .slice(0, LUGARES.length);
  const lado = compacta ? 38 : 54;
  const icono = compacta ? 18 : 26;

  return (
    <div
      className="pulso-escena"
      style={{ height: alto }}
      {...(etiqueta ? { role: "img", "aria-label": etiqueta } : { "aria-hidden": true })}
    >
      <svg className="pulso-arte" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet">
        {centro === "arpa" ? <Arpa /> : <Ecualizador />}
        {["♪", "♫", "♬"].map((nota, i) => (
          <text
            key={nota}
            className="pulso-nota"
            style={{ ["--delay" as string]: `${i * 1.4}s` }}
            x={[214, 236, 188][i]}
            y={96}
            fontSize={20}
            fill={i === 1 ? colors.primary : colors.foreground}
          >
            {nota}
          </text>
        ))}
        <path
          d="M 0 234 H 282 l 10 -18 l 12 26 l 10 -14 l 8 6 H 400"
          fill="none"
          stroke={colors.primary}
          strokeOpacity={0.25}
          strokeWidth={2}
        />
        <path
          className="pulso-recorrido"
          d="M 0 234 H 282 l 10 -18 l 12 26 l 10 -14 l 8 6 H 400"
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="70 450"
        />
      </svg>
      {burbujas.map((id, i) => {
        const lugar = LUGARES[i]!;
        const Icono = ICONOS_FIJOS[id] ?? instrumento(id).icon;
        const { dur, delay, giro, ...posicion } = lugar;
        return (
          <div
            key={id}
            className="pulso-burbuja"
            style={{
              ...posicion,
              width: lado,
              height: lado,
              ["--dur" as string]: dur,
              ["--delay" as string]: delay,
              ["--giro" as string]: giro,
            }}
          >
            {id === "arpa" ? (
              <IconoArpa size={icono} color={colors.primary} />
            ) : (
              <Icono size={icono} color={i % 2 ? colors.primary : colors.foreground} />
            )}
          </div>
        );
      })}
    </div>
  );
}
