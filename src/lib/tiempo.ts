import { useEffect, useRef, useState } from "react";
import { mensajeDeMicrofono } from "@/lib/afinador";
import { contextoDeAudio } from "@/lib/audio";
import { sonarVoz } from "@/lib/bateria";
import { sonar } from "@/lib/metronomo";

// Timing tools for drummers: hits are detected from the microphone with their exact time on the
// audio clock, and compared with the click (scheduled on that same clock). Nothing is recorded.

// AudioWorklet: energy of each 128-sample block (~3 ms); a hit is a sudden jump over the recent
// level, at least 70 ms after the previous one. Reports the time of its first loud sample.
const PROCESADOR = `
class PulsoGolpes extends AudioWorkletProcessor {
  constructor() { super(); this.media = 0; this.ultimo = -1; }
  process(inputs) {
    const canal = inputs[0] && inputs[0][0];
    if (!canal) return true;
    let e = 0;
    for (let i = 0; i < canal.length; i++) e += canal[i] * canal[i];
    e = Math.sqrt(e / canal.length);
    const umbral = Math.max(0.02, this.media * 3);
    if (e > umbral && currentTime - this.ultimo > 0.07) {
      let k = 0;
      while (k < canal.length && Math.abs(canal[k]) < umbral) k++;
      this.ultimo = currentTime + k / sampleRate;
      this.port.postMessage(this.ultimo);
    }
    this.media = this.media * 0.97 + e * 0.03;
    return true;
  }
}
registerProcessor("pulso-golpes", PulsoGolpes);
`;

const cargados = new WeakSet<BaseAudioContext>();

