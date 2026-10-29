import { useState } from "react";
import { Pressable, StyleSheet, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { colors } from "@/lib/theme";

// Password field with a show/hide toggle.
export function PasswordInput(props: Omit<TextInputProps, "secureTextEntry">) {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="••••••••"
        {...props}
        secureTextEntry={!visible}
        style={[styles.input, props.style]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        style={styles.eye}
      >
        {visible ? (
          <EyeOff size={16} color={colors.mutedForeground} />
        ) : (
          <Eye size={16} color={colors.mutedForeground} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingRight: 40,
  },
  eye: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
