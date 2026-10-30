import { Text, type StyleProp, type TextStyle } from "react-native";
import { colors } from "@/lib/theme";

// Amber accent text (brighter on dark, deeper on light).
export function GradientText({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[style, { color: colors.highlight }]}>{children}</Text>;
}