// Opens the microphone and calls `onGolpe` with the audio-clock time of each hit.
// Returns the function that closes it. Throws a message for the person.
export async function escucharGolpes(onGolpe: (tiempo: number) => void) {
  const ctx = contextoDeAudio();
  if (!navigator.mediaDevices?.getUserMedia || !ctx.audioWorklet)
    throw new Error("Tu navegador no permite usar el micrófono en esta página.");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (e) {
    throw new Error(mensajeDeMicrofono(e));
  }
  if (!cargados.has(ctx)) {
    const url = URL.createObjectURL(new Blob([PROCESADOR], { type: "text/javascript" }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    cargados.add(ctx);
  }
  const fuente = ctx.createMediaStreamSource(stream);
  const nodo = new AudioWorkletNode(ctx, "pulso-golpes");
  // Connected to a silent output so the browser keeps processing it.
  const mudo = ctx.createGain();
  mudo.gain.value = 0;
  fuente.connect(nodo).connect(mudo).connect(ctx.destination);
  nodo.port.onmessage = (e: MessageEvent<number>) => onGolpe(e.data);
  return () => {
    nodo.port.onmessage = null;
    fuente.disconnect();
    nodo.disconnect();
    mudo.disconnect();
    stream.getTracks().forEach((track) => track.stop());
  };
}

// Delay between hearing the click and the hit reaching the microphone (headphones, speakers,
// the microphone itself): measured once per device by calibrating.
const CLAVE_LATENCIA = "pulso-latencia";

export function latenciaGuardada(): number | null {
  try {
    const valor = localStorage.getItem(CLAVE_LATENCIA);
    return valor === null ? null : Number(valor);
  } catch {
    return null;
  }
}

function guardarLatencia(ms: number) {
  try {
    localStorage.setItem(CLAVE_LATENCIA, String(Math.round(ms)));
  } catch {
    // Without storage it lasts until the page is closed.
  }
}

const mediana = (valores: number[]) => {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.floor(orden.length / 2)] ?? 0;
};

// Within this many ms a hit counts as on time.
export const A_TIEMPO_MS = 25;

export function estadisticas(desvios: number[]) {
  if (!desvios.length) return null;
  const promedio = desvios.reduce((a, b) => a + b, 0) / desvios.length;
  const varianza = desvios.reduce((a, d) => a + (d - promedio) ** 2, 0) / desvios.length;
  return {
    promedio,
    desviacion: Math.sqrt(varianza),
    aTiempo: Math.round(
      (desvios.filter((d) => Math.abs(d) <= A_TIEMPO_MS).length / desvios.length) * 100,
    ),
  };
}

export type EstadoMedidor = "apagado" | "pidiendo" | "calibrando" | "midiendo";
const GOLPES_CALIBRACION = 8;
const CUENTA = 4;

// Click (heard, or only shown) and every hit compared with the nearest step of the grid:
// negative = early (rushing), positive = late (dragging).
export function useMedidorTiempo() {
  const [estado, setEstado] = useState<EstadoMedidor>("apagado");
  const [error, setError] = useState<string | null>(null);
  const [desvios, setDesvios] = useState<number[]>([]);
  const [pulso, setPulso] = useState(-1);
  const [latencia, setLatencia] = useState<number | null>(latenciaGuardada);
  const [calibrados, setCalibrados] = useState(0);
  const detener = useRef<(() => void) | null>(null);

  useEffect(() => () => detener.current?.(), []);

  function parar() {
    detener.current?.();
    detener.current = null;
    setEstado("apagado");
    setPulso(-1);
  }

  // Call from a tap (browsers only start audio after a user gesture).
  async function iniciar({
    bpm,
    subdivision,
    conSonido,
    calibrar,
  }: {
    bpm: number;
    subdivision: number;
    conSonido: boolean;
    calibrar: boolean;
  }) {
    if (detener.current) return;
    const ctx = contextoDeAudio();
    setError(null);
    setEstado("pidiendo");
    const beat = 60 / bpm;
    const crudos: number[] = [];
    let inicio = 0;
    const onGolpe = (t: number) => {
      // The count-in bar is for getting ready.
      if (!inicio || t < inicio + (CUENTA - 0.5) * beat) return;
      const desde = t - inicio;
      if (calibrar) {
        const n = Math.round(desde / beat);
        crudos.push((desde - n * beat) * 1000);
        setCalibrados(crudos.length);
        if (crudos.length >= GOLPES_CALIBRACION) {
          const ms = mediana(crudos);
          guardarLatencia(ms);
          setLatencia(ms);
          parar();
        }
        return;
      }
      const corregido = desde - (latenciaGuardada() ?? 0) / 1000;
      const espacio = beat / subdivision;
      const n = Math.round(corregido / espacio);
      const desvio = (corregido - n * espacio) * 1000;
      setDesvios((lista) => [...lista.slice(-63), desvio]);
    };

    let cerrarMicrofono: () => void;
    try {
      cerrarMicrofono = await escucharGolpes(onGolpe);
    } catch (e) {
      setEstado("apagado");
      setError(e instanceof Error ? e.message : "No se pudo abrir el micrófono.");
      return;
    }

    inicio = ctx.currentTime + 0.4;
    let k = 0;
    const visuales: number[] = [];
    const programar = () => {
      while (inicio + k * beat < ctx.currentTime + 0.12) {
        const cuando = inicio + k * beat;
        if (conSonido) sonar(ctx, k % 4 === 0 ? "acento" : "pulso", cuando);
        const beatActual = k % 4;
        visuales.push(
          window.setTimeout(
            () => setPulso(beatActual),
            Math.max(0, (cuando - ctx.currentTime) * 1000),
          ),
        );
        if (visuales.length > 32) visuales.splice(0, 16);
        k += 1;
      }
    };
    programar();
    const timer = window.setInterval(programar, 25);
    detener.current = () => {
      window.clearInterval(timer);
      visuales.forEach((id) => window.clearTimeout(id));
      cerrarMicrofono();
    };
    setDesvios([]);
    setCalibrados(0);
    setEstado(calibrar ? "calibrando" : "midiendo");
  }

  return { estado, error, desvios, pulso, latencia, calibrados, iniciar, parar };
}

// --- Rhythm reading: play a one-bar rhythm, or listen to someone playing it ---

const SEMICORCHEAS = 16;

// Schedules a count-in bar of clicks, then the bar with clicks on the beats (and, if
// `conCaja`, the rhythm on the snare). Returns where the rhythm bar starts and ends.
export function programarRitmo(ritmo: boolean[], bpm: number, conCaja: boolean) {
  const ctx = contextoDeAudio();
  const beat = 60 / bpm;
  const inicio = ctx.currentTime + 0.2;
  for (let k = 0; k < CUENTA * 2; k++)
    sonar(ctx, k % 4 === 0 ? "acento" : "pulso", inicio + k * beat);
  const compas = inicio + CUENTA * beat;
  if (conCaja)
    ritmo.forEach((golpe, i) => {
      if (golpe) sonarVoz(ctx, "caja", compas + (i * beat) / 4, 0.8);
    });
  return { ctx, compas, fin: compas + CUENTA * beat, semicorchea: beat / 4 };
}

export type Resultado = { estados: ("ok" | "casi" | "falta")[]; demas: number; aciertos: number };

// Matches each written note with the nearest hit (each hit used once).
export function evaluarRitmo(
  ritmo: boolean[],
  golpes: number[],
  compas: number,
  semicorchea: number,
): Resultado {
  const libres = [...golpes];
  const estados: Resultado["estados"] = [];
  for (let i = 0; i < SEMICORCHEAS; i++) {
    if (!ritmo[i]) continue;
    const esperado = compas + i * semicorchea;
    let mejor = -1;
    libres.forEach((g, j) => {
      if (
        Math.abs(g - esperado) <= 0.12 &&
        (mejor < 0 || Math.abs(g - esperado) < Math.abs(libres[mejor]! - esperado))
      )
        mejor = j;
    });
    if (mejor < 0) estados.push("falta");
    else {
      estados.push(Math.abs(libres[mejor]! - esperado) <= 0.05 ? "ok" : "casi");
      libres.splice(mejor, 1);
    }
  }
  return { estados, demas: libres.length, aciertos: estados.filter((e) => e !== "falta").length };
}
