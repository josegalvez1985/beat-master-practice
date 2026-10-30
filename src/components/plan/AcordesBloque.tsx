import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Plus, X } from "lucide-react";
import { DiagramaAcorde } from "@/components/plan/DiagramaAcorde";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACORDES_COMUNES, analizar } from "@/lib/acordes";
import type { Bloque } from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type Acordes = Extract<Bloque, { tipo: "acordes" }>;

// Chord diagrams; the profesor types names (Am, Lam, F#7…) or picks common ones.
export function AcordesBloque({
  bloque,
  editable,
  instrumento,
  onChange,
}: {
  bloque: Acordes;
  editable: boolean;
  instrumento: "guitarra" | "ukelele";
  onChange: (bloque: Acordes) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  const agregar = (valor: string) => {
    const limpio = valor.trim();
    if (!limpio) return;
    if (!analizar(limpio)) {
      setError(`No reconozco "${limpio}". Prueba con Am, G7, Fmaj7, Lam o Sol7.`);
      return;
    }
    setError(null);
    setNombre("");
    if (bloque.acordes.length < 24) onChange({ ...bloque, acordes: [...bloque.acordes, limpio] });
  };

  const quitar = (index: number) =>
    onChange({ ...bloque, acordes: bloque.acordes.filter((_, i) => i !== index) });

  const sugerencias = ACORDES_COMUNES[instrumento].filter((a) => !bloque.acordes.includes(a));

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {bloque.acordes.map((acorde, index) => (
          <View key={`${acorde}-${index}`} style={styles.item}>
            <DiagramaAcorde nombre={acorde} instrumento={instrumento} />
            {editable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${acorde}`}
                onPress={() => quitar(index)}
                style={styles.quitar}
              >
                <X size={12} color={colors.foreground} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {bloque.acordes.length === 0 ? (
          <Text style={styles.vacio}>Agrega los acordes de la clase.</Text>
        ) : null}
      </View>

      {editable ? (
        <>
          <View style={styles.agregar}>
            <View style={styles.flex}>
              <Input
                value={nombre}
                onChangeText={setNombre}
                placeholder="Am, G7, Lam, Fa#m…"
                accessibilityLabel="Nombre del acorde"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => agregar(nombre)}
              />
            </View>
            <Button variant="secondary" onPress={() => agregar(nombre)}>
              <Plus size={14} color={buttonForeground("secondary")} />
              Agregar
            </Button>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.sugerencias}>
            {sugerencias.map((acorde) => (
              <Pressable
                key={acorde}
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${acorde}`}
                onPress={() => agregar(acorde)}
                style={styles.sugerencia}
              >
                <Text style={styles.sugerenciaText}>{acorde}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  item: {
    position: "relative",
  },
  quitar: {
    position: "absolute",
    top: 0,
    right: -4,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.secondary,
  },
  vacio: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  agregar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.destructive,
  },
  sugerencias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sugerencia: {
    minWidth: 40,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
  },
  sugerenciaText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.foreground,
  },
});
