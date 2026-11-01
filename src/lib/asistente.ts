import { useSyncExternalStore } from "react";

// The assistant's conversation: in memory only (it can carry the person's data), tied to who is
// signed in, and gone when the page is closed. The question goes to the Cloud Function
// preguntarAsistente (functions/src/asistente.ts).

export type MensajeChat = {
  id: number;
  rol: "usuario" | "asistente";
  texto: string;
  error?: boolean;
};

type Estado = {
  uid: string | null;
  abierto: boolean;
  mensajes: MensajeChat[];
  cargando: boolean;
  usadasHoy: number | null;
  limite: number | null;
};

let estado: Estado = {
  uid: null,
  abierto: false,
  mensajes: [],
  cargando: false,
  usadasHoy: null,
  limite: null,
};
let siguienteId = 1;
const listeners = new Set<() => void>();

function cambiar(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial };
  listeners.forEach((listener) => listener());
}

export function useAsistente() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => estado,
  );
}

export const abrirAsistente = (abierto: boolean) => cambiar({ abierto });
export const nuevaConversacion = () => cambiar({ mensajes: [] });

// Another account signed in: its conversation starts from zero.
export function usarCuenta(uid: string) {
  if (estado.uid !== uid)
    cambiar({ uid, mensajes: [], abierto: false, usadasHoy: null, limite: null });
}

function mensajeDeError(error: unknown) {
  const e = error as { code?: string; message?: string };
  const generico = !e.message || /^(internal|not[- ]found)$/i.test(e.message.trim());
  if (e.code === "functions/not-found" || (e.code === "functions/internal" && generico))
    return "El asistente no está disponible en este momento. Si se acaba de instalar, falta publicar la función en Firebase.";
  if (e.code === "functions/deadline-exceeded")
    return "La respuesta tardó demasiado. Prueba con una pregunta más corta.";
  if (e.code === "functions/unavailable" && generico)
    return "No hay conexión con el asistente. Revisa tu internet y vuelve a intentar.";
  return e.message ?? "No se pudo responder. Vuelve a intentar.";
}

export async function preguntar(texto: string, pantalla: string) {
  const pregunta = texto.trim();
  if (!pregunta || estado.cargando) return;
  const historial = estado.mensajes
    .filter((m) => !m.error)
    .map(({ rol, texto: t }) => ({ rol, texto: t }));
  cambiar({
    mensajes: [...estado.mensajes, { id: siguienteId++, rol: "usuario", texto: pregunta }],
    cargando: true,
  });
  try {
    const { enviarPregunta } = await import("@/lib/asistente-envio");
    const r = await enviarPregunta({ pregunta, historial, pantalla });
    cambiar({
      mensajes: [...estado.mensajes, { id: siguienteId++, rol: "asistente", texto: r.respuesta }],
      usadasHoy: r.usadasHoy,
      limite: r.limite,
    });
  } catch (error) {
    cambiar({
      mensajes: [
        ...estado.mensajes,
        { id: siguienteId++, rol: "asistente", texto: mensajeDeError(error), error: true },
      ],
    });
  } finally {
    cambiar({ cargando: false });
  }
}

// The last question again, after an error.
export function reintentar(pantalla: string) {
  const mensajes = estado.mensajes.filter((m) => !m.error);
  const ultima = mensajes.at(-1);
  if (ultima?.rol !== "usuario") return;
  cambiar({ mensajes: mensajes.slice(0, -1) });
  void preguntar(ultima.texto, pantalla);
}
