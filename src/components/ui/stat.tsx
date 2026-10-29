import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react";
import { colors, fonts, radius, shared } from "@/lib/theme";

// KPI tile: icon, small uppercase label and a big value.
export function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <View style={[shared.panel, styles.stat]}>
      <Icon size={18} color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flexGrow: 1,
    flexBasis: 160,
    borderRadius: radius["2xl"],
    padding: 18,
  },
  label: {
    marginTop: 10,
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.foreground,
  },
});
