import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Check } from "lucide-react";
import { colors } from "@/lib/theme";

type CheckboxProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  accessibilityLabel?: string;
};

export function Checkbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  accessibilityLabel,
}: CheckboxProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const isChecked = checked ?? internal;

  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={isChecked}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        setInternal(!isChecked);
        onCheckedChange?.(!isChecked);
      }}
      style={[styles.box, isChecked && styles.checked]}
    >
      {isChecked ? <Check size={12} strokeWidth={3} color={colors.primaryForeground} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
  },
  checked: {
    backgroundColor: colors.primary,
  },
});
