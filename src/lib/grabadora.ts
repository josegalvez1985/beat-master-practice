import { useEffect, useRef, useState } from "react";
import { mensajeDeMicrofono } from "@/lib/afinador";
import { aFecha } from "@/lib/dates";

// Records audio or video in the browser (MediaRecorder). The take stays here until the student
// sends it as a delivery or downloads it; nothing is uploaded without them asking.

export type ModoGrabacion = "audio" | "video";

// Keeps a take far below the 200 MB per file of storage.rules (video at about 1.5 Mbit/s).
export const MAX_SEGUNDOS: Record<ModoGrabacion, number> = { audio: 30 * 60, video: 10 * 60 };

const TIPOS: Record<ModoGrabacion, string[]> = {
  audio: ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"],
  video: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"],
};

const extension = (tipo: string) =>
  tipo.includes("mp4")
    ? tipo.startsWith("audio")
      ? "m4a"
      : "mp4"
    : tipo.includes("ogg")
      ? "ogg"
      : "webm";

export type Toma = { file: File; url: string; modo: ModoGrabacion; segundos: number };
export type EstadoGrabadora = "inactiva" | "pidiendo" | "contando" | "grabando" | "lista";

export function useGrabadora() {
  const [estado, setEstado] = useState<EstadoGrabadora>("inactiva");
  const [error, setError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [vista, setVista] = useState<MediaStream | null>(null);
  const [toma, setToma] = useState<Toma | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const intento = useRef(0);
  const tomaActual = useRef<Toma | null>(null);
  const flujo = useRef<MediaStream | null>(null);

  useEffect(
    () => () => {
      intento.current += 1;
      if (recorder.current?.state === "recording") recorder.current.stop();
      if (tomaActual.current) URL.revokeObjectURL(tomaActual.current.url);
    },
    [],
  );

  // `preparar`: runs once the permission is granted, before recording (the count-in, so the first
  // seconds of the take are not the hands going back to the instrument).
  async function grabar(modo: ModoGrabacion, preparar?: () => Promise<void>) {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no puede grabar en esta página. Prueba con Chrome, Edge o Safari.");
      return;
    }
    const actual = ++intento.current;
    setError(null);
    setEstado("pidiendo");
    let stream: MediaStream;
    try {
      // Music, not a call: no echo cancellation, noise suppression or automatic gain.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video:
          modo === "video"
            ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
      });
    } catch (e) {
      if (actual === intento.current) {
        setEstado("inactiva");
        setError(
          modo === "video" && e instanceof DOMException && e.name === "NotFoundError"
            ? "No encontramos una cámara en este dispositivo."
            : mensajeDeMicrofono(e),
        );
      }
      return;
    }
    if (actual !== intento.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    flujo.current = stream;
    if (preparar) {
      setVista(modo === "video" ? stream : null);
      setEstado("contando");
      await preparar();
      if (actual !== intento.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
    }

    const tipo = TIPOS[modo].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const grabador = new MediaRecorder(stream, {
      ...(tipo ? { mimeType: tipo } : {}),
      audioBitsPerSecond: 128_000,
      videoBitsPerSecond: 1_500_000,
    });
    const partes: Blob[] = [];
    const inicio = Date.now();
    const timer = window.setInterval(() => {
      const transcurrido = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(transcurrido);
      if (transcurrido >= MAX_SEGUNDOS[modo]) grabador.stop();
    }, 250);

    grabador.ondataavailable = (e) => {
      if (e.data.size) partes.push(e.data);
    };
    grabador.onstop = () => {
      window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      setVista(null);
      if (actual !== intento.current) return;
      const tipoFinal = (grabador.mimeType || tipo || `${modo}/webm`).split(";")[0]!;
      const ahora = new Date();
      const hora = `${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}`;
      const file = new File(partes, `practica-${aFecha(ahora)}-${hora}.${extension(tipoFinal)}`, {
        type: tipoFinal,
      });
      const nueva = {
        file,
        url: URL.createObjectURL(file),
        modo,
        segundos: Math.round((Date.now() - inicio) / 1000),
      };
      tomaActual.current = nueva;
      setToma(nueva);
      setEstado("lista");
    };

    recorder.current = grabador;
    grabador.start(1000);
    setSegundos(0);
    setVista(modo === "video" ? stream : null);
    setEstado("grabando");
  }

  function detener() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function descartar() {
    if (tomaActual.current) URL.revokeObjectURL(tomaActual.current.url);
    tomaActual.current = null;
    setToma(null);
    setEstado("inactiva");
    setSegundos(0);
  }

  // Backs out during the count-in: nothing was recorded.
  function cancelar() {
    intento.current += 1;
    flujo.current?.getTracks().forEach((track) => track.stop());
    setVista(null);
    setEstado("inactiva");
  }

  // A take kept in this browser (src/lib/borrador.ts) comes back ready to listen to and send.
  function restaurar(file: File, modo: ModoGrabacion, duracion: number) {
    if (tomaActual.current) URL.revokeObjectURL(tomaActual.current.url);
    const nueva = { file, url: URL.createObjectURL(file), modo, segundos: duracion };
    tomaActual.current = nueva;
    setToma(nueva);
    setEstado("lista");
  }

  return { estado, error, segundos, vista, toma, grabar, detener, descartar, cancelar, restaurar };
}
