import { LinearGradient } from "@/components/ui/linear-gradient";
import { StyleSheet } from "react-native";
import { gradients } from "@/lib/theme";

// Soft amber light falling from the top of the screen (only the first few hundred pixels).
export function StageGlow() {
  return <LinearGradient colors={gradients.stage} locations={[0, 1]} style={styles.glow} />;
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
    pointerEvents: "none",
  },
});
