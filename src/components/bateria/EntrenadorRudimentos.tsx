import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Trophy } from "lucide-react";
import { RudimentoPractica } from "@/components/bateria/Rudimento";
import { usePerfil } from "@/lib/auth";
import { RUDIMENTOS, rudimento as rudimentoDe } from "@/lib/bateria";
import { useRecordsAlumno } from "@/lib/data";
import { colors, fonts, radius } from "@/lib/theme";

const GRUPOS = ["Redobles", "Paradiddles", "Flams", "Drags"] as const;

// The essential PAS rudiments with their tempo ladder and, for alumnos, their records.
export function EntrenadorRudimentos() {
  const perfil = usePerfil();
  const alumno = perfil.rol === "alumno";
  const records = useRecordsAlumno(alumno ? perfil.uid : null);
  const [id, setId] = useState(RUDIMENTOS[0]!.id);
  const r = rudimentoDe(id);
  const recordDe = (rid: string) => records.data.find((x) => x.rudimento === rid);

  return (
    <View style={styles.wrap}>
      {GRUPOS.map((grupo) => (
        <View key={grupo} style={styles.grupo}>
          <Text style={styles.grupoTitulo}>{grupo}</Text>
          <View style={styles.lista}>
            {RUDIMENTOS.filter((x) => x.grupo === grupo).map((x) => {
              const record = recordDe(x.id);
              return (
                <Pressable
                  key={x.id}
                  accessibilityRole="radio"
                  aria-checked={x.id === r.id}
                  onPress={() => setId(x.id)}
                  style={[styles.item, x.id === r.id && styles.itemActivo]}
                >
                  <Text style={styles.itemTexto}>{x.nombre}</Text>
                  {record ? (
                    <View style={styles.record}>
                      <Trophy size={12} color={colors.primary} />
                      <Text style={styles.recordTexto}>{record.bpm}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <View style={styles.practica}>
        <Text style={styles.titulo}>{r.nombre}</Text>
        <RudimentoPractica
          key={r.id}
          rudimentoId={r.id}
          empiezaCon="R"
          inicio={r.tempo[0]}
          objetivo={r.tempo[1]}
          paso={5}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  grupo: {
    gap: 6,
  },
  grupoTitulo: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  lista: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  itemActivo: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  itemTexto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  record: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  recordTexto: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    color: colors.primary,
  },
  practica: {
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.foreground,
  },
});
