import { StyleSheet } from "react-native";

/*
 * Design system definition.
 *
 * Dark-only stage theme: charcoal + amber cymbal light.
 * React Native has no oklch support, so these are the hex equivalents of the
 * oklch tokens from the original web design system.
 */

export const colors = {
  background: "#100c0a",
  foreground: "#f8f5ef",
  card: "#1c1714",
  primary: "#f9a129",
  primaryForeground: "#180f09",
  secondary: "#2b2520",
  secondaryForeground: "#f1eee9",
  muted: "#25211d",
  mutedForeground: "#a69d91",
  accent: "#da534f",
  destructive: "#e62b34",
  border: "rgba(255, 255, 255, 0.10)",
  input: "rgba(255, 255, 255, 0.14)",
  ring: "#f9a129",
} as const;

export const gradients = {
  amber: ["#ffaf1d", "#e9622e"] as const,
  stage: ["rgba(249, 161, 41, 0.20)", "rgba(249, 161, 41, 0)"] as const,
};

export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
  "2xl": 22,
} as const;

export const fonts = {
  display: "BebasNeue_400Regular",
  sans: "Barlow_400Regular",
  medium: "Barlow_500Medium",
  semibold: "Barlow_600SemiBold",
  bold: "Barlow_700Bold",
} as const;

export const shared = StyleSheet.create({
  // Equivalent of the web `panel` utility.
  panel: {
    backgroundColor: "rgba(28, 23, 20, 0.8)",
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: "0 30px 70px -40px rgba(0, 0, 0, 0.9)",
  },
});
