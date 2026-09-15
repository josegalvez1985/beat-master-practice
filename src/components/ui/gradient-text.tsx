import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { gradients } from "@/lib/theme";

// Native counterpart of the web `text-amber-gradient` utility.
export function GradientText({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  if (Platform.OS === "web") {
    return <Text style={[style, { color: gradients.amber[0] }]}>{children}</Text>;
  }

  return (
    <MaskedView style={styles.mask} maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={gradients.amber} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={[style, styles.hidden]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  mask: {
    alignSelf: "flex-start",
  },
  hidden: {
    opacity: 0,
  },
});
