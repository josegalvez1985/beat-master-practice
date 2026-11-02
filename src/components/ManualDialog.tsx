import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { Role } from "@/lib/auth";
import { manual, type TemaManual } from "@/lib/manual";
import { colors, fonts, radius } from "@/lib/theme";

// The user manual of the role (src/lib/manual.ts), one topic open at a time.
export function ManualDialog({
  visible,
  onClose,
  rol,
}: {
  visible: boolean;
  onClose: () => void;
  rol: Role;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Manual de uso"
      description={
        rol === "profesor"
          ? "Todo lo que puedes hacer en Pulso como profesor, paso a paso. Toca un tema para abrirlo."
          : "Todo lo que puedes hacer en Pulso como alumno, paso a paso. Toca un tema para abrirlo."
      }
    >
      <View style={styles.lista}>
        {manual[rol].map((tema) => (
          <Tema
            key={tema.titulo}
            tema={tema}
            abierto={abierto === tema.titulo}
            onPress={() => setAbierto((actual) => (actual === tema.titulo ? null : tema.titulo))}
          />
        ))}
      </View>
    </Dialog>
  );
}

function Tema({
  tema,
  abierto,
  onPress,
}: {
  tema: TemaManual;
  abierto: boolean;
  onPress: () => void;
}) {
  const Chevron = abierto ? ChevronUp : ChevronDown;
  return (
    <View style={[styles.tema, abierto && styles.temaAbierto]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        onPress={onPress}
        style={styles.cabecera}
      >
        <Text style={styles.titulo}>{tema.titulo}</Text>
        <Chevron size={18} color={colors.mutedForeground} />
      </Pressable>
      {abierto ? (
        <View style={styles.pasos}>
          {tema.pasos.map((paso, i) => (
            <View key={i} style={styles.paso}>
              <Text style={styles.numero}>{i + 1}</Text>
              <Text style={styles.texto}>{paso}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    marginTop: 20,
    gap: 8,
  },
  tema: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  temaAbierto: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  titulo: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  pasos: {
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  paso: {
    flexDirection: "row",
    gap: 10,
  },
  numero: {
    width: 18,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.primary,
  },
  texto: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
});
