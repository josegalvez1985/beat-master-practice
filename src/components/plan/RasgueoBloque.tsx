import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowDown, ArrowUp, Pause, Play, X } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";
import { useMetronomo, type Sonido } from "@/lib/metronomo";
import { golpesPorCompas, type Bloque, type Compas, type Golpe } from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type Rasgueo = Extract<Bloque, { tipo: "rasgueo" }>;

const SIGUIENTE: Record<Golpe, Golpe> = { D: "U", U: "x", x: "-", "-": "D" };
const SONIDO: Record<Golpe, Sonido | null> = { D: "abajo", U: "arriba", x: "apagado", "-": null };
const CONTEO: Record<Compas, string[]> = {
  "4/4": ["1", "y", "2", "y", "3", "y", "4", "y"],
  "3/4": ["1", "y", "2", "y", "3", "y"],
  "6/8": ["1", "2", "3", "4", "5", "6"],
};
// Slots per beat: eighth notes in 4/4 and 3/4; in 6/8 the beat is the dotted quarter.
const POR_PULSO: Record<Compas, number> = { "4/4": 2, "3/4": 2, "6/8": 3 };

// Strumming pattern on eighth notes: tap a slot to cycle ↓ → ↑ → muted → rest.
// Play sounds it (strums + click) and lights the slot being played.
export function RasgueoBloque({
  bloque,
  editable,
  onChange,
}: {
  bloque: Rasgueo;
  editable: boolean;
  onChange: (bloque: Rasgueo) => void;
}) {
  const [sonando, setSonando] = useState(false);
  const porPulso = POR_PULSO[bloque.compas];
  const actual = useMetronomo({
    activo: sonando,
    bpm: bloque.bpm,
    slots: bloque.golpes.length,
    porPulso,
    sonidoDe: (slot) => SONIDO[bloque.golpes[slot] ?? "-"],
  });

  const cambiarCompas = (compas: Compas) => {
    const total = golpesPorCompas[compas];
    const golpes = Array.from({ length: total }, (_, i) => bloque.golpes[i] ?? "-");
    onChange({ ...bloque, compas, golpes });
  };

  return (
    <View style={styles.wrap}>
      {editable ? (
        <View style={styles.opciones}>
          <View style={styles.compases}>
            {(Object.keys(golpesPorCompas) as Compas[]).map((compas) => (
              <Pressable
                key={compas}
                accessibilityRole="radio"
                aria-checked={bloque.compas === compas}
                onPress={() => cambiarCompas(compas)}
                style={[styles.compas, bloque.compas === compas && styles.compasActivo]}
              >
                <Text
                  style={[styles.compasText, bloque.compas === compas && styles.compasTextActivo]}
                >
                  {compas}
                </Text>
              </Pressable>
            ))}
          </View>
          <Stepper
            label="tempo"
            value={bloque.bpm}
            min={40}
            max={220}
            step={5}
            suffix="BPM"
            onChange={(bpm) => onChange({ ...bloque, bpm })}
          />
        </View>
      ) : null}

      <View style={styles.patron}>
        {bloque.golpes.map((golpe, slot) => {
          const Icono =
            golpe === "D" ? ArrowDown : golpe === "U" ? ArrowUp : golpe === "x" ? X : null;
          const encendido = actual === slot;
          return (
            <View key={slot} style={styles.columna}>
              <Pressable
                accessibilityRole={editable ? "button" : undefined}
                accessibilityLabel={`Tiempo ${CONTEO[bloque.compas][slot]}: ${golpe === "D" ? "abajo" : golpe === "U" ? "arriba" : golpe === "x" ? "apagado" : "silencio"}`}
                disabled={!editable}
                onPress={() =>
                  onChange({
                    ...bloque,
                    golpes: bloque.golpes.map((g, i) => (i === slot ? SIGUIENTE[g] : g)),
                  })
                }
                style={[
                  styles.golpe,
                  slot % porPulso === 0 && styles.pulso,
                  golpe === "-" && styles.vacio,
                  encendido && styles.encendido,
                ]}
              >
                {Icono ? (
                  <Icono
                    size={22}
                    strokeWidth={2.6}
                    color={encendido ? colors.primaryForeground : colors.foreground}
                  />
                ) : (
                  <Text style={styles.silencio}>·</Text>
                )}
              </Pressable>
              <Text style={[styles.conteo, slot % porPulso === 0 && styles.conteoPulso]}>
                {CONTEO[bloque.compas][slot]}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.pie}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sonando ? "Detener rasgueo" : "Escuchar rasgueo"}
          onPress={() => setSonando(!sonando)}
          style={styles.play}
        >
          {sonando ? (
            <Pause size={16} color={colors.primaryForeground} />
          ) : (
            <Play size={16} color={colors.primaryForeground} />
          )}
          <Text style={styles.playText}>{sonando ? "Detener" : "Escuchar"}</Text>
        </Pressable>
        <Text style={styles.info}>
          {bloque.compas} · {bloque.bpm} BPM
          {editable ? " · Toca un golpe para cambiarlo: ↓ ↑ ✕ ·" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  opciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  compases: {
    flexDirection: "row",
    gap: 4,
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  compas: {
    paddingHorizontal: 12,
    height: 28,
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  compasActivo: {
    backgroundColor: colors.selected,
    borderColor: colors.primary,
  },
  compasText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  compasTextActivo: {
    color: colors.foreground,
  },
  patron: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  columna: {
    alignItems: "center",
    gap: 4,
  },
  golpe: {
    width: 46,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  pulso: {
    borderColor: colors.primary,
  },
  vacio: {
    backgroundColor: "transparent",
  },
  encendido: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.08 }],
  },
  silencio: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.mutedForeground,
  },
  conteo: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  conteoPulso: {
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  pie: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
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
  info: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
