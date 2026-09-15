import { useState } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { colors, fonts, radius } from "@/lib/theme";

export function Input({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      selectionColor={colors.primary}
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[styles.input, focused && styles.focused, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: "100%",
    height: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: "transparent",
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.foreground,
  },
  focused: {
    borderColor: colors.ring,
  },
});
