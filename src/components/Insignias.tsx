import { StyleSheet, Text, View } from "react-native";
import type { Insignia } from "@/lib/insignias";
import { colors, fonts, radius } from "@/lib/theme";

// Earned badges first; the others show what is missing.
export function Insignias({ lista }: { lista: Insignia[] }) {
  const orden = [...lista].sort((a, b) => Number(b.ganada) - Number(a.ganada));
  return (
    <View style={styles.grilla}>
      {orden.map((i) => (
        <View
          key={i.id}
          style={[styles.insignia, !i.ganada && styles.bloqueada]}
          accessibilityLabel={`${i.nombre}: ${i.descripcion}${i.ganada ? ", ganada" : i.avance ? `, ${i.avance}` : ""}`}
        >
          <View style={[styles.icono, i.ganada && styles.iconoGanado]}>
            <i.icon size={18} color={i.ganada ? colors.primary : colors.mutedForeground} />
          </View>
          <Text style={styles.nombre} numberOfLines={1}>
            {i.nombre}
          </Text>
          <Text style={styles.descripcion} numberOfLines={2}>
            {i.ganada || !i.avance ? i.descripcion : i.avance}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  insignia: {
    flexBasis: 140,
    flexGrow: 1,
    alignItems: "center",
    gap: 4,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  bloqueada: {
    opacity: 0.55,
  },
  icono: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: colors.secondary,
  },
  iconoGanado: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  nombre: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.foreground,
  },
  descripcion: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    color: colors.mutedForeground,
  },
});
