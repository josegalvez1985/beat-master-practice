import { LinearGradient } from "@/components/ui/linear-gradient";
import { StyleSheet } from "react-native";
import { gradients } from "@/lib/theme";

// Amber light falling from the top of the screen.
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
