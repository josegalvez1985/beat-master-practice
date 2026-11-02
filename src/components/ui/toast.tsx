import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { colors, fonts, radius } from "@/lib/theme";

// Short notices at the bottom of the screen, optionally with one action ("Deshacer").
// Call `avisar` from anywhere; <Avisos /> is mounted once in the layout. Undoable deletes of a
// list: useBorrarConDeshacer.

type Aviso = {
  id: number;
  texto: string;
  tipo: "ok" | "error";
  accion?: { label: string; onPress: () => void };
};

let avisos: Aviso[] = [];
let siguienteId = 1;
const listeners = new Set<() => void>();
const emitir = () => listeners.forEach((listener) => listener());

export function avisar({
  texto,
  tipo = "ok",
  accion,
  duracion = 5000,
}: {
  texto: string;
  tipo?: Aviso["tipo"];
  accion?: Aviso["accion"];
  duracion?: number;
}) {
  const id = siguienteId++;
  avisos = [...avisos.slice(-2), { id, texto, tipo, accion }];
  emitir();
  window.setTimeout(() => cerrar(id), duracion);
  return id;
}

const DESHACER_MS = 6000;

// Deletes with "Deshacer": `borrar` only hides the item (`ocultos`) for a few seconds; the real
// delete (`ejecutar`: files first, then the reference) runs when the time is up, or right away if
// the screen closes. If it fails, the item shows again with an error notice.
export function useBorrarConDeshacer() {
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());
  const pendientes = useRef(new Map<string, { timer: number; ejecutar: () => Promise<void> }>());

  const mostrar = useCallback(
    (id: string) =>
      setOcultos((actual) => {
        const nuevos = new Set(actual);
        nuevos.delete(id);
        return nuevos;
      }),
    [],
  );

  const confirmar = useCallback(
    (id: string) => {
      const pendiente = pendientes.current.get(id);
      if (!pendiente) return;
      pendientes.current.delete(id);
      window.clearTimeout(pendiente.timer);
      void pendiente.ejecutar().then(
        () => mostrar(id),
        (error) => {
          console.error("borrar", error);
          mostrar(id);
          avisar({
            texto: "No se pudo eliminar. Revisa tu conexión y vuelve a probar.",
            tipo: "error",
          });
        },
      );
    },
    [mostrar],
  );

  useEffect(() => {
    const mapa = pendientes.current;
    return () => [...mapa.keys()].forEach(confirmar);
  }, [confirmar]);

  const borrar = (id: string, texto: string, ejecutar: () => Promise<void>) => {
    if (pendientes.current.has(id)) return;
    setOcultos((actual) => new Set(actual).add(id));
    const timer = window.setTimeout(() => confirmar(id), DESHACER_MS);
    pendientes.current.set(id, { timer, ejecutar });
    avisar({
      texto,
      duracion: DESHACER_MS,
      accion: {
        label: "Deshacer",
        onPress: () => {
          const pendiente = pendientes.current.get(id);
          if (!pendiente) return;
          window.clearTimeout(pendiente.timer);
          pendientes.current.delete(id);
          mostrar(id);
        },
      },
    });
  };

  return { ocultos, borrar };
}

export function cerrar(id: number) {
  if (!avisos.some((a) => a.id === id)) return;
  avisos = avisos.filter((a) => a.id !== id);
  emitir();
}

export function Avisos() {
  const lista = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => avisos,
  );
  if (!lista.length) return null;

  return (
    <View style={styles.zona}>
      {lista.map((aviso) => {
        const Icono = aviso.tipo === "error" ? AlertCircle : CheckCircle2;
        return (
          <View
            key={aviso.id}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.aviso}
          >
            <Icono size={18} color={aviso.tipo === "error" ? colors.destructive : colors.success} />
            <Text style={styles.texto}>{aviso.texto}</Text>
            {aviso.accion ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  aviso.accion?.onPress();
                  cerrar(aviso.id);
                }}
                style={styles.accion}
              >
                <Text style={styles.accionText}>{aviso.accion.label}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar aviso"
              onPress={() => cerrar(aviso.id)}
              style={styles.cerrar}
            >
              <X size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  zona: {
    position: "fixed" as "absolute",
    left: 16,
    right: 16,
    bottom: 88,
    alignItems: "center",
    gap: 8,
    zIndex: 50,
    // Taps go through the empty area to the page; the notices themselves stay tappable.
    pointerEvents: "box-none",
  },
  aviso: {
    width: "100%",
    maxWidth: 440,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    boxShadow: "0 12px 32px -12px rgba(0, 0, 0, 0.5)",
  },
  texto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  accion: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  accionText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primary,
  },
  cerrar: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
