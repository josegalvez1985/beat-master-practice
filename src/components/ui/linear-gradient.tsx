import { View, type StyleProp, type ViewStyle } from "react-native";

// Top-to-bottom CSS gradient. `locations` are optional 0–1 stop positions.
export function LinearGradient({
  colors,
  locations,
  style,
}: {
  colors: readonly string[];
  locations?: readonly number[];
  style?: StyleProp<ViewStyle>;
}) {
  const stops = colors.map((color, i) => {
    const at = locations?.[i];
    return at === undefined ? color : `${color} ${at * 100}%`;
  });

  return <View style={[style, { backgroundImage: `linear-gradient(${stops.join(", ")})` }]} />;
}
