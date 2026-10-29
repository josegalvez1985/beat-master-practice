import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react";
import { Link } from "@/components/Link";
import { Badge } from "@/components/ui/section";
import type { Clase } from "@/lib/data";
import { formatoDia, mesCorto } from "@/lib/dates";
import { instrumento } from "@/lib/instruments";
import { colors, fonts, radius } from "@/lib/theme";

// Compact class row: date chip, title, instrument and optional delivery status. Opens the class.
export function ClaseItem({ clase, estado }: { clase: Clase; estado?: "entregada" | "pendiente" }) {
  return (
    <Link href={`/clases/${clase.id}`}>
      <Pressable style={styles.row}>
        <View style={styles.dateChip}>
          <Text style={styles.dateDay}>{Number(clase.fecha.slice(8, 10))}</Text>
          <Text style={styles.dateMonth}>{mesCorto(clase.fecha)}</Text>
        </View>
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.title}>
            {clase.titulo}
          </Text>
          <Text numberOfLines={1} style={styles.meta}>
            {formatoDia(clase.fecha)} · {instrumento(clase.instrumento).name}
            {clase.materiales.length
              ? ` · ${clase.materiales.length} ${clase.materiales.length === 1 ? "material" : "materiales"}`
              : ""}
          </Text>
        </View>
        {estado === "entregada" ? <Badge label="Entregada" tone="success" /> : null}
        {estado === "pendiente" ? <Badge label="Pendiente" /> : null}
        <ChevronRight size={18} color={colors.mutedForeground} />
      </Pressable>
    </Link>
  );
}

// Round badge with the person's initials.
export function Avatar({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{iniciales || "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  dateChip: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  dateDay: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 20,
    color: colors.foreground,
  },
  dateMonth: {
    fontFamily: fonts.sans,
    fontSize: 10,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(249, 161, 41, 0.16)",
  },
  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primary,
  },
});
