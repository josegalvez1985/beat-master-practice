import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { contextoDeAudio } from "@/lib/audio";
import type { InstrumentId } from "@/lib/instruments";
import { cents, midiMasCercano, nota, notaDeTexto, type Nota } from "@/lib/notas";
import { afinacionesPara } from "@/lib/plan";

// Tuner: the microphone is analyzed in the browser (nothing is recorded or uploaded) and the
// pitch is compared with the instrument's strings, or with the nearest note (chromatic).

// Within this many cents a note counts as in tune.
export const AFINADO = 5;

// --- Instruments ---

const CUERDA = ["Muy bajo: tensa la cuerda", "Muy alto: afloja la cuerda"] as const;

type Config = {
  // Pitch range to look for (lowest note with room for drop tunings, up to the high harmonics).
  min: number;
  max: number;
  // What to do when the note is flat / sharp.
  ajuste: readonly [string, string];
  // Instruments without frets (and the voice) hold notes: show the pitch over time.
  historial?: boolean;
  // Note offered for the steady reference tone in chromatic mode (MIDI).
  referencia: number;
};

const CONFIG: Partial<Record<InstrumentId, Config>> = {
  guitarra: { min: 60, max: 1000, ajuste: CUERDA, referencia: 64 },
  bajo: { min: 35, max: 500, ajuste: CUERDA, referencia: 40 },
  ukelele: { min: 180, max: 1200, ajuste: CUERDA, referencia: 69 },
  violin: { min: 160, max: 1600, ajuste: CUERDA, historial: true, referencia: 69 },
  arpa: { min: 40, max: 2100, ajuste: CUERDA, referencia: 69 },
  saxofon: {
    min: 90,
    max: 1100,
    ajuste: ["Muy bajo: mete un poco la boquilla", "Muy alto: saca un poco la boquilla"],
    historial: true,
    referencia: 69,
  },
  flauta: {
    min: 240,
    max: 2500,
    ajuste: ["Muy bajo: mete un poco la cabeza", "Muy alto: saca un poco la cabeza"],
    historial: true,
    referencia: 69,
  },
  voz: {
    min: 70,
    max: 1100,
    ajuste: ["Un poco bajo: sube la voz", "Un poco alto: baja la voz"],
    historial: true,
    referencia: 57,
  },
};

export const afinable = (instrumento: InstrumentId) => instrumento in CONFIG;
export const configDe = (instrumento: InstrumentId) => CONFIG[instrumento] ?? CONFIG.guitarra!;

// Strings from the lowest (thickest) to the highest; no strings = chromatic (any note).
// `transporte`: semitones between the sounding note and the written one (saxophones).
export type Afinacion = { label: string; cuerdas: Nota[]; transporte?: number };

export function afinacionesDelAfinador(instrumento: InstrumentId): Afinacion[] {
  switch (instrumento) {
    case "guitarra":
    case "bajo":
    case "ukelele":
      return afinacionesPara(instrumento).map((a) => ({
        label: a.label,
        cuerdas: a.tex.split(" ").reverse().map(notaDeTexto),
      }));
    case "violin":
      return [
        { label: "Estándar (Sol Re La Mi)", cuerdas: ["G3", "D4", "A4", "E5"].map(notaDeTexto) },
      ];
    // An alto sounds a major sixth lower than written, a tenor a major ninth.
    case "saxofon":
      return [
        { label: "Saxo alto (Mib)", cuerdas: [], transporte: 9 },
        { label: "Saxo tenor (Sib)", cuerdas: [], transporte: 14 },
        { label: "Sonido real (Do)", cuerdas: [], transporte: 0 },
      ];
    // The Paraguayan harp has 32 to 38 strings tuned by key: the nearest note is what helps.
    default:
      return [];
  }
}

// `objetivo`: the note to reach (as written, for transposing instruments); `cents` from it.
export type Lectura = { objetivo: Nota; cuerda: number | null; cents: number };

// What the detected pitch is compared with: the fixed string, the nearest string, or the
// nearest note when there are no strings.
export function lectura(
  frecuencia: number,
  cuerdas: Nota[],
  fija: number | null,
  transporte = 0,
): Lectura {
  if (!cuerdas.length) {
    const sonido = nota(midiMasCercano(frecuencia));
    return {
      objetivo: nota(sonido.midi + transporte),
      cuerda: null,
      cents: cents(frecuencia, sonido.frecuencia),
    };
  }
  const distancia = (i: number) => Math.abs(cents(frecuencia, cuerdas[i]!.frecuencia));
  const cuerda =
    fija ?? cuerdas.reduce((mejor, _, i) => (distancia(i) < distancia(mejor) ? i : mejor), 0);
  const objetivo = cuerdas[cuerda]!;
  return { objetivo, cuerda, cents: cents(frecuencia, objetivo.frecuencia) };
}

// --- Pitch detection ---

