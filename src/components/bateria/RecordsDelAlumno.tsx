import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Trophy } from "lucide-react";
import { rudimento } from "@/lib/bateria";
import { useRecordsAlumno } from "@/lib/data";
import { formatoDia } from "@/lib/dates";
import { colors, fonts, radius } from "@/lib/theme";

// Profesor: the best clean tempo the alumno saved for each rudiment.
export function RecordsDelAlumno({ alumnoId }: { alumnoId: string }) {
  const records = useRecordsAlumno(alumnoId);
  if (records.loading) return <ActivityIndicator color={colors.primary} />;
  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Récords de rudimentos</Text>
      {records.data.length ? (
        [...records.data]
          .sort((a, b) =>
            rudimento(a.rudimento).nombre.localeCompare(rudimento(b.rudimento).nombre),
          )
          .map((r) => (
            <View key={r.id} style={styles.fila}>
              <Trophy size={14} color={colors.primary} />
              <Text style={styles.nombre}>{rudimento(r.rudimento).nombre}</Text>
              <Text style={styles.bpm}>{r.bpm} BPM</Text>
              <Text style={styles.fecha}>{formatoDia(r.fecha)}</Text>
            </View>
          ))
      ) : (
        <Text style={styles.fecha}>Todavía no guardó récords.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  nombre: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  bpm: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    color: colors.primary,
  },
  fecha: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
