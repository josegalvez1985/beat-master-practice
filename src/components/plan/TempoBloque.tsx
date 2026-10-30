import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Pause, Play } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";
import { useMetronomo } from "@/lib/metronomo";
import type { Bloque } from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type Tempo = Extract<Bloque, { tipo: "tempo" }>;

// Tempo ladder: start slow, go up by steps to the goal, with an audible metronome.
export function TempoBloque({
  bloque,
  editable,
  onChange,
}: {
  bloque: Tempo;
  editable: boolean;
  onChange: (bloque: Tempo) => void;
}) {
  const pasos = escalera(bloque);
  const [bpm, setBpm] = useState(bloque.inicio);
  const [sonando, setSonando] = useState(false);
  const actual = useMetronomo({
    activo: sonando,
    bpm,
    slots: 4,
    sonidoDe: (slot) => (slot === 0 ? "acento" : "pulso"),
  });

  return (
    <View style={styles.wrap}>
      {editable ? (
        <View style={styles.config}>
          <Campo label="Empieza en">
            <Stepper
              label="tempo inicial"
              value={bloque.inicio}
              min={30}
              max={bloque.objetivo}
              step={5}
              suffix="BPM"
              onChange={(inicio) => onChange({ ...bloque, inicio })}
            />
          </Campo>
          <Campo label="Objetivo">
            <Stepper
              label="tempo objetivo"
              value={bloque.objetivo}
              min={bloque.inicio}
              max={240}
              step={5}
              suffix="BPM"
              onChange={(objetivo) => onChange({ ...bloque, objetivo })}
            />
          </Campo>
          <Campo label="Subir de a">
            <Stepper
              label="incremento"
              value={bloque.paso}
              min={1}
              max={20}
              suffix="BPM"
              onChange={(paso) => onChange({ ...bloque, paso })}
            />
          </Campo>
        </View>
      ) : null}

      <View style={styles.escalera}>
        {pasos.map((valor) => {
          const elegido = valor === bpm;
          return (
            <Pressable
              key={valor}
              accessibilityRole="radio"
              aria-checked={elegido}
              accessibilityLabel={`${valor} BPM`}
              onPress={() => setBpm(valor)}
              style={[
                styles.paso,
                elegido && styles.pasoElegido,
                valor === bloque.objetivo && styles.pasoObjetivo,
              ]}
            >
              <Text style={[styles.pasoText, elegido && styles.pasoTextElegido]}>{valor}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.metronomo}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sonando ? "Detener metrónomo" : `Practicar a ${bpm} BPM`}
          onPress={() => setSonando(!sonando)}
          style={styles.play}
        >
          {sonando ? (
            <Pause size={16} color={colors.primaryForeground} />
          ) : (
            <Play size={16} color={colors.primaryForeground} />
          )}
          <Text style={styles.playText}>{sonando ? "Detener" : `Practicar a ${bpm} BPM`}</Text>
        </Pressable>
        <View style={styles.pulsos}>
          {[0, 1, 2, 3].map((slot) => (
            <View
              key={slot}
              style={[
                styles.pulso,
                slot === 0 && styles.acento,
                actual === slot && styles.pulsoActivo,
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={styles.info}>
        Cuando salga limpio 3 veces seguidas, sube al siguiente tempo. Meta: {bloque.objetivo} BPM.
      </Text>
    </View>
  );
}

function escalera({ inicio, objetivo, paso }: Tempo) {
  const valores: number[] = [];
  for (let v = inicio; v < objetivo && valores.length < 30; v += Math.max(1, paso)) valores.push(v);
  valores.push(objetivo);
  return valores;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  config: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  campo: {
    gap: 4,
  },
  campoLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  escalera: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  paso: {
    minWidth: 44,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  pasoObjetivo: {
    borderColor: colors.primary,
  },
  pasoElegido: {
    backgroundColor: colors.selected,
    borderColor: colors.primary,
  },
  pasoText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.foreground,
  },
  pasoTextElegido: {
    color: colors.primary,
  },
  metronomo: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
  },
  play: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  playText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primaryForeground,
  },
  pulsos: {
    flexDirection: "row",
    gap: 10,
  },
  pulso: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.muted,
  },
  acento: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pulsoActivo: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.35 }],
  },
  info: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
