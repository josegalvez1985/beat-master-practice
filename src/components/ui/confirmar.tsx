import { useSyncExternalStore } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, HelpCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { colors, fonts, radius, shared } from "@/lib/theme";

// Pulso's own confirmation, instead of the browser's window.confirm: says what happens and what
// cannot be undone, with the action named on the button. Call `confirmar` from anywhere (it
// resolves true or false); <Confirmaciones /> is mounted once in the layout, next to <Avisos />.

type Opciones = {
  titulo: string;
  mensaje?: string;
  // What else changes, one line each ("Sus materiales", "Las entregas de los alumnos").
  detalle?: string[];
  // The action, as a verb: "Eliminar clase", "Agregar Piano".
  aceptar: string;
  cancelar?: string;
  // Deletes something for good: red button and warning icon.
  peligro?: boolean;
  icono?: LucideIcon;
};

type Pedido = Opciones & { resolver: (ok: boolean) => void };

let pedido: Pedido | null = null;
const listeners = new Set<() => void>();
const emitir = () => listeners.forEach((listener) => listener());

export function confirmar(opciones: Opciones) {
  return new Promise<boolean>((resolve) => {
    // A new question replaces one still open, which counts as cancelled.
    pedido?.resolver(false);
    pedido = { ...opciones, resolver: resolve };
    emitir();
  });
}

function responder(ok: boolean) {
  const actual = pedido;
  pedido = null;
  emitir();
  actual?.resolver(ok);
}

export function Confirmaciones() {
  const actual = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pedido,
  );
  if (!actual) return null;
  const Icono = actual.icono ?? (actual.peligro ? AlertTriangle : HelpCircle);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => responder(false)}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={actual.cancelar ?? "Cancelar"}
          focusable={false}
          onPress={() => responder(false)}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
        <View
          accessibilityRole="alert"
          style={[shared.panel, styles.panel, actual.peligro && styles.panelPeligro]}
        >
          <View style={[styles.icono, actual.peligro ? styles.iconoPeligro : styles.iconoNormal]}>
            <Icono size={22} color={actual.peligro ? colors.destructive : colors.primary} />
          </View>
          <Text style={styles.titulo}>{actual.titulo}</Text>
          {actual.mensaje ? <Text style={styles.mensaje}>{actual.mensaje}</Text> : null}
          {actual.detalle?.length ? (
            <View style={styles.detalle}>
              {actual.detalle.map((linea) => (
                <View key={linea} style={styles.linea}>
                  <View
                    style={[
                      styles.punto,
                      actual.peligro ? styles.puntoPeligro : styles.puntoNormal,
                    ]}
                  />
                  <Text style={styles.lineaTexto}>{linea}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.botones}>
            <Button variant="secondary" style={styles.boton} onPress={() => responder(false)}>
              {actual.cancelar ?? "Cancelar"}
            </Button>
            <Button
              variant={actual.peligro ? "destructive" : "default"}
              style={styles.boton}
              onPress={() => responder(true)}
            >
              {actual.aceptar}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  backdrop: {
    backgroundColor: colors.backdrop,
  },
  panel: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    borderRadius: radius["2xl"],
    backgroundColor: colors.card,
  },
  panelPeligro: {
    borderColor: colors.destructive,
  },
  icono: {
    width: 44,
    height: 44,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  iconoNormal: {
    backgroundColor: "rgba(249, 161, 41, 0.14)",
  },
  iconoPeligro: {
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: colors.muted,
  },
  titulo: {
    fontFamily: fonts.headingBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.foreground,
  },
  mensaje: {
    marginTop: 6,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: colors.mutedForeground,
  },
  detalle: {
    marginTop: 14,
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  linea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  puntoNormal: {
    backgroundColor: colors.primary,
  },
  puntoPeligro: {
    backgroundColor: colors.destructive,
  },
  lineaTexto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: colors.foreground,
  },
  botones: {
    marginTop: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
  },
  boton: {
    flexGrow: 1,
    flexBasis: 140,
  },
});
