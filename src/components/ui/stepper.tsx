import { Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react";
import { colors, fonts, radius } from "@/lib/theme";

// − value + for small numbers (minutes, BPM, capo).
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  label: string;
}) {
  return (
    <View style={styles.row} accessibilityLabel={label}>
      <Pressable
        accessibilityRole="button"
        hitSlop={5}
        accessibilityLabel={`Bajar ${label}`}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.button, value <= min && styles.disabled]}
      >
        <Minus size={14} color={colors.foreground} />
      </Pressable>
      <Text style={styles.value}>
        {value}
        {suffix ? <Text style={styles.suffix}> {suffix}</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={5}
        accessibilityLabel={`Subir ${label}`}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.button, value >= max && styles.disabled]}
      >
        <Plus size={14} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  button: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  disabled: {
    opacity: 0.4,
  },
  value: {
    minWidth: 44,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  suffix: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
