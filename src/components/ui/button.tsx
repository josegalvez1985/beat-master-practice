import { Children, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radius } from "@/lib/theme";

type ButtonVariant = "default" | "secondary" | "outline";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const foregrounds: Record<ButtonVariant, string> = {
  default: colors.primaryForeground,
  secondary: colors.secondaryForeground,
  outline: colors.foreground,
};

// Color for icons rendered inside a button of the given variant.
export function buttonForeground(variant: ButtonVariant = "default") {
  return foregrounds[variant];
}

export function Button({
  variant = "default",
  size = "default",
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        variants[variant],
        sizes[size],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text
            style={[styles.label, size === "sm" && styles.labelSm, { color: foregrounds[variant] }]}
          >
            {child}
          </Text>
        ) : (
          child
        ),
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  labelSm: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variants = StyleSheet.create({
  default: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.background,
  },
});

// Comfortable touch targets: 40 px by default, 46 px for the main action of a screen.
const sizes = StyleSheet.create({
  default: {
    height: 40,
    paddingHorizontal: 18,
  },
  sm: {
    height: 36,
    paddingHorizontal: 14,
  },
  lg: {
    height: 46,
    paddingHorizontal: 32,
  },
  icon: {
    width: 40,
    height: 40,
  },
});
