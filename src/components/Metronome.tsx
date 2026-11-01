import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp, Hand, Minus, Pause, Play, Plus } from "lucide-react";
import { Fila, Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Stepper } from "@/components/ui/stepper";
import { useMetronomo } from "@/lib/metronomo";
import { colors, fonts, radius, shared } from "@/lib/theme";

const MIN_BPM = 40;
const MAX_BPM = 220;

// Beats per bar; 6/8 counts two dotted-quarter beats of three eighths each.
const compases = [
  { value: "2/4", label: "2/4", pulsos: 2, subdivision: 0 },
  { value: "3/4", label: "3/4", pulsos: 3, subdivision: 0 },
  { value: "4/4", label: "4/4", pulsos: 4, subdivision: 0 },
  { value: "6/8", label: "6/8", pulsos: 2, subdivision: 3 },
] as const;
type Compas = (typeof compases)[number]["value"];

const subdivisiones = [
  { value: "1", label: "Negras" },
  { value: "2", label: "Corcheas" },
  { value: "3", label: "Tresillos" },
  { value: "4", label: "Semicorcheas" },
] as const;
type Subdivision = (typeof subdivisiones)[number]["value"];

const limitar = (bpm: number) => Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));

// Audible metronome (accent on beat one). `bpmInicial` lets a class suggest the tempo;
// `completo` shows the extra options open (bar, subdivisions, tap tempo, tempo trainer).
export function Metronome({
  bpmInicial = 90,
  completo = false,
  enPanel = true,
}: {
  bpmInicial?: number;
  completo?: boolean;
  enPanel?: boolean;
}) {
  const [bpm, setBpm] = useState(bpmInicial);
  const [playing, setPlaying] = useState(false);
  const [opciones, setOpciones] = useState(completo);
  const [compas, setCompas] = useState<Compas>("4/4");
  const [subdivision, setSubdivision] = useState<Subdivision>("1");
  // Tempo trainer: +paso BPM every `cada` bars, up to `hasta`.
  const [entrenador, setEntrenador] = useState(false);
  const [paso, setPaso] = useState(5);
  const [cada, setCada] = useState(4);
  const [hasta, setHasta] = useState(120);
  // Gap click: the click plays `conClick` bars and goes quiet for `sinClick` (inner time).
  const [hueco, setHueco] = useState(false);
  const [conClick, setConClick] = useState(2);
  const [sinClick, setSinClick] = useState(2);
  // Backbeat: only beats 2 and 4 (4/4), the way drummers and bands feel it.
  const [contratiempo, setContratiempo] = useState(false);
  // Bars already scheduled (sounds are scheduled a little ahead of what is shown).
  const programados = useRef(-1);

  const medida = compases.find((c) => c.value === compas)!;
  const porPulso = medida.subdivision || Number(subdivision);
  const slots = medida.pulsos * porPulso;
  const slot = useMetronomo({
    activo: playing,
    bpm,
    slots,
    porPulso,
    sonidoDe: (s) => {
      if (s === 0) programados.current += 1;
      if (hueco && programados.current % (conClick + sinClick) >= conClick) return null;
      if (contratiempo && compas === "4/4") {
        const beat = s / porPulso;
        return beat === 1 || beat === 3 ? "acento" : null;
      }
      return s === 0 ? "acento" : s % porPulso === 0 ? "pulso" : "subdivision";
    },
  });
  // Bar on screen (counted when the cycle starts again), for the "no click" notice.
  const [compasVisible, setCompasVisible] = useState(0);
  const callado = playing && hueco && compasVisible % (conClick + sinClick) >= conClick;
  const pulso = slot < 0 ? -1 : Math.floor(slot / porPulso);

  // Bars played, counted when the cycle goes back to the first slot.
  const anterior = useRef(-1);
  const compasesTocados = useRef(0);
  useEffect(() => {
    if (!playing) {
      anterior.current = -1;
      compasesTocados.current = 0;
      programados.current = -1;
      return;
    }
    if (slot === 0 && anterior.current > 0) {
      compasesTocados.current += 1;
      setCompasVisible(compasesTocados.current);
      if (entrenador && compasesTocados.current % cada === 0)
        setBpm((v) => (v < hasta ? Math.min(hasta, v + paso) : v));
    }
    anterior.current = slot;
  }, [slot, playing, entrenador, cada, hasta, paso]);

  // Tap tempo: the average of the last taps; a pause of 2 s starts over.
  const toques = useRef<number[]>([]);
  const marcar = () => {
    const ahora = performance.now();
    const previos = toques.current.filter((t) => ahora - t < 2000);
    toques.current = [...previos.slice(-4), ahora];
    if (toques.current.length < 2) return;
    const intervalos = toques.current.slice(1).map((t, i) => t - toques.current[i]!);
    setBpm(limitar(60000 / (intervalos.reduce((a, b) => a + b, 0) / intervalos.length)));
  };

  return (
    <View style={[enPanel && [shared.panel, styles.card]]}>
      {enPanel ? (
        <View style={styles.header}>
          <Text style={styles.label}>Metrónomo</Text>
          <Text style={styles.bpm}>{bpm} BPM</Text>
        </View>
      ) : (
        <Text style={[styles.bpm, styles.bpmGrande]}>{bpm} BPM</Text>
      )}

      <View style={styles.dots}>
        {Array.from({ length: medida.pulsos }, (_, i) => (
          <BeatDot key={i} active={playing && pulso === i} />
        ))}
      </View>
      {callado ? (
        <Text accessibilityLiveRegion="polite" style={styles.callado}>
          Sin click: mantén el tiempo
        </Text>
      ) : null}

      <View style={styles.controls}>
        <Button
          variant="secondary"
          size="icon"
          accessibilityLabel="Bajar tempo"
          onPress={() => setBpm((v) => limitar(v - 5))}
        >
          <Minus size={16} color={buttonForeground("secondary")} />
        </Button>
        <Button
          style={styles.toggle}
          onPress={() => {
            if (!playing) setCompasVisible(0);
            setPlaying(!playing);
          }}
        >
          {playing ? (
            <Pause size={16} color={buttonForeground()} />
          ) : (
            <Play size={16} color={buttonForeground()} />
          )}
          {playing ? "Detener" : "Iniciar práctica"}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          accessibilityLabel="Subir tempo"
          onPress={() => setBpm((v) => limitar(v + 5))}
        >
          <Plus size={16} color={buttonForeground("secondary")} />
        </Button>
      </View>

      {completo ? null : (
        <Button
          variant="secondary"
          size="sm"
          style={styles.mas}
          onPress={() => setOpciones((v) => !v)}
        >
          {opciones ? (
            <ChevronUp size={14} color={buttonForeground("secondary")} />
          ) : (
            <ChevronDown size={14} color={buttonForeground("secondary")} />
          )}
          {opciones ? "Menos opciones" : "Más opciones"}
        </Button>
      )}

      {opciones ? (
        <View style={styles.opciones}>
          <Fila label="Compás">
            <Opciones chico opciones={compases} valor={compas} onChange={setCompas} />
          </Fila>
          {medida.subdivision ? null : (
            <Fila label="Subdivisión">
              <Opciones
                chico
                opciones={subdivisiones}
                valor={subdivision}
                onChange={setSubdivision}
              />
            </Fila>
          )}
          <Fila label="Tempo">
            <View style={styles.fila}>
              <Stepper
                label="tempo"
                value={bpm}
                min={MIN_BPM}
                max={MAX_BPM}
                suffix="BPM"
                onChange={setBpm}
              />
              <Button variant="secondary" size="sm" onPress={marcar}>
                <Hand size={14} color={buttonForeground("secondary")} />
                Marcar el tempo
              </Button>
            </View>
          </Fila>
          <View style={styles.entrenador}>
            <View style={styles.fila}>
              <Checkbox
                checked={hueco}
                onCheckedChange={setHueco}
                accessibilityLabel="Click que se calla"
              />
              <Text style={styles.texto} onPress={() => setHueco(!hueco)}>
                Click que se calla (tiempo interno)
              </Text>
            </View>
            {hueco ? (
              <View style={styles.fila}>
                <Text style={styles.texto}>Suena</Text>
                <Stepper
                  label="compases con click"
                  value={conClick}
                  min={1}
                  max={8}
                  onChange={setConClick}
                />
                <Text style={styles.texto}>y se calla</Text>
                <Stepper
                  label="compases sin click"
                  value={sinClick}
                  min={1}
                  max={8}
                  onChange={setSinClick}
                />
                <Text style={styles.texto}>compases</Text>
              </View>
            ) : null}
            {compas === "4/4" ? (
              <View style={styles.fila}>
                <Checkbox
                  checked={contratiempo}
                  onCheckedChange={setContratiempo}
                  accessibilityLabel="Click solo en 2 y 4"
                />
                <Text style={styles.texto} onPress={() => setContratiempo(!contratiempo)}>
                  Click solo en 2 y 4
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.entrenador}>
            <View style={styles.fila}>
              <Checkbox
                checked={entrenador}
                onCheckedChange={setEntrenador}
                accessibilityLabel="Subir el tempo solo"
              />
              <Text style={styles.texto} onPress={() => setEntrenador(!entrenador)}>
                Subir el tempo solo
              </Text>
            </View>
            {entrenador ? (
              <View style={styles.fila}>
                <Stepper label="BPM por paso" value={paso} min={1} max={20} onChange={setPaso} />
                <Text style={styles.texto}>BPM cada</Text>
                <Stepper label="compases" value={cada} min={1} max={16} onChange={setCada} />
                <Text style={styles.texto}>compases, hasta</Text>
                <Stepper
                  label="tempo final"
                  value={hasta}
                  min={MIN_BPM}
                  max={MAX_BPM}
                  step={5}
                  onChange={setHasta}
                />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Pulsing dot for the active beat.
function BeatDot({ active }: { active: boolean }) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      pulse.setValue(0);
      return;
    }
    const timing = (toValue: number) =>
      Animated.timing(pulse, {
        toValue,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      });
    const loop = Animated.loop(Animated.sequence([timing(1), timing(0)]));
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  return (
    <Animated.View
      style={[
        styles.dot,
        active && {
          backgroundColor: colors.primary,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius["2xl"],
    padding: 24,
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
  bpm: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontVariant: ["tabular-nums"],
    color: colors.primary,
  },
  bpmGrande: {
    fontSize: 56,
    lineHeight: 60,
    textAlign: "center",
  },
  dots: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.muted,
  },
  controls: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggle: {
    flex: 1,
  },
  mas: {
    marginTop: 16,
    alignSelf: "center",
  },
  opciones: {
    marginTop: 20,
    gap: 14,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  entrenador: {
    gap: 10,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.foreground,
  },
  callado: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.highlight,
  },
});
