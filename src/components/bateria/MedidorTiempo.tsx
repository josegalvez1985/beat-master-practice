import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Crosshair, Pause, Play } from "lucide-react";
import { Fila, Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { A_TIEMPO_MS, estadisticas, useMedidorTiempo } from "@/lib/tiempo";
import { colors, fonts, radius } from "@/lib/theme";

const subdivisiones = [
  { value: "1", label: "Negras" },
  { value: "2", label: "Corcheas" },
  { value: "4", label: "Semicorcheas" },
] as const;
const clicks = [
  { value: "sonido", label: "Click con auriculares" },
  { value: "visual", label: "Click solo visual" },
] as const;

// Timing coach: play along the click on a practice pad; every hit is placed early or late.
export function MedidorTiempo() {
  const [bpm, setBpm] = useState(80);
  const [subdivision, setSubdivision] = useState<"1" | "2" | "4">("1");
  const [click, setClick] = useState<"sonido" | "visual">("sonido");
  const { estado, error, desvios, pulso, latencia, calibrados, iniciar, parar } =
    useMedidorTiempo();
  const ultimos = desvios.slice(-16);
  const datos = estadisticas(ultimos);
  const todos = estadisticas(desvios);
  const activo = estado !== "apagado";

  const consejo = !datos
    ? null
    : Math.abs(datos.promedio) <= 10
      ? "¡Justo en el click!"
      : datos.promedio < 0
        ? "Te apuras: relaja y espera el click."
        : "Vas atrás: anticipa un poco el golpe.";

  return (
    <View style={styles.wrap}>
      <View style={styles.filas}>
        <Fila label="Tempo">
          <Stepper
            label="tempo"
            value={bpm}
            min={40}
            max={200}
            step={5}
            suffix="BPM"
            onChange={setBpm}
          />
        </Fila>
        <Fila label="Tocas en">
          <Opciones chico opciones={subdivisiones} valor={subdivision} onChange={setSubdivision} />
        </Fila>
        <Fila label="Click">
          <Opciones chico opciones={clicks} valor={click} onChange={setClick} />
        </Fila>
      </View>

      <View style={styles.pulsos}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.pulso, activo && pulso === i && styles.pulsoActivo]} />
        ))}
      </View>

      <View style={styles.lectura} accessibilityLiveRegion="polite">
        <Text style={[styles.numero, datos && Math.abs(datos.promedio) <= 10 && styles.justo]}>
          {datos ? `${datos.promedio > 0 ? "+" : ""}${Math.round(datos.promedio)} ms` : "— ms"}
        </Text>
        <Text style={styles.consejo}>
          {estado === "calibrando"
            ? `Calibrando: toca negras junto al click (${calibrados} de 8)`
            : estado === "pidiendo"
              ? "Permite el uso del micrófono…"
              : estado === "midiendo"
                ? (consejo ?? "Después de la cuenta (4 clicks), toca junto al click.")
                : "Promedio de tus últimos 16 golpes: − antes del click, + después."}
        </Text>
      </View>

      <Grafico desvios={desvios.slice(-32)} />

      {todos ? (
        <View style={styles.stats}>
          <Dato valor={`${todos.aTiempo}%`} texto={`a tiempo (±${A_TIEMPO_MS} ms)`} />
          <Dato valor={`${Math.round(todos.desviacion)} ms`} texto="de variación" />
          <Dato valor={String(desvios.length)} texto="golpes" />
        </View>
      ) : null}

      <View style={styles.acciones}>
        {activo ? (
          <Button variant="secondary" onPress={parar}>
            <Pause size={16} color={buttonForeground("secondary")} />
            Detener
          </Button>
        ) : (
          <Button
            onPress={() =>
              void iniciar({
                bpm,
                subdivision: Number(subdivision),
                conSonido: click === "sonido",
                calibrar: false,
              })
            }
          >
            <Play size={16} color={buttonForeground()} />
            Empezar a medir
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={activo}
          onPress={() =>
            void iniciar({ bpm: 80, subdivision: 1, conSonido: click === "sonido", calibrar: true })
          }
        >
          <Crosshair size={16} color={buttonForeground("secondary")} />
          {latencia === null ? "Calibrar (recomendado)" : `Recalibrar (${latencia} ms)`}
        </Button>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.ayuda}>
        Funciona mejor con un pad de práctica y el celular cerca. Usa auriculares para el click (o
        el click visual): si el micrófono oye el click, lo cuenta como golpe. Calibra una vez en
        cada dispositivo: mide el retraso de tus auriculares y del micrófono.
      </Text>
    </View>
  );
}

function Dato({ valor, texto }: { valor: string; texto: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoValor}>{valor}</Text>
      <Text style={styles.datoTexto}>{texto}</Text>
    </View>
  );
}

// Each hit as a dot: center line = on the click, green band = on time, up = late, down = early.
function Grafico({ desvios }: { desvios: number[] }) {
  const w = 320;
  const h = 100;
  const y = (ms: number) => h / 2 - (Math.max(-80, Math.min(80, ms)) / 80) * (h / 2 - 6);
  const paso = w / 32;
  return (
    <View style={styles.grafico} accessibilityLabel="Golpes antes y después del click">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={110}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          x={0}
          y={y(A_TIEMPO_MS)}
          width={w}
          height={y(-A_TIEMPO_MS) - y(A_TIEMPO_MS)}
          fill={colors.success}
          fillOpacity={0.16}
        />
        <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke={colors.success} strokeWidth={1} />
        {desvios.map((d, i) => (
          <circle
            key={i}
            cx={(i + 0.5) * paso}
            cy={y(d)}
            r={4}
            fill={Math.abs(d) <= A_TIEMPO_MS ? colors.success : colors.primary}
          />
        ))}
      </svg>
      <View style={styles.ejes}>
        <Text style={styles.datoTexto}>↑ tarde</Text>
        <Text style={styles.datoTexto}>↓ apurado</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  filas: {
    gap: 10,
  },
  pulsos: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
  pulso: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.muted,
  },
  pulsoActivo: {
    backgroundColor: colors.primary,
  },
  lectura: {
    alignItems: "center",
    gap: 2,
  },
  numero: {
    fontFamily: fonts.display,
    fontSize: 52,
    lineHeight: 56,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  justo: {
    color: colors.success,
  },
  consejo: {
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  grafico: {
    gap: 4,
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  ejes: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  dato: {
    minWidth: 90,
  },
  datoValor: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    color: colors.primary,
  },
  datoTexto: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
});
