import { StyleSheet, Text, View } from "react-native";
import { Opciones } from "@/components/plan/comunes";
import { Chip } from "@/components/ui/chip";
import { Label } from "@/components/ui/label";
import type { Destino, Inscripcion } from "@/lib/data";
import { instrumento as instrumentoDe, type InstrumentId } from "@/lib/instruments";
import { colors, fonts } from "@/lib/theme";

// Who a class is for: chosen alumnos of that instrument's list (an individual or small-group
// lesson) or the whole list.
export function SelectorDestino({
  instrumento,
  inscripciones,
  valor,
  onChange,
}: {
  instrumento: InstrumentId;
  inscripciones: Inscripcion[];
  valor: Destino;
  onChange: (destino: Destino) => void;
}) {
  const lista = inscripciones.filter((i) => i.instrumento === instrumento);
  const elegidos = "alumnos" in valor ? valor.alumnos : [];
  const nombre = instrumentoDe(instrumento).name;

  if (!lista.length)
    return (
      <View style={styles.wrap}>
        <Label>Para quién es</Label>
        <Text style={styles.ayuda}>
          Todavía no tienes alumnos de {nombre}. La clase será para toda la lista: la verán los que
          agregues.
        </Text>
      </View>
    );

  const alternar = (alumnoId: string) =>
    onChange({
      alumnos: elegidos.includes(alumnoId)
        ? elegidos.filter((id) => id !== alumnoId)
        : [...elegidos, alumnoId],
    });

  return (
    <View style={styles.wrap}>
      <Label>Para quién es</Label>
      <Opciones
        chico
        opciones={[
          { value: "alumnos", label: "Elegir alumnos" },
          { value: "todos", label: `Todos los de ${nombre}` },
        ]}
        valor={"alumnos" in valor ? "alumnos" : "todos"}
        onChange={(modo) => onChange(modo === "todos" ? { paraTodos: true } : { alumnos: [] })}
      />
      {"alumnos" in valor ? (
        <View style={styles.chips}>
          {lista.map((i) => (
            <Chip
              key={i.alumnoId}
              label={i.alumnoNombre}
              selected={elegidos.includes(i.alumnoId)}
              onPress={() => alternar(i.alumnoId)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.ayuda}>
          La ven todos los de esa lista, también los que agregues después.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
