import { afinable, configDe, detectarFrecuencia } from "@/lib/afinador";
import type { Material } from "@/lib/files";
import type { InstrumentId } from "@/lib/instruments";
import { cents, frecuenciaDe, midiMasCercano } from "@/lib/notas";
import { esPercusion, familia } from "@/lib/plan";

// Automatic look at a recording before it is sent: how in tune the held notes are and how
// steady the time is. Everything runs in the browser on the take; only the numbers are saved
// with the file (`Material.analisis`), so the profesor sees them next to the recording.

export type Analisis = NonNullable<Material["analisis"]>;

// Tuning is measured only where the player makes the pitch: bowed strings, winds and voice. With
// frets or fixed strings the number would mostly say how the instrument is tuned, and the detector
// follows one note at a time, so chords would confuse it.
export const mideAfinacion = (instrumento: InstrumentId) =>
  afinable(instrumento) && !!configDe(instrumento).historial;

// Longer takes are not analyzed: decoding keeps the whole take in memory.
export const MAX_SEGUNDOS_ANALISIS = 5 * 60;
const TASA = 22050;
// A held note counts as in tune within this many cents (room for vibrato and glides).
const AFINADO_MARGEN = 15;
// Average distance of the attacks from the grid: up to this, the time is very steady.
export const MUY_ESTABLE_MS = 15;

const pausa = () => new Promise((resolve) => setTimeout(resolve, 0));

// Decoding only: an OfflineAudioContext resamples to 22 kHz and makes no sound (the app's
// sounds still come from the single context of src/lib/audio.ts).
async function decodificar(file: Blob) {
  const datos = await file.arrayBuffer();
  const buffer = await new OfflineAudioContext(1, 1, TASA).decodeAudioData(datos);
  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const canal = buffer.getChannelData(c);
    for (let i = 0; i < canal.length; i++) mono[i]! += canal[i]! / buffer.numberOfChannels;
  }
  return { muestras: mono, tasa: buffer.sampleRate };
}

// `bpm`: the click it was recorded with, if any (otherwise the tempo is estimated).
export async function analizarToma(
  file: Blob,
  instrumento: InstrumentId,
  bpm?: number,
): Promise<Analisis | null> {
  if (typeof OfflineAudioContext === "undefined") return null;
  let audio: Awaited<ReturnType<typeof decodificar>>;
  try {
    audio = await decodificar(file);
  } catch {
    return null;
  }
  const resultado: Analisis = {};
  if (mideAfinacion(instrumento)) {
    const afinacion = await medirAfinacion(audio.muestras, audio.tasa, instrumento);
    if (afinacion) Object.assign(resultado, afinacion);
  }
  // Bowed, blown and sung notes start softly: their attacks are not clear enough to time.
  if (["cuerdas", "teclados", "percusion"].includes(familia(instrumento))) {
    const tiempo = await medirTiempo(audio.muestras, audio.tasa, bpm, esPercusion(instrumento));
    if (tiempo) Object.assign(resultado, tiempo);
  }
  return Object.keys(resultado).length ? resultado : null;
}

// --- Pitch: held notes (two or more frames on the same note) and their median deviation ---

async function medirAfinacion(muestras: Float32Array, tasa: number, instrumento: InstrumentId) {
  const config = configDe(instrumento);
  const tamano = 2048;
  const salto = Math.round(tasa * 0.1);
  const fin = Math.min(muestras.length - tamano, tasa * 120);
  const notas: number[] = [];
  let actual = null as { midi: number; desvios: number[] } | null;
  const cerrar = () => {
    if (actual && actual.desvios.length >= 2) {
      const orden = [...actual.desvios].sort((a, b) => a - b);
      notas.push(orden[Math.floor(orden.length / 2)]!);
    }
    actual = null;
  };
  for (let i = 0, n = 0; i < fin; i += salto, n++) {
    if (n % 50 === 0) await pausa();
    const hz = detectarFrecuencia(muestras.subarray(i, i + tamano), tasa, config.min, config.max);
    if (!hz) {
      cerrar();
      continue;
    }
    const midi = midiMasCercano(hz);
    if (actual?.midi !== midi) {
      cerrar();
      actual = { midi, desvios: [] };
    }
    actual!.desvios.push(cents(hz, frecuenciaDe(midi)));
  }
  cerrar();
  if (notas.length < 4) return null;
  return {
    notas: notas.length,
    afinacion: Math.round(
      (notas.filter((c) => Math.abs(c) <= AFINADO_MARGEN).length / notas.length) * 100,
    ),
  };
}

