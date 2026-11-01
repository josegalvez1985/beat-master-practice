import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Plus, X } from "lucide-react";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { avisar } from "@/components/ui/toast";
import { agregarMeta, marcarMeta, quitarMeta, type Inscripcion, type Meta } from "@/lib/data";
import { hoy, inicioDeSemana } from "@/lib/dates";
import { colors, fonts } from "@/lib/theme";

const error = () => avisar({ texto: "No se pudo guardar la meta.", tipo: "error" });

// This week's goals of one list ("pasaje A a 90 BPM"): the profesor and the alumno write them,
// the alumno checks them off. Earlier weeks only count.
export function MetasSemana({ inscripcion, metas }: { inscripcion: Inscripcion; metas: Meta[] }) {
  const [nueva, setNueva] = useState("");
  const semana = inicioDeSemana(hoy());
  const deLaLista = metas.filter(
    (m) => m.instrumento === inscripcion.instrumento && m.profesorId === inscripcion.profesorId,
  );
  const estas = deLaLista.filter((m) => m.semana === semana);
  const anteriores = deLaLista.filter((m) => m.semana < semana);
  const cumplidasAntes = anteriores.filter((m) => m.cumplida).length;

  const agregar = () => {
    if (!nueva.trim()) return;
    void agregarMeta(inscripcion, nueva, semana).then(() => setNueva(""), error);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>
        Metas de la semana
        {estas.length ? ` · ${estas.filter((m) => m.cumplida).length} de ${estas.length}` : ""}
      </Text>
      {estas.length === 0 ? (
        <Text style={styles.ayuda}>
          Metas concretas para esta semana, por ejemplo «pasaje A a 90 BPM» o «primera parte de
          memoria».
        </Text>
      ) : null}
      {estas.map((m) => (
        <View key={m.id} style={styles.fila}>
          <Pressable
            accessibilityRole="checkbox"
            aria-checked={m.cumplida}
            onPress={() => void marcarMeta(m.id, !m.cumplida).catch(error)}
            style={styles.marcar}
          >
            <View style={[styles.caja, m.cumplida && styles.cajaHecha]}>
              {m.cumplida ? (
                <Check size={12} strokeWidth={3} color={colors.primaryForeground} />
              ) : null}
            </View>
            <Text style={[styles.texto, m.cumplida && styles.hecha]}>{m.texto}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar la meta ${m.texto}`}
            onPress={() => void quitarMeta(m.id).catch(error)}
            style={styles.quitar}
          >
            <X size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ))}
      <View style={styles.agregar}>
        <View style={styles.flex}>
          <Input
            accessibilityLabel="Meta nueva"
            placeholder="Meta nueva para esta semana"
            value={nueva}
            onChangeText={setNueva}
            maxLength={200}
            onSubmitEditing={agregar}
          />
        </View>
        <Button variant="secondary" accessibilityLabel="Agregar meta" onPress={agregar}>
          <Plus size={16} color={buttonForeground("secondary")} />
        </Button>
      </View>
      {anteriores.length ? (
        <Text style={styles.ayuda}>
          Semanas anteriores: {cumplidasAntes} de {anteriores.length} metas cumplidas.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.foreground,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  marcar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  caja: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  // Progress reached: solid amber.
  cajaHecha: {
    backgroundColor: colors.primary,
  },
  texto: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.foreground,
  },
  hecha: {
    color: colors.mutedForeground,
    textDecorationLine: "line-through",
  },
  quitar: {
    padding: 6,
  },
  agregar: {
    flexDirection: "row",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
