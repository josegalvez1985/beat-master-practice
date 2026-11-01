import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { contextoDeAudio } from "@/lib/audio";

// Metronome with Web Audio: sounds are scheduled slightly ahead on the audio clock, so the
// tempo stays exact even when the page is busy; the UI only follows the current slot.

// `subdivision`: the soft click between beats (eighths, triplets, sixteenths).
export type Sonido = "acento" | "pulso" | "subdivision" | "abajo" | "arriba" | "apagado";

let ruido: AudioBuffer | null = null;

function bufferDeRuido(ctx: AudioContext) {
  if (!ruido) {
    ruido = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const data = ruido.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return ruido;
}

// One metronome sound at `cuando` (audio clock); also used by the drum practice tools.
export function sonar(ctx: AudioContext, sonido: Sonido, cuando: number) {
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  if (sonido === "acento" || sonido === "pulso" || sonido === "subdivision") {
    // Short sine click; higher and louder on beat one, soft and low between beats.
    const osc = ctx.createOscillator();
    osc.frequency.value = sonido === "acento" ? 1600 : sonido === "pulso" ? 1000 : 800;
    gain.gain.setValueAtTime(sonido === "acento" ? 0.5 : sonido === "pulso" ? 0.3 : 0.12, cuando);
    gain.gain.exponentialRampToValueAtTime(0.001, cuando + 0.05);
    osc.connect(gain);
    osc.start(cuando);
    osc.stop(cuando + 0.06);
    return;
  }
  // Strum: filtered noise burst, darker going down, brighter going up, short when muted.
  const source = ctx.createBufferSource();
  source.buffer = bufferDeRuido(ctx);
  const filtro = ctx.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.frequency.value = sonido === "abajo" ? 900 : sonido === "arriba" ? 2200 : 3500;
  filtro.Q.value = 0.8;
  const largo = sonido === "apagado" ? 0.03 : 0.16;
  gain.gain.setValueAtTime(sonido === "apagado" ? 0.5 : 0.35, cuando);
  gain.gain.exponentialRampToValueAtTime(0.001, cuando + largo);
  source.connect(filtro);
  filtro.connect(gain);
  source.start(cuando);
  source.stop(cuando + largo + 0.02);
}

// Plays `slots` per cycle, `porPulso` slots per beat at `bpm`; `sonidoDe` picks each slot's
// sound (null = silent) and `programar` can schedule more sounds at that exact audio time (the
// drum kit of a groove). Returns the slot sounding now, or -1 when stopped.
export function useMetronomo({
  activo,
  bpm,
  slots,
  porPulso = 1,
  sonidoDe,
  programar: programarExtra,
}: {
  activo: boolean;
  bpm: number;
  slots: number;
  porPulso?: number;
  sonidoDe: (slot: number) => Sonido | null;
  programar?: (slot: number, cuando: number, ctx: AudioContext) => void;
}) {
  const [actual, setActual] = useState(-1);
  // Latest values without restarting the scheduler (tempo changes apply on the next slot).
  const config = useRef({ bpm, slots, porPulso, sonidoDe, programarExtra });
  useLayoutEffect(() => {
    config.current = { bpm, slots, porPulso, sonidoDe, programarExtra };
  });

  useEffect(() => {
    if (!activo) return;
    const ctx = contextoDeAudio();
    let slot = 0;
    let siguiente = ctx.currentTime + 0.06;
    const visuales: number[] = [];

    const programar = () => {
      while (siguiente < ctx.currentTime + 0.12) {
        const {
          bpm: tempo,
          slots: total,
          porPulso: subdivision,
          sonidoDe: sonido,
          programarExtra: extra,
        } = config.current;
        const actualSlot = slot % total;
        const tipo = sonido(actualSlot);
        if (tipo) sonar(ctx, tipo, siguiente);
        extra?.(actualSlot, siguiente, ctx);
        const espera = Math.max(0, (siguiente - ctx.currentTime) * 1000);
        visuales.push(window.setTimeout(() => setActual(actualSlot), espera));
        // Older timeouts already fired; keep only the pending ones to clear on stop.
        if (visuales.length > 64) visuales.splice(0, 32);
        siguiente += 60 / tempo / subdivision;
        slot += 1;
      }
    };
    programar();
    const timer = window.setInterval(programar, 25);
    return () => {
      window.clearInterval(timer);
      visuales.forEach((id) => window.clearTimeout(id));
      setActual(-1);
    };
  }, [activo]);

  return activo ? actual : -1;
}
