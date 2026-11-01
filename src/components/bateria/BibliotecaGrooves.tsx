import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GrooveGrid } from "@/components/bateria/Groove";
import { Opciones } from "@/components/plan/comunes";
import { estilosDe, type Kit } from "@/lib/bateria";
import { colors, fonts, radius } from "@/lib/theme";

// Grooves by style to play along: rock to bossa, cumbia and the Paraguayan polca, guarania and
// galopa. Mute a piece and play it yourself.
export function BibliotecaGrooves({ kit = "bateria" }: { kit?: Kit }) {
  const ESTILOS = estilosDe(kit);
  const [id, setId] = useState(ESTILOS[0]!.id);
  const estilo = ESTILOS.find((e) => e.id === id) ?? ESTILOS[0]!;
  return (
    <View style={styles.wrap}>
      <Opciones
        chico
        opciones={ESTILOS.map((e) => ({ value: e.id, label: e.nombre }))}
        valor={estilo.id}
        onChange={setId}
      />
      <View style={styles.consejo}>
        <Text style={styles.titulo}>{estilo.nombre}</Text>
        <Text style={styles.texto}>{estilo.consejo}</Text>
      </View>
      <GrooveGrid key={estilo.id} groove={estilo.groove} editable={false} kit={kit} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  consejo: {
    gap: 4,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
});
