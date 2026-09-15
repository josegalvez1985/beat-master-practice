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
    fontSize: 12,
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

const sizes = StyleSheet.create({
  default: {
    height: 36,
    paddingHorizontal: 16,
  },
  sm: {
    height: 32,
    paddingHorizontal: 12,
  },
  lg: {
    height: 40,
    paddingHorizontal: 32,
  },
  icon: {
    width: 36,
    height: 36,
  },
});
