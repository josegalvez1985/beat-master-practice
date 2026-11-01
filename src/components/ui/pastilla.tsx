import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react";
import { colors, fonts, radius } from "@/lib/theme";

// Small rounded tag with an icon: an instrument, optionally with a number ("Guitarra · 12").
export function Pastilla({
  icon: Icono,
  label,
  valor,
}: {
  icon: LucideIcon;
  label: string;
  valor?: string;
}) {
  return (
    <View style={styles.pastilla}>
      <Icono size={14} color={colors.primary} />
      <Text style={styles.texto}>
        {label}
        {valor ? <Text style={styles.valor}> · {valor}</Text> : null}
      </Text>
    </View>
  );
}

export const pastillaStyles = StyleSheet.create({
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  etiqueta: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
});

const styles = StyleSheet.create({
  pastilla: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  texto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  valor: {
    fontFamily: fonts.semibold,
    fontVariant: ["tabular-nums"],
    color: colors.highlight,
  },
});
