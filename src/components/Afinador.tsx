import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  AFINADO,
  LECTURAS_HISTORIAL,
  afinable,
  afinacionesDelAfinador,
  configDe,
  lectura as leer,
  useAfinador,
} from "@/lib/afinador";
import { contextoDeAudio, sostenerNota, tocarNota } from "@/lib/audio";
import { instrumento as instrumentoDe, type InstrumentId } from "@/lib/instruments";
import { LA4, frecuenciaDe, nota } from "@/lib/notas";
import { colors, fonts, radius, shared } from "@/lib/theme";

// Microphone tuner for strings, winds and voice. `afinacion` preselects a tuning by its label
// (the class's ficha); `enPanel` false = inside a dialog or a page, without its own card.
export function Afinador({
  instrumentos,
  afinacion: afinacionInicial,
  enPanel = true,
}: {
  instrumentos: InstrumentId[];
  afinacion?: string;
  enPanel?: boolean;
}) {
  const [elegido, setElegido] = useState(instrumentos[0]!);
  const instrumento = instrumentos.includes(elegido) ? elegido : instrumentos[0]!;
  const config = configDe(instrumento);
  const afinaciones = afinacionesDelAfinador(instrumento);
  const [etiqueta, setEtiqueta] = useState(afinacionInicial);
  const afinacion = afinaciones.find((a) => a.label === etiqueta) ?? afinaciones[0];
  const cuerdas = afinacion?.cuerdas ?? [];
  const transporte = afinacion?.transporte ?? 0;
  // A tapped string stays as the target; null = the nearest string (automatic).
  const [fija, setFija] = useState<number | null>(null);
  // Written note of the steady reference tone in chromatic mode.
  const [referencia, setReferencia] = useState(config.referencia);
  const [sosteniendo, setSosteniendo] = useState(false);
  const { estado, error, frecuencia, historial, iniciar, parar } = useAfinador(instrumento);
  const actual = frecuencia ? leer(frecuencia, cuerdas, fija, transporte) : null;
  const afinado = !!actual && Math.abs(actual.cents) <= AFINADO;
  const desvio = actual ? Math.max(-50, Math.min(50, actual.cents)) : 0;

  const frecuenciaReferencia = cuerdas.length
    ? fija === null
      ? null
      : cuerdas[fija]!.frecuencia
    : frecuenciaDe(referencia - transporte);

  useEffect(() => {
    if (!sosteniendo || !frecuenciaReferencia) return;
    return sostenerNota(frecuenciaReferencia);
  }, [sosteniendo, frecuenciaReferencia]);

  const cambiarInstrumento = (valor: InstrumentId) => {
    setElegido(valor);
    setEtiqueta(undefined);
    setFija(null);
    setReferencia(configDe(valor).referencia);
    setSosteniendo(false);
  };

  const mensaje =
    estado === "apagado"
      ? cuerdas.length
        ? "Activa el micrófono y toca una cuerda."
        : "Activa el micrófono y toca o canta una nota."
      : estado === "pidiendo"
        ? "Permite el uso del micrófono…"
        : !actual
          ? cuerdas.length
            ? "Toca una cuerda al aire."
            : "Toca o canta una nota larga."
          : afinado
            ? "¡Afinado!"
            : actual.cents < 0
              ? `${config.ajuste[0]} (${Math.round(actual.cents)} cents)`
              : `${config.ajuste[1]} (+${Math.round(actual.cents)} cents)`;

  return (
    <View style={[enPanel && [shared.panel, styles.card], styles.cuerpo]}>
      {enPanel ? (
        <View style={styles.header}>
          <Text style={styles.label}>Afinador</Text>
          <Text style={styles.referencia}>La4 = {LA4} Hz</Text>
        </View>
      ) : null}

      {instrumentos.length > 1 ? (
        <Opciones
          chico
          opciones={instrumentos.map((id) => ({ value: id, label: instrumentoDe(id).name }))}
          valor={instrumento}
          onChange={cambiarInstrumento}
        />
      ) : null}
      {afinaciones.length > 1 && afinacion ? (
        <Opciones
          chico
          opciones={afinaciones.map((a) => ({ value: a.label, label: a.label }))}
          valor={afinacion.label}
          onChange={(valor) => {
            setEtiqueta(valor);
            setFija(null);
          }}
        />
      ) : null}

      <View style={styles.lectura}>
        <Text style={[styles.nota, !actual && styles.notaVacia, afinado && styles.notaAfinada]}>
          {actual ? actual.objetivo.nombre : "—"}
        </Text>
        <Text style={styles.detalle}>
          {actual && frecuencia
            ? `${actual.objetivo.cifrado} · ${frecuencia.toFixed(1).replace(".", ",")} Hz`
            : cuerdas.length
              ? afinacion?.label
              : transporte
                ? `${afinacion?.label}: notas como se escriben`
                : "Modo cromático: cualquier nota"}
        </Text>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Desafinación"
        accessibilityValue={{ min: -50, max: 50, now: Math.round(desvio) }}
        style={styles.medidor}
      >
        <View style={styles.centro} />
        {actual ? (
          <View
            style={[
              styles.aguja,
              { left: `${50 + desvio}%` },
              afinado && { backgroundColor: colors.success },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.escala}>
        <Text style={styles.escalaTexto}>−50</Text>
        <Text style={styles.escalaTexto}>0</Text>
        <Text style={styles.escalaTexto}>+50</Text>
      </View>
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.mensaje, afinado && styles.mensajeAfinado]}
      >
        {mensaje}
      </Text>

      {config.historial && estado === "escuchando" ? (
        <Historial
          desvios={historial.map((hz) => (hz ? leer(hz, cuerdas, fija, transporte).cents : null))}
        />
      ) : null}

      {cuerdas.length ? (
        <View style={styles.cuerdas}>
          <Pressable
            accessibilityRole="radio"
            aria-checked={fija === null}
            onPress={() => setFija(null)}
            style={[styles.cuerda, fija === null && styles.cuerdaElegida]}
          >
            <Text style={styles.cuerdaNombre}>Auto</Text>
          </Pressable>
          {cuerdas.map((cuerda, i) => {
            const elegida = fija === i;
            const sonando = actual?.cuerda === i;
            return (
              <Pressable
                key={`${cuerda.cifrado}-${i}`}
                accessibilityRole="radio"
                aria-checked={elegida}
                accessibilityLabel={`Cuerda ${cuerdas.length - i}: ${cuerda.nombre} (${cuerda.cifrado}). Toca para escucharla.`}
                onPress={() => {
                  setFija(elegida ? null : i);
                  if (!elegida && !sosteniendo) tocarNota(cuerda.frecuencia);
                }}
                style={[styles.cuerda, (elegida || sonando) && styles.cuerdaElegida]}
              >
                <Text style={styles.cuerdaNombre}>{cuerda.nombre}</Text>
                <Text style={styles.cuerdaCifrado}>{cuerda.cifrado}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.referenciaFila}>
          <Text style={styles.referenciaTexto}>Nota de referencia</Text>
          <View style={styles.selectorNota}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bajar medio tono"
              onPress={() => setReferencia((m) => Math.max(28, m - 1))}
              style={styles.paso}
            >
              <Text style={styles.pasoTexto}>−</Text>
            </Pressable>
            <Text style={styles.notaReferencia}>
              {nota(referencia).nombre}
              <Text style={styles.cuerdaCifrado}> {nota(referencia).cifrado}</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Subir medio tono"
              onPress={() => setReferencia((m) => Math.min(96, m + 1))}
              style={styles.paso}
            >
              <Text style={styles.pasoTexto}>+</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.acciones}>
        {estado === "apagado" ? (
          <Button style={styles.accion} onPress={() => void iniciar()}>
            <Mic size={16} color={buttonForeground()} />
            Afinar con el micrófono
          </Button>
        ) : (
          <Button variant="secondary" style={styles.accion} onPress={parar}>
            <MicOff size={16} color={buttonForeground("secondary")} />
            Detener
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={!frecuenciaReferencia}
          accessibilityLabel={sosteniendo ? "Detener la nota de referencia" : "Sostener la nota"}
          onPress={() => {
            contextoDeAudio();
            setSosteniendo((v) => !v);
          }}
        >
          {sosteniendo ? (
            <VolumeX size={16} color={buttonForeground("secondary")} />
          ) : (
            <Volume2 size={16} color={buttonForeground("secondary")} />
          )}
          {sosteniendo ? "Callar" : "Sostener nota"}
        </Button>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.privacidad}>
        {cuerdas.length
          ? "Toca una cuerda de la lista para escuchar su nota; elígela para sostenerla. "
          : "Sostén la nota de referencia para afinar o cantar contra ella. "}
        Con la nota sostenida, usa auriculares para que el micrófono no la escuche. El sonido se
        analiza en tu dispositivo: no se graba ni se envía.
      </Text>
    </View>
  );
}

// The last 3 seconds of pitch: a line around the center (in tune) with the ±5 cents band.
function Historial({ desvios }: { desvios: (number | null)[] }) {
  const alto = 40;
  const y = (c: number) => alto / 2 - (Math.max(-50, Math.min(50, c)) / 50) * (alto / 2 - 2);
  const tramos: string[] = [];
  let tramo: string[] = [];
  const inicio = LECTURAS_HISTORIAL - desvios.length;
  desvios.forEach((c, i) => {
    if (c === null) {
      if (tramo.length > 1) tramos.push(tramo.join(" "));
      tramo = [];
    } else tramo.push(`${inicio + i},${y(c).toFixed(1)}`);
  });
  if (tramo.length > 1) tramos.push(tramo.join(" "));

  return (
    <View accessibilityLabel="Afinación en los últimos segundos" style={styles.historial}>
      <svg
        viewBox={`0 0 ${LECTURAS_HISTORIAL - 1} ${alto}`}
        preserveAspectRatio="none"
        width="100%"
        height={64}
        aria-hidden="true"
      >
        <rect
          x={0}
          y={y(AFINADO)}
          width={LECTURAS_HISTORIAL}
          height={y(-AFINADO) - y(AFINADO)}
          fill={colors.success}
          fillOpacity={0.18}
        />
        <line
          x1={0}
          x2={LECTURAS_HISTORIAL}
          y1={alto / 2}
          y2={alto / 2}
          stroke={colors.success}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {tramos.map((puntos, i) => (
          <polyline
            key={i}
            points={puntos}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </View>
  );
}

// "Afinar" button that opens the tuner for the class's instrument and tuning; nothing for
// instruments the tuner does not cover.
export function BotonAfinador({
  instrumento,
  afinacion,
}: {
  instrumento: InstrumentId;
  afinacion?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  if (!afinable(instrumento)) return null;
  return (
    <>
      <Button variant="secondary" size="sm" onPress={() => setAbierto(true)}>
        <Mic size={14} color={buttonForeground("secondary")} />
        Afinar
      </Button>
      <Dialog
        visible={abierto}
        onClose={() => setAbierto(false)}
        title="Afinador"
        description={`${instrumentoDe(instrumento).name} · La4 = ${LA4} Hz`}
      >
        {/* Unmounted on close, which turns the microphone and the reference tone off. */}
        {abierto ? (
          <View style={styles.dialogo}>
            <Afinador instrumentos={[instrumento]} afinacion={afinacion} enPanel={false} />
          </View>
        ) : null}
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius["2xl"],
    padding: 24,
  },
  cuerpo: {
    gap: 16,
  },
  dialogo: {
    marginTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  referencia: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  lectura: {
    alignItems: "center",
    paddingTop: 8,
  },
  nota: {
    fontFamily: fonts.headingBold,
    fontSize: 56,
    lineHeight: 62,
    color: colors.foreground,
  },
  notaVacia: {
    color: colors.mutedForeground,
  },
  notaAfinada: {
    color: colors.success,
  },
  detalle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    color: colors.mutedForeground,
    textAlign: "center",
  },
  medidor: {
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    justifyContent: "center",
  },
  centro: {
    position: "absolute",
    left: "50%",
    width: 2,
    marginLeft: -1,
    top: 0,
    bottom: 0,
    backgroundColor: colors.success,
  },
  aguja: {
    position: "absolute",
    width: 6,
    marginLeft: -3,
    top: -4,
    bottom: -4,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  escala: {
    marginTop: -10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  escalaTexto: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    color: colors.mutedForeground,
  },
  mensaje: {
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  mensajeAfinado: {
    color: colors.success,
  },
  historial: {
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.muted,
  },
  cuerdas: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  cuerda: {
    minWidth: 48,
    height: 48,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  // Selected: amber edge + soft tint (solid amber is for the main action).
  cuerdaElegida: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  cuerdaNombre: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  cuerdaCifrado: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  referenciaFila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  referenciaTexto: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  selectorNota: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  paso: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  pasoTexto: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.foreground,
  },
  notaReferencia: {
    minWidth: 84,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  accion: {
    flexGrow: 1,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  privacidad: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
});
