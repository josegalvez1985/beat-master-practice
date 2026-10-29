import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/lib/theme";

// Pill-style tab switcher (e.g. Semana | Mes | Año).
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.track}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            aria-selected={active}
            onPress={() => onChange(option.value)}
            style={[styles.option, active && styles.active]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignSelf: "flex-start",
    padding: 4,
    gap: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  option: {
    paddingHorizontal: 14,
    height: 30,
    justifyContent: "center",
    borderRadius: radius.md,
  },
  active: {
    backgroundColor: colors.primary,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  activeLabel: {
    color: colors.primaryForeground,
  },
});
