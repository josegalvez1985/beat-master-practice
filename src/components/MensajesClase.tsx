import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Send, Trash2 } from "lucide-react";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { avisar } from "@/components/ui/toast";
import type { Perfil } from "@/lib/auth";
import { borrarMensaje, enviarMensaje, marcarLeidos, useMensajes, type Clase } from "@/lib/data";
import { colors, fonts, radius } from "@/lib/theme";

// The conversation about this class between the profesor and one alumno: doubts about the
// homework, "I could not practice this week"… Deleted with the class.
export function MensajesClase({
  clase,
  alumnoId,
  perfil,
  otroNombre,
}: {
  clase: Clase;
  alumnoId: string;
  perfil: Perfil;
  otroNombre: string;
}) {
  const mensajes = useMensajes(clase, alumnoId);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Open on screen: what the other person wrote counts as read.
  const nuevos = mensajes.data.filter((m) => m.autorId !== perfil.uid && !m.leido);
  const idsNuevos = nuevos.map((m) => m.id).join();
  useEffect(() => {
    if (idsNuevos) void marcarLeidos(nuevos).catch(() => {});
    // `idsNuevos` identifies the list; the array is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsNuevos]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await enviarMensaje(clase, alumnoId, perfil.uid, texto);
      setTexto("");
    } catch {
      avisar({ texto: "No se pudo enviar el mensaje.", tipo: "error" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {mensajes.loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!mensajes.loading && !mensajes.data.length ? (
        <Text style={styles.vacio}>
          Todavía no hay mensajes. Escribe una duda o un aviso para {otroNombre}.
        </Text>
      ) : null}
      {mensajes.data.map((m) => {
        const mio = m.autorId === perfil.uid;
        return (
          <View key={m.id} style={[styles.burbuja, mio ? styles.mia : styles.suya]}>
            <Text style={styles.autor}>
              {mio ? "Tú" : otroNombre}
              {m.creadoEn
                ? ` · ${m.creadoEn.toDate().toLocaleString("es-PY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </Text>
            <Text style={styles.texto}>{m.texto}</Text>
            {mio ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Borrar mensaje"
                onPress={() =>
                  void borrarMensaje(m.id).catch(() =>
                    avisar({ texto: "No se pudo borrar el mensaje.", tipo: "error" }),
                  )
                }
                style={styles.borrar}
              >
                <Trash2 size={12} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
      <View style={styles.escribir}>
        <View style={styles.flex}>
          <Input
            accessibilityLabel="Mensaje"
            placeholder="Escribe un mensaje…"
            value={texto}
            onChangeText={setTexto}
            maxLength={1000}
            onSubmitEditing={enviar}
            returnKeyType="send"
          />
        </View>
        <Button
          accessibilityLabel="Enviar mensaje"
          disabled={enviando || !texto.trim()}
          onPress={enviar}
        >
          <Send size={16} color={buttonForeground()} />
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  vacio: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  burbuja: {
    maxWidth: "85%",
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingRight: 28,
    borderRadius: radius.md,
  },
  mia: {
    alignSelf: "flex-end",
    backgroundColor: colors.selected,
  },
  suya: {
    alignSelf: "flex-start",
    backgroundColor: colors.muted,
  },
  autor: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  borrar: {
    position: "absolute",
    top: 6,
    right: 6,
    padding: 2,
  },
  escribir: {
    flexDirection: "row",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
