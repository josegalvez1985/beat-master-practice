import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { shellStyles } from "@/components/AppShell";
import { EscenaMusical } from "@/components/ui/escena-musical";
import type { Role } from "@/lib/auth";
import { fraseDelDia } from "@/lib/frases";
import type { InstrumentId } from "@/lib/instruments";
import { colors, fonts, radius, shared } from "@/lib/theme";

// Home header for profesores and alumnos: the greeting next to an animated scene with their own
// instruments (the harp in the middle for whoever plays it, an equalizer for everyone else), and a
// motivational line for the role, one per day (src/lib/frases.md).
export function Bienvenida({
  titulo,
  subtitulo,
  instrumentos,
  rol,
  children,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  instrumentos: InstrumentId[];
  rol: Role;
  children?: ReactNode;
}) {
  const [frase] = useState(() => fraseDelDia(rol));
  const { width } = useWindowDimensions();
  const ancho = width >= 768;
  return (
    <View style={[shared.panel, styles.card, ancho && styles.fila]}>
      <View style={styles.textos}>
        <Text style={shellStyles.pageTitle}>{titulo}</Text>
        {subtitulo ? <Text style={shellStyles.pageSubtitle}>{subtitulo}</Text> : null}
        {frase ? <Text style={styles.frase}>“{frase}”</Text> : null}
        {children}
      </View>
      <View style={ancho ? styles.escena : undefined}>
        <EscenaMusical
          alto={ancho ? 170 : 112}
          compacta={!ancho}
          centro={instrumentos.includes("arpa") ? "arpa" : "ecualizador"}
          instrumentos={instrumentos}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 20,
    overflow: "hidden",
    borderRadius: radius["2xl"],
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
  },
  frase: {
    marginTop: 6,
    marginBottom: 4,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.mutedForeground,
  },
  textos: {
    flex: 1,
    minWidth: 0,
  },
  escena: {
    width: 320,
  },
});
