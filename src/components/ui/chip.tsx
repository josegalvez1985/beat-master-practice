import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react";
import { colors, fonts, radius, shared } from "@/lib/theme";

type ChipProps = {
  label: string;
  icon?: LucideIcon;
  selected?: boolean;
  // Without onPress the chip is a static tag.
  onPress?: () => void;
};

export function Chip({ label, icon: Icon, selected = false, onPress }: ChipProps) {
  const content = (
    <>
      {Icon ? <Icon size={16} color={colors.primary} /> : null}
      <Text style={styles.label}>{label}</Text>
    </>
  );

  if (!onPress) return <View style={[shared.panel, styles.chip]}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [
        shared.panel,
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(249, 161, 41, 0.12)",
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
});
