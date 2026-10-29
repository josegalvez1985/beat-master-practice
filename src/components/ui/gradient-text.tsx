import { Text, type StyleProp, type TextStyle } from "react-native";
import { gradients } from "@/lib/theme";

// Amber accent text (first stop of the amber gradient).
export function GradientText({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[style, { color: gradients.amber[0] }]}>{children}</Text>;
}
