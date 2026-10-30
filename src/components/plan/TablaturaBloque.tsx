import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Partitura } from "@/components/plan/Partitura";
import { MAX_TEX, type Bloque } from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type Tablatura = Extract<Bloque, { tipo: "tablatura" }>;

const ATAJOS: { label: string; texto: string }[] = [
  { label: "Nota", texto: " 3.6" },
  { label: "Acorde", texto: " (3.6 2.5 0.4 0.3 0.2 3.1)" },
  { label: "Silencio", texto: " r" },
  { label: "| Compás", texto: " |" },
  { label: "Negra :4", texto: " :4" },
  { label: "Corchea :8", texto: " :8" },
  { label: "Semicorchea :16", texto: " :16" },
];

// alphaTex editor with live score + tab preview (profesor), or just the playable score.
export function TablaturaBloque({
  bloque,
  editable,
  onChange,
}: {
  bloque: Tablatura;
  editable: boolean;
  onChange: (bloque: Tablatura) => void;
}) {
  const [vista, setVista] = useState(bloque.tex);
  const [ayuda, setAyuda] = useState(false);

  // Redraw shortly after typing stops, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => setVista(bloque.tex), 600);
    return () => clearTimeout(timer);
  }, [bloque.tex]);

  const escribir = (tex: string) => onChange({ ...bloque, tex: tex.slice(0, MAX_TEX) });

  if (!editable) return <Partitura tex={bloque.tex} />;

  return (
    <View style={styles.wrap}>
      <View style={styles.atajos}>
        {ATAJOS.map((atajo) => (
          <Pressable
            key={atajo.label}
            accessibilityRole="button"
            accessibilityLabel={`Agregar ${atajo.label}`}
            onPress={() => escribir(bloque.tex.trimEnd() + atajo.texto)}
            style={styles.atajo}
          >
            <Text style={styles.atajoText}>{atajo.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        multiline
        value={bloque.tex}
        onChangeText={escribir}
        accessibilityLabel="Tablatura en alphaTex"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={styles.editor}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => setAyuda(!ayuda)}
        style={styles.ayudaToggle}
      >
        {ayuda ? (
          <ChevronUp size={14} color={colors.primary} />
        ) : (
          <ChevronDown size={14} color={colors.primary} />
        )}
        <Text style={styles.ayudaToggleText}>¿Cómo se escribe?</Text>
      </Pressable>
      {ayuda ? (
        <View style={styles.ayuda}>
          {[
            ["3.6", "traste 3 en la cuerda 6 (la más grave)"],
            ["(0.1 1.2 0.3)", "acorde: varias notas a la vez"],
            [":4  :8  :16", "duración de lo que sigue: negra, corchea, semicorchea"],
            ["3.6.8", "duración de una sola nota (corchea)"],
            ["r", "silencio"],
            ["|", "barra de compás"],
            ["\\tempo 90", "tempo en BPM (antes del punto)"],
            ["\\tuning …", "afinación, de la cuerda más aguda a la más grave"],
          ].map(([codigo, texto]) => (
            <Text key={codigo} style={styles.ayudaLinea}>
              <Text style={styles.codigo}>{codigo}</Text> {texto}
            </Text>
          ))}
        </View>
      ) : null}
      <Partitura tex={vista} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  atajos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  atajo: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  atajoText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  editor: {
    minHeight: 150,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  ayudaToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
  },
  ayudaToggleText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
  ayuda: {
    gap: 4,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  ayudaLinea: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  codigo: {
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
    color: colors.foreground,
  },
});
