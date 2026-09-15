import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, fonts } from "@/lib/theme";

export function Label({ style, ...props }: TextProps) {
  return <Text style={[styles.label, style]} {...props} />;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
});
