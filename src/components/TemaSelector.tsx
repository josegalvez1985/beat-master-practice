import { Pressable, StyleSheet, Text, View } from "react-native";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { colors, fonts, radius, setTema, useTema, type Tema } from "@/lib/theme";

const opciones: { value: Tema; label: string; icon: LucideIcon }[] = [
  { value: "sistema", label: "Sistema", icon: Monitor },
  { value: "claro", label: "Claro", icon: Sun },
  { value: "oscuro", label: "Oscuro", icon: Moon },
];

// Light / dark / follow the device. Icons only in bars; with labels on the profile page.
export function TemaSelector({ conTexto = false }: { conTexto?: boolean }) {
  const tema = useTema();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Tema" style={styles.track}>
      {opciones.map((opcion) => {
        const active = opcion.value === tema;
        const color = active ? colors.primary : colors.mutedForeground;
        return (
          <Pressable
            key={opcion.value}
            accessibilityRole="radio"
            accessibilityLabel={`Tema ${opcion.label.toLowerCase()}`}
            aria-checked={active}
            onPress={() => setTema(opcion.value)}
            style={[styles.option, conTexto && styles.optionText, active && styles.active]}
          >
            <opcion.icon size={15} color={color} />
            {conTexto ? <Text style={[styles.label, { color }]}>{opcion.label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignSelf: "flex-start",
    padding: 3,
    gap: 2,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  option: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionText: {
    width: "auto",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
  },
  active: {
    backgroundColor: colors.selected,
    borderColor: colors.primary,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
});