// YIN (de Cheveigné & Kawahara, 2002): the period is the first lag at which the signal best
// matches itself shifted. Returns Hz, or null for silence or noise.
export function detectarFrecuencia(
  muestras: Float32Array,
  sampleRate: number,
  minHz: number,
  maxHz: number,
): number | null {
  let energia = 0;
  for (const muestra of muestras) energia += muestra * muestra;
  if (Math.sqrt(energia / muestras.length) < 0.01) return null;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz));
  const tauMax = Math.min(Math.floor(sampleRate / minHz), Math.floor(muestras.length / 2));
  const ventana = muestras.length - tauMax;
  const d = new Float32Array(tauMax + 1);
  let acumulado = 0;
  d[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) {
    let suma = 0;
    for (let i = 0; i < ventana; i++) {
      const delta = muestras[i]! - muestras[i + tau]!;
      suma += delta * delta;
    }
    acumulado += suma;
    // Cumulative mean normalized difference.
    d[tau] = acumulado ? (suma * tau) / acumulado : 1;
  }

  let tau = tauMin;
  while (tau < tauMax && d[tau]! >= 0.12) tau++;
  if (tau >= tauMax) return null;
  while (tau + 1 < tauMax && d[tau + 1]! < d[tau]!) tau++;

  // Parabolic interpolation between neighbouring lags, for sub-sample precision.
  const [a, b, c] = [d[tau - 1]!, d[tau]!, d[tau + 1]!];
  const curva = a + c - 2 * b;
  const exacto = curva ? tau + (a - c) / (2 * curva) : tau;
  return sampleRate / exacto;
}

const mediana = (valores: number[]) => {
  const orden = [...valores].sort((x, y) => x - y);
  return orden[Math.floor(orden.length / 2)]!;
};

export function mensajeDeMicrofono(error: unknown) {
  const nombre = error instanceof DOMException ? error.name : "";
  if (nombre === "NotAllowedError" || nombre === "SecurityError")
    return "Permite el uso del micrófono en tu navegador.";
  if (nombre === "NotFoundError") return "No encontramos un micrófono en este dispositivo.";
  if (nombre === "NotReadableError")
    return "Otra aplicación está usando el micrófono. Ciérrala y vuelve a intentar.";
  return "No se pudo abrir el micrófono.";
}

export type EstadoAfinador = "apagado" | "pidiendo" | "escuchando";

// Readings kept for the pitch-over-time chart: 3 seconds at one reading every 50 ms.
export const LECTURAS_HISTORIAL = 60;

// Listens to the microphone while on. `frecuencia` is the median of the last readings (steady
// needle) and goes back to null after a moment of silence; `historial` has every reading of the
// last 3 seconds (null = silence).
export function useAfinador(instrumento: InstrumentId) {
  const [estado, setEstado] = useState<EstadoAfinador>("apagado");
  const [error, setError] = useState<string | null>(null);
  const [lecturas, setLecturas] = useState<{
    frecuencia: number | null;
    historial: (number | null)[];
  }>({ frecuencia: null, historial: [] });
  const detener = useRef<(() => void) | null>(null);
  // Each start or stop invalidates the previous request (e.g. stopped while asking permission).
  const intento = useRef(0);
  const rango = useRef(configDe(instrumento));
  useLayoutEffect(() => {
    rango.current = configDe(instrumento);
  });

  useEffect(
    () => () => {
      intento.current += 1;
      detener.current?.();
      detener.current = null;
    },
    [],
  );

  // Call from a tap (Safari only starts audio after a user gesture).
  async function iniciar() {
    if (detener.current) return;
    const ctx = contextoDeAudio();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite usar el micrófono en esta página.");
      return;
    }
    const actual = ++intento.current;
    setError(null);
    setEstado("pidiendo");
    let stream: MediaStream;
    try {
      // Raw sound: the voice-call filters flatten the notes the tuner needs.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      if (actual === intento.current) {
        setEstado("apagado");
        setError(mensajeDeMicrofono(e));
      }
      return;
    }
    if (actual !== intento.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const fuente = ctx.createMediaStreamSource(stream);
    const analizador = ctx.createAnalyser();
    analizador.fftSize = 4096;
    fuente.connect(analizador);
    const muestras = new Float32Array(analizador.fftSize);
    const recientes: number[] = [];
    const historial: (number | null)[] = [];
    let frecuencia: number | null = null;
    let ultimaNota = 0;

    const timer = window.setInterval(() => {
      analizador.getFloatTimeDomainData(muestras);
      const hz = detectarFrecuencia(muestras, ctx.sampleRate, rango.current.min, rango.current.max);
      const ahora = performance.now();
      if (hz) {
        recientes.push(hz);
        if (recientes.length > 5) recientes.shift();
        ultimaNota = ahora;
        frecuencia = mediana(recientes);
      } else if (recientes.length && ahora - ultimaNota > 800) {
        recientes.length = 0;
        frecuencia = null;
      }
      historial.push(hz);
      if (historial.length > LECTURAS_HISTORIAL) historial.shift();
      setLecturas({ frecuencia, historial: [...historial] });
    }, 50);

    detener.current = () => {
      window.clearInterval(timer);
      fuente.disconnect();
      stream.getTracks().forEach((track) => track.stop());
    };
    setEstado("escuchando");
  }

  function parar() {
    intento.current += 1;
    detener.current?.();
    detener.current = null;
    setEstado("apagado");
    setLecturas({ frecuencia: null, historial: [] });
  }

  return { estado, error, ...lecturas, iniciar, parar };
}
