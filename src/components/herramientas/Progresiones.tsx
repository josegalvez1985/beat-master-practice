import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Play, Square } from "lucide-react";
import { DiagramaAcorde } from "@/components/plan/DiagramaAcorde";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { notasDeDigitacion, notasDelAcorde, type InstrumentoAcordes } from "@/lib/acordes";
import { contextoDeAudio, tocarNota } from "@/lib/audio";
import type { InstrumentId } from "@/lib/instruments";
import { frecuenciaDe } from "@/lib/notas";
import {
  FORMAS,
  TONOS,
  acordesDe,
  bajoDe,
  forma as formaDe,
  nombreTono,
  type FormaId,
} from "@/lib/progresiones";
import { colors, fonts, radius } from "@/lib/theme";

// Polca, guarania and galopa: the chords of each measure in the chosen key and a bass + strum
// accompaniment to play or sing along (scheduled on the audio clock so the tempo is exact).
export function Progresiones({ instrumento }: { instrumento: InstrumentId }) {
  const [formaId, setFormaId] = useState<FormaId>("polca");
  const forma = formaDe(formaId);
  const [tonica, setTonica] = useState(TONOS[forma.modo][0]!);
  const [bpm, setBpm] = useState(forma.bpm);
  const [sonando, setSonando] = useState(false);
  const acordes = acordesDe(forma, tonica);
  const compas = useAcompanamiento({
    activo: sonando,
    acordes,
    patron: forma.patron,
    bpm,
    instrumento,
  });
  const cuerdas: InstrumentoAcordes | null =
    instrumento === "guitarra" || instrumento === "ukelele" || instrumento === "requinto"
      ? instrumento
      : null;
  const distintos = [...new Set(acordes)];

  const elegirForma = (id: FormaId) => {
    const nueva = formaDe(id);
    setFormaId(id);
    setTonica(TONOS[nueva.modo][0]!);
    setBpm(nueva.bpm);
  };

  return (
    <View style={styles.wrap}>
      <Opciones
        opciones={FORMAS.map((f) => ({ value: f.id, label: f.nombre }))}
        valor={formaId}
        onChange={elegirForma}
      />
      <View style={styles.consejo}>
        <Text style={styles.texto}>{forma.descripcion}</Text>
        <Text style={styles.ayuda}>{forma.consejo}</Text>
      </View>

      <Opciones
        chico
        opciones={TONOS[forma.modo].map((t) => ({
          value: String(t),
          label: nombreTono(t, forma.modo),
        }))}
        valor={String(tonica)}
        onChange={(valor) => setTonica(Number(valor))}
      />

      <View style={styles.compases} accessibilityLabel="Acordes por compás">
        {acordes.map((acorde, i) => (
          <View key={i} style={[styles.compas, i === compas && styles.compasActual]}>
            <Text style={styles.numero}>{i + 1}</Text>
            <Text style={styles.acorde}>{acorde}</Text>
          </View>
        ))}
      </View>

      {cuerdas ? (
        <View style={styles.diagramas}>
          {distintos.map((acorde) => (
            <DiagramaAcorde key={acorde} nombre={acorde} instrumento={cuerdas} ancho={76} />
          ))}
        </View>
      ) : null}

      <View style={styles.controles}>
        <Stepper
          label="tempo"
          value={bpm}
          onChange={setBpm}
          min={40}
          max={240}
          step={4}
          suffix="BPM"
        />
        <Button onPress={() => setSonando((s) => !s)}>
          {sonando ? (
            <Square size={14} color={buttonForeground()} />
          ) : (
            <Play size={16} color={buttonForeground()} />
          )}
          {sonando ? "Detener" : "Acompañamiento"}
        </Button>
      </View>
      <Text style={styles.ayuda}>
        Empieza más lento (baja el tempo) y súbelo cuando los cambios salgan limpios.
      </Text>
    </View>
  );
}

// Plays the form in a loop: bass on "b", the chord on "a" (eighth notes). Returns the measure
// sounding now, or -1 when stopped.
function useAcompanamiento({
  activo,
  acordes,
  patron,
  bpm,
  instrumento,
}: {
  activo: boolean;
  acordes: string[];
  patron: ("b" | "a" | "-")[];
  bpm: number;
  instrumento: InstrumentId;
}) {
  const [actual, setActual] = useState(-1);
  const config = useRef({ acordes, patron, bpm, instrumento });
  useLayoutEffect(() => {
    config.current = { acordes, patron, bpm, instrumento };
  });

  useEffect(() => {
    if (!activo) return;
    const ctx = contextoDeAudio();
    let paso = 0;
    let siguiente = ctx.currentTime + 0.08;
    const visuales: number[] = [];
    const programar = () => {
      while (siguiente < ctx.currentTime + 0.15) {
        const { acordes: lista, patron: ritmo, bpm: tempo, instrumento: inst } = config.current;
        const compas = Math.floor(paso / ritmo.length) % lista.length;
        const golpe = ritmo[paso % ritmo.length];
        const acorde = lista[compas]!;
        const retraso = Math.max(0, siguiente - ctx.currentTime);
        if (golpe === "b")
          tocarNota(frecuenciaDe(bajoDe(acorde)), { retraso, duracion: 0.7, volumen: 0.35 });
        if (golpe === "a") {
          const cuerdas = inst === "guitarra" || inst === "requinto" ? inst : null;
          const midis =
            (cuerdas && notasDeDigitacion(acorde, cuerdas)?.slice(-4)) ||
            notasDelAcorde(acorde)?.midis ||
            [];
          midis.forEach((m, k) =>
            tocarNota(frecuenciaDe(m), {
              retraso: retraso + k * 0.012,
              duracion: 0.3,
              volumen: 0.12,
            }),
          );
        }
        if (paso % ritmo.length === 0)
          visuales.push(window.setTimeout(() => setActual(compas), retraso * 1000));
        if (visuales.length > 64) visuales.splice(0, 32);
        siguiente += 60 / tempo / 2;
        paso += 1;
      }
    };
    programar();
    const timer = window.setInterval(programar, 25);
    return () => {
      window.clearInterval(timer);
      visuales.forEach((id) => window.clearTimeout(id));
      setActual(-1);
    };
  }, [activo]);

  return activo ? actual : -1;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  consejo: {
    gap: 4,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  compases: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  compas: {
    flexBasis: "22%",
    flexGrow: 1,
    minWidth: 64,
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  // What is sounding: solid amber edge and tint.
  compasActual: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  numero: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  acorde: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.foreground,
  },
  diagramas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  controles: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
});
