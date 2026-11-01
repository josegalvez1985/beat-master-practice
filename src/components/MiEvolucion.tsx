import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialList } from "@/components/Materials";
import { Opciones } from "@/components/plan/comunes";
import type { Entrega } from "@/lib/data";
import type { Material } from "@/lib/files";
import { instrumento as instrumentoDe, type InstrumentId } from "@/lib/instruments";
import { colors, fonts, radius } from "@/lib/theme";

// When a file was uploaded: its id starts with the upload time (see subirArchivo).
const momento = (m: Material) => Number(m.id.split("-")[0]) || 0;

const fechaCorta = (ms: number) =>
  new Date(ms).toLocaleDateString("es-PY", { day: "numeric", month: "short" });

// "Mi evolución": the first recording next to the latest one, and how tuning and time moved
// over the analyzed recordings. Built from the deliveries; nothing new is stored.
export function MiEvolucion({
  instrumentos,
  entregas,
}: {
  instrumentos: InstrumentId[];
  entregas: Entrega[];
}) {
  const conGrabaciones = instrumentos.filter((i) =>
    entregas.some(
      (e) =>
        e.instrumento === i && e.archivos.some((a) => a.tipo === "audio" || a.tipo === "video"),
    ),
  );
  const [elegido, setElegido] = useState<InstrumentId | null>(null);
  const instrumento = elegido && conGrabaciones.includes(elegido) ? elegido : conGrabaciones[0];
  if (!instrumento) return null;

  const grabaciones = entregas
    .filter((e) => e.instrumento === instrumento)
    .flatMap((e) => e.archivos)
    .filter((a) => a.tipo === "audio" || a.tipo === "video")
    .sort((a, b) => momento(a) - momento(b));
  const primera = grabaciones[0]!;
  const ultima = grabaciones.at(-1)!;
  const afinacion = grabaciones
    .filter((a) => a.analisis?.afinacion !== undefined)
    .map((a) => ({ t: momento(a), v: a.analisis!.afinacion! }));
  const tiempo = grabaciones
    .filter((a) => a.analisis?.desvioMs !== undefined)
    .map((a) => ({ t: momento(a), v: a.analisis!.desvioMs! }));

  return (
    <View style={styles.wrap}>
      {conGrabaciones.length > 1 ? (
        <Opciones
          chico
          opciones={conGrabaciones.map((i) => ({ value: i, label: instrumentoDe(i).name }))}
          valor={instrumento}
          onChange={setElegido}
        />
      ) : null}
      {grabaciones.length > 1 ? (
        <View style={styles.comparar}>
          <View style={styles.columna}>
            <Text style={styles.etiqueta}>
              Tu primera grabación · {fechaCorta(momento(primera))}
            </Text>
            <MaterialList materiales={[primera]} />
          </View>
          <View style={styles.columna}>
            <Text style={styles.etiqueta}>La más reciente · {fechaCorta(momento(ultima))}</Text>
            <MaterialList materiales={[ultima]} />
          </View>
        </View>
      ) : (
        <Text style={styles.ayuda}>
          Con tu segunda grabación vas a poder escuchar la primera al lado de la última.
        </Text>
      )}
      {afinacion.length > 1 ? (
        <Grafico
          titulo="Notas afinadas"
          unidad="%"
          puntos={afinacion}
          minimo={0}
          maximo={100}
          ayuda="Más alto es mejor."
        />
      ) : null}
      {tiempo.length > 1 ? (
        <Grafico
          titulo="Desvío del tiempo"
          unidad=" ms"
          puntos={tiempo}
          minimo={0}
          maximo={Math.max(60, ...tiempo.map((p) => p.v))}
          ayuda="Más bajo es mejor: tus notas caen más cerca del pulso."
        />
      ) : null}
      {afinacion.length < 2 && tiempo.length < 2 ? (
        <Text style={styles.ayuda}>
          Graba tus entregas desde la app: cada grabación se analiza y aquí verás cómo mejoran tu
          afinación y tu tiempo.
        </Text>
      ) : null}
    </View>
  );
}

const ANCHO = 320;
const ALTO = 120;
const MARGEN = { izquierda: 34, derecha: 12, arriba: 12, abajo: 22 };

// One series over time: 2 px line, 8 px points, recessive axis; hovering or tapping a point
// shows its date and value.
function Grafico({
  titulo,
  unidad,
  puntos,
  minimo,
  maximo,
  ayuda,
}: {
  titulo: string;
  unidad: string;
  puntos: { t: number; v: number }[];
  minimo: number;
  maximo: number;
  ayuda: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const t0 = puntos[0]!.t;
  const t1 = puntos.at(-1)!.t;
  const x = (t: number) =>
    MARGEN.izquierda +
    (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (ANCHO - MARGEN.izquierda - MARGEN.derecha);
  const y = (v: number) =>
    MARGEN.arriba + (1 - (v - minimo) / (maximo - minimo)) * (ALTO - MARGEN.arriba - MARGEN.abajo);
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(p.t)},${y(p.v)}`).join(" ");
  const ultimo = puntos.at(-1)!;
  const elegido = activo !== null ? puntos[activo]! : ultimo;

  return (
    <View style={styles.grafico}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.valor} accessibilityLiveRegion="polite">
          {fechaCorta(elegido.t)} · {elegido.v}
          {unidad}
        </Text>
      </View>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        width="100%"
        style={{ maxWidth: 520, overflow: "visible", fontFamily: fonts.sans }}
        role="img"
        aria-label={`${titulo}: de ${puntos[0]!.v}${unidad} a ${ultimo.v}${unidad} en ${puntos.length} grabaciones`}
        onMouseLeave={() => setActivo(null)}
      >
        {[minimo, maximo].map((v) => (
          <g key={v}>
            <line
              x1={MARGEN.izquierda}
              x2={ANCHO - MARGEN.derecha}
              y1={y(v)}
              y2={y(v)}
              stroke={colors.border}
              strokeWidth={1}
            />
            <text
              x={MARGEN.izquierda - 6}
              y={y(v) + 4}
              textAnchor="end"
              fontSize={10}
              fill={colors.mutedForeground}
            >
              {Math.round(v)}
            </text>
          </g>
        ))}
        <text x={MARGEN.izquierda} y={ALTO - 4} fontSize={10} fill={colors.mutedForeground}>
          {fechaCorta(t0)}
        </text>
        <text
          x={ANCHO - MARGEN.derecha}
          y={ALTO - 4}
          textAnchor="end"
          fontSize={10}
          fill={colors.mutedForeground}
        >
          {fechaCorta(t1)}
        </text>
        <path
          d={linea}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {puntos.map((p, i) => (
          <g key={i}>
            {/* Hit area bigger than the point. */}
            <circle
              cx={x(p.t)}
              cy={y(p.v)}
              r={12}
              fill="transparent"
              onMouseEnter={() => setActivo(i)}
              onClick={() => setActivo(i)}
            />
            <circle
              cx={x(p.t)}
              cy={y(p.v)}
              r={activo === i ? 6 : 4}
              fill={colors.primary}
              stroke={colors.muted}
              strokeWidth={2}
              pointerEvents="none"
            />
          </g>
        ))}
      </svg>
      <Text style={styles.ayuda}>{ayuda}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  comparar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  columna: {
    flexGrow: 1,
    flexBasis: 240,
    gap: 6,
  },
  etiqueta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  grafico: {
    gap: 6,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  cabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.foreground,
  },
  valor: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
});