// --- Time: attacks (sudden jumps of energy) against a straight grid of eighth notes ---

function ataques(muestras: Float32Array, tasa: number, percusion: boolean) {
  const salto = Math.round(tasa * 0.01);
  const energias: number[] = [];
  for (let i = 0; i + salto <= muestras.length; i += salto) {
    let e = 0;
    for (let k = i; k < i + salto; k++) e += muestras[k]! * muestras[k]!;
    energias.push(Math.sqrt(e / salto));
  }
  const tiempos: number[] = [];
  let media = 0;
  let ultimo = -1;
  // Drums attack hard; other instruments need a smaller jump.
  const factor = percusion ? 3 : 2;
  for (let i = 0; i < energias.length; i++) {
    const e = energias[i]!;
    const t = (i * salto) / tasa;
    if (e > Math.max(0.02, media * factor) && t - ultimo > 0.09) {
      tiempos.push(t);
      ultimo = t;
    }
    media = media * 0.9 + e * 0.1;
  }
  return tiempos;
}

// Beat period from the intervals between attacks: the most common one, folded into 50-200 BPM.
function estimarPulso(tiempos: number[]) {
  const votos = new Map<number, number>();
  for (let i = 1; i < tiempos.length; i++) {
    for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
      let intervalo = tiempos[i]! - tiempos[j]!;
      if (intervalo < 0.1) continue;
      while (intervalo < 0.3) intervalo *= 2;
      while (intervalo > 1.2) intervalo /= 2;
      const bpm = Math.round(60 / intervalo / 2) * 2;
      votos.set(bpm, (votos.get(bpm) ?? 0) + 1);
    }
  }
  let mejor = 0;
  let cuenta = 0;
  for (const [bpm, v] of votos) if (v > cuenta) [mejor, cuenta] = [bpm, v];
  return mejor || null;
}

async function medirTiempo(
  muestras: Float32Array,
  tasa: number,
  bpmClick: number | undefined,
  percusion: boolean,
) {
  await pausa();
  const tiempos = ataques(muestras, tasa, percusion);
  if (tiempos.length < 8) return null;
  const bpm = bpmClick ?? estimarPulso(tiempos);
  if (!bpm) return null;
  // Each attack goes to the nearest eighth; the grid is fitted by least squares (only its start
  // with a click; start and period without one, so a steady but different tempo is not wrong).
  let periodo = 60 / bpm / 2;
  let inicio = tiempos[0]!;
  let residuos: number[] = [];
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    const k = tiempos.map((t) => Math.round((t - inicio) / periodo));
    if (bpmClick) {
      inicio = tiempos.reduce((s, t, i) => s + t - k[i]! * periodo, 0) / tiempos.length;
    } else {
      const n = tiempos.length;
      const sk = k.reduce((a, b) => a + b, 0);
      const st = tiempos.reduce((a, b) => a + b, 0);
      const skk = k.reduce((a, b) => a + b * b, 0);
      const skt = k.reduce((a, b, i) => a + b * tiempos[i]!, 0);
      const den = n * skk - sk * sk;
      if (den) {
        periodo = (n * skt - sk * st) / den;
        inicio = (st - periodo * sk) / n;
      }
    }
    residuos = tiempos.map((t, i) => t - (inicio + k[i]! * periodo));
  }
  const desvio = residuos.reduce((a, r) => a + Math.abs(r), 0) / residuos.length;
  return { desvioMs: Math.round(desvio * 1000), bpm: Math.round(60 / periodo / 2) };
}

// What the numbers mean, in words for the alumno and the profesor. With `instrumento`, recordings
// from before mideAfinacion do not show a tuning number that says little.
export function resumenAnalisis(a: Analisis, instrumento?: InstrumentId) {
  const partes: string[] = [];
  if (a.afinacion !== undefined && (!instrumento || mideAfinacion(instrumento)))
    partes.push(`${a.afinacion}% de notas afinadas`);
  if (a.desvioMs !== undefined)
    partes.push(
      `tiempo ${a.desvioMs <= MUY_ESTABLE_MS ? "muy estable" : a.desvioMs <= 30 ? "estable" : "irregular"} (±${a.desvioMs} ms)`,
    );
  if (a.bpm) partes.push(`${a.bpm} BPM`);
  return partes.join(" · ");
}
