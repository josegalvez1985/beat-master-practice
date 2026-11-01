// One Web Audio context for every sound of the app (metronome, strums, reference tones, ear
// training). Browsers only start audio after a user gesture, so call these from a tap.

let contexto: AudioContext | null = null;

export function contextoDeAudio() {
  contexto ??= new AudioContext();
  if (contexto.state === "suspended") void contexto.resume();
  return contexto;
}

// A soft plucked tone; `retraso` in seconds lets a chord be strummed or a melody be played.
export function tocarNota(frecuencia: number, { retraso = 0, duracion = 1.6, volumen = 0.3 } = {}) {
  const ctx = contextoDeAudio();
  const t = ctx.currentTime + retraso;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = frecuencia;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volumen, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duracion + 0.05);
}

// Several notes at once (or one after the other with `separacion` seconds between them).
export function tocarNotas(frecuencias: number[], { separacion = 0.03, duracion = 1.8 } = {}) {
  const volumen = 0.3 / Math.max(1, Math.sqrt(frecuencias.length));
  frecuencias.forEach((f, i) => tocarNota(f, { retraso: i * separacion, duracion, volumen }));
}

// A steady tone (drone) to tune or sing against; returns the function that fades it out.
export function sostenerNota(frecuencia: number) {
  const ctx = contextoDeAudio();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = frecuencia;
  const filtro = ctx.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.value = Math.min(4000, frecuencia * 4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.15);
  osc.connect(filtro).connect(gain).connect(ctx.destination);
  osc.start(t);
  return () => {
    const fin = ctx.currentTime;
    gain.gain.cancelScheduledValues(fin);
    gain.gain.setValueAtTime(gain.gain.value, fin);
    gain.gain.exponentialRampToValueAtTime(0.0001, fin + 0.2);
    osc.stop(fin + 0.25);
  };
}
