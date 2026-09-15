import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { gradients } from "@/lib/theme";

// Native counterpart of the web `stage-glow` utility: amber light from the top.
export function StageGlow() {
  return (
    <LinearGradient
      colors={gradients.stage}
      locations={[0, 0.65]}
      style={[StyleSheet.absoluteFill, styles.passthrough]}
    />
  );
}

const styles = StyleSheet.create({
  passthrough: {
    pointerEvents: "none",
  },
});
