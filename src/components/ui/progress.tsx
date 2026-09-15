import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "@/lib/theme";

export function Progress({ value = 0, style }: { value?: number; style?: StyleProp<ViewStyle> }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[styles.track, style]}
    >
      <View style={[styles.indicator, { width: `${clamped}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: 8,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(249, 161, 41, 0.2)",
  },
  indicator: {
    height: "100%",
    backgroundColor: colors.primary,
  },
});
