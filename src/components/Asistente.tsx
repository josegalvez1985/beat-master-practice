import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { useLocation, useSearchParams } from "react-router";
import { RotateCcw, Send, Sparkles, X } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePerfil } from "@/lib/auth";
import {
  abrirAsistente,
  nuevaConversacion,
  preguntar,
  reintentar,
  useAsistente,
  usarCuenta,
} from "@/lib/asistente";
import { colors, fonts, radius, shared } from "@/lib/theme";

const fijo = (estilo: object) => ({ position: "fixed", ...estilo }) as unknown as ViewStyle;

// The screen the person is on, in words (the assistant adapts "how do I use this?").
function usePantalla() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  if (pathname === "/") return "Inicio";
  if (pathname.startsWith("/planificacion")) return "Planificación";
  if (pathname.startsWith("/clases/"))
    return params.get("practicar") ? "Modo práctica de una clase" : "Una clase";
  if (pathname.startsWith("/alumnos/")) return "Ficha de un alumno";
  if (pathname.startsWith("/herramientas"))
    return `Herramientas${params.get("h") ? ` (${params.get("h")})` : ""}`;
  if (pathname.startsWith("/perfil")) return "Mi perfil";
  if (pathname.startsWith("/practicar")) return "Practicar";
  return pathname;
}

const SUGERENCIAS = {
  alumno: [
    "¿Qué tengo que practicar esta semana?",
    "¿Cómo voy en mis clases?",
    "¿Cómo entrego mi grabación?",
  ],
  profesor: [
    "¿Qué alumnos no entregaron esta semana?",
    "¿Qué clases tengo en los próximos días?",
    "¿Cómo armo el plan de una clase?",
  ],
};

// AI assistant: a floating button on every signed-in screen that opens a chat (a card on wide
// screens, the whole screen on phones).
export function Asistente() {
  const perfil = usePerfil();
  const { width } = useWindowDimensions();
  const compacto = width < 640;
  const pantalla = usePantalla();
  const { abierto, mensajes, cargando, usadasHoy, limite } = useAsistente();
  const [texto, setTexto] = useState("");
  const scroll = useRef<ScrollView>(null);

  useEffect(() => usarCuenta(perfil.uid), [perfil.uid]);

  const enviar = (valor = texto) => {
    if (!valor.trim() || cargando) return;
    void preguntar(valor, pantalla);
    setTexto("");
  };

  if (!abierto)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir el asistente"
        onPress={() => abrirAsistente(true)}
        style={[
          styles.boton,
          fijo(compacto ? { right: 16, bottom: 84 } : { right: 24, bottom: 24 }),
        ]}
      >
        <Sparkles size={24} color={colors.primaryForeground} />
      </Pressable>
    );

  const sugerencias = [...SUGERENCIAS[perfil.rol], `¿Cómo se usa ${pantalla}?`];

  return (
    <View
      role="dialog"
      aria-label="Asistente"
      style={[
        shared.panel,
        styles.panel,
        fijo(
          compacto
            ? { top: 0, right: 0, bottom: 0, left: 0, borderRadius: 0 }
            : { right: 24, bottom: 24, width: 400, height: "min(640px, calc(100vh - 48px))" },
        ),
      ]}
    >
      <View style={styles.cabecera}>
        <View style={styles.icono}>
          <Sparkles size={18} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.titulo}>Asistente</Text>
          <Text style={styles.subtitulo}>Pregúntame sobre Pulso y tus clases</Text>
        </View>
        {mensajes.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nueva conversación"
            onPress={nuevaConversacion}
            style={styles.accion}
          >
            <RotateCcw size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar el asistente"
          onPress={() => abrirAsistente(false)}
          style={styles.accion}
        >
          <X size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.mensajes}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {mensajes.length === 0 ? (
          <View style={styles.bienvenida}>
            <Text style={styles.bienvenidaTexto}>
              Hola, {perfil.nombre.split(" ")[0]}. Puedo explicarte cómo se usa cada pantalla y
              consultar{" "}
              {perfil.rol === "profesor" ? "tus alumnos y tus clases" : "tus clases y tu avance"}.
            </Text>
            {sugerencias.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                onPress={() => enviar(s)}
                style={styles.sugerencia}
              >
                <Text style={styles.sugerenciaTexto}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {mensajes.map((m) =>
          m.rol === "usuario" ? (
            <View key={m.id} style={[styles.burbuja, styles.deUsuario]}>
              <Text style={styles.textoUsuario}>{m.texto}</Text>
            </View>
          ) : (
            <View key={m.id} style={[styles.burbuja, styles.deAsistente]}>
              {m.error ? (
                <>
                  <Text style={styles.error}>{m.texto}</Text>
                  <Button variant="secondary" size="sm" onPress={() => reintentar(pantalla)}>
                    Reintentar
                  </Button>
                </>
              ) : (
                <Markdown texto={m.texto} />
              )}
            </View>
          ),
        )}
        {cargando ? (
          <View style={[styles.burbuja, styles.deAsistente, styles.pensando]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.subtitulo}>Pensando…</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.pie}>
        <View style={styles.entrada}>
          <View style={styles.flex}>
            <Input
              value={texto}
              onChangeText={setTexto}
              placeholder="Escribe tu pregunta"
              accessibilityLabel="Tu pregunta"
              maxLength={1500}
              multiline
              numberOfLines={2}
              onKeyPress={(e) => {
                const evento = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                if (evento.key === "Enter" && !evento.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              style={styles.campo}
            />
          </View>
          <Button
            size="icon"
            accessibilityLabel="Enviar"
            disabled={!texto.trim() || cargando}
            onPress={() => enviar()}
          >
            <Send size={16} color={buttonForeground()} />
          </Button>
        </View>
        <Text style={styles.nota}>
          {usadasHoy !== null && limite !== null ? `Hoy: ${usadasHoy} de ${limite} · ` : ""}
          Puede equivocarse: revisa lo importante. Solo ve tus datos y no cambia nada.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    boxShadow: colors.shadow,
    zIndex: 40,
  },
  panel: {
    zIndex: 40,
    overflow: "hidden",
    borderRadius: radius["2xl"],
    backgroundColor: colors.card,
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icono: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.selected,
  },
  flex: {
    flex: 1,
  },
  titulo: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.foreground,
  },
  subtitulo: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  accion: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  mensajes: {
    padding: 14,
    gap: 10,
  },
  bienvenida: {
    gap: 8,
  },
  bienvenidaTexto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
    marginBottom: 4,
  },
  sugerencia: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  sugerenciaTexto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  burbuja: {
    maxWidth: "88%",
    padding: 10,
    borderRadius: radius.md,
    gap: 8,
  },
  deUsuario: {
    alignSelf: "flex-end",
    backgroundColor: colors.selected,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  deAsistente: {
    alignSelf: "flex-start",
    backgroundColor: colors.muted,
  },
  textoUsuario: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  pensando: {
    flexDirection: "row",
    alignItems: "center",
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.destructive,
  },
  pie: {
    gap: 6,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  entrada: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  campo: {
    height: 56,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  nota: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
