import { colors } from "@/lib/theme";

// Drum kit: voices, synthesized sounds (no sample files), grooves, rudiments and rhythms for
// reading and ear training. Grooves are stored inside the class plan (clases.bloques), one string
// per voice: Firestore does not allow arrays of arrays.

// --- Voices ---

export type Voz =
  | "crash"
  | "ride"
  | "hihat"
  | "hihatAbierto"
  | "hihatPie"
  | "caja"
  | "rim"
  | "tom1"
  | "tom2"
  | "tomPiso"
  | "bombo";

type Grupo = "platillo" | "caja" | "tom" | "bombo";

export const VOCES: { id: Voz; label: string; grupo: Grupo }[] = [
  { id: "crash", label: "Crash", grupo: "platillo" },
  { id: "ride", label: "Ride", grupo: "platillo" },
  { id: "hihat", label: "Hi-hat", grupo: "platillo" },
  { id: "hihatAbierto", label: "Hi-hat abierto", grupo: "platillo" },
  { id: "hihatPie", label: "Hi-hat pie", grupo: "platillo" },
  { id: "caja", label: "Caja", grupo: "caja" },
  { id: "rim", label: "Aro (rim)", grupo: "caja" },
  { id: "tom1", label: "Tom 1", grupo: "tom" },
  { id: "tom2", label: "Tom 2", grupo: "tom" },
  { id: "tomPiso", label: "Tom de piso", grupo: "tom" },
  { id: "bombo", label: "Bombo", grupo: "bombo" },
];

export const colorDeVoz = (voz: Voz) => {
  const grupo = VOCES.find((v) => v.id === voz)?.grupo ?? "caja";
  return {
    platillo: colors.vozPlatillo,
    caja: colors.vozCaja,
    tom: colors.vozTom,
    bombo: colors.vozBombo,
  }[grupo];
};

// One character per step: "." rest, "x" hit, ">" accent, "o" ghost note.
export type Golpe = "." | "x" | ">" | "o";
export const SIGUIENTE_GOLPE: Record<Golpe, Golpe> = { ".": "x", x: ">", ">": "o", o: "." };
const INTENSIDAD: Record<Golpe, number> = { ".": 0, x: 0.8, ">": 1.15, o: 0.28 };

// --- Synthesized kit (Web Audio) ---

let ruido: AudioBuffer | null = null;
function bufferDeRuido(ctx: AudioContext) {
  if (!ruido || ruido.sampleRate !== ctx.sampleRate) {
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = ruido.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return ruido;
}

function salida(ctx: AudioContext, volumen: number, cuando: number, largo: number, pan = 0) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(Math.max(0.0001, volumen), cuando);
  gain.gain.exponentialRampToValueAtTime(0.0001, cuando + largo);
  if (pan) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    gain.connect(panner).connect(ctx.destination);
  } else gain.connect(ctx.destination);
  return gain;
}

function ruidoFiltrado(
  ctx: AudioContext,
  destino: AudioNode,
  cuando: number,
  largo: number,
  tipo: BiquadFilterType,
  frecuencia: number,
  q = 0.7,
) {
  const fuente = ctx.createBufferSource();
  fuente.buffer = bufferDeRuido(ctx);
  const filtro = ctx.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = frecuencia;
  filtro.Q.value = q;
  fuente.connect(filtro).connect(destino);
  fuente.start(cuando, Math.random() * 0.5);
  fuente.stop(cuando + largo + 0.02);
}

function tono(
  ctx: AudioContext,
  destino: AudioNode,
  cuando: number,
  largo: number,
  desde: number,
  hasta: number,
  tipo: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  osc.type = tipo;
  osc.frequency.setValueAtTime(desde, cuando);
  osc.frequency.exponentialRampToValueAtTime(hasta, cuando + largo * 0.6);
  osc.connect(destino);
  osc.start(cuando);
  osc.stop(cuando + largo + 0.02);
}

// Plays one drum voice at `cuando` (audio clock); `intensidad` ~0.3 ghost … 1.15 accent;
// `pan` -1 left … 1 right (the left and right hands of a rudiment).
export function sonarVoz(ctx: AudioContext, voz: Voz, cuando: number, intensidad = 0.8, pan = 0) {
  const v = intensidad;
  switch (voz) {
    case "bombo": {
      const g = salida(ctx, 0.9 * v, cuando, 0.45, pan);
      tono(ctx, g, cuando, 0.45, 140, 45);
      return;
    }
    case "caja": {
      ruidoFiltrado(ctx, salida(ctx, 0.55 * v, cuando, 0.18, pan), cuando, 0.18, "bandpass", 1900);
      tono(ctx, salida(ctx, 0.35 * v, cuando, 0.1, pan), cuando, 0.1, 230, 180, "triangle");
      return;
    }
    case "rim": {
      tono(ctx, salida(ctx, 0.3 * v, cuando, 0.04, pan), cuando, 0.04, 1700, 1500, "square");
      return;
    }
    case "hihat":
      ruidoFiltrado(ctx, salida(ctx, 0.3 * v, cuando, 0.05, pan), cuando, 0.05, "highpass", 7500);
      return;
    case "hihatAbierto":
      ruidoFiltrado(ctx, salida(ctx, 0.25 * v, cuando, 0.35, pan), cuando, 0.35, "highpass", 6500);
      return;
    case "hihatPie":
      ruidoFiltrado(ctx, salida(ctx, 0.22 * v, cuando, 0.04, pan), cuando, 0.04, "highpass", 5000);
      return;
    case "ride": {
      ruidoFiltrado(ctx, salida(ctx, 0.12 * v, cuando, 0.5, pan), cuando, 0.5, "bandpass", 5200, 2);
      tono(ctx, salida(ctx, 0.08 * v, cuando, 0.4, pan), cuando, 0.4, 3100, 3000, "square");
      return;
    }
    case "crash":
      ruidoFiltrado(ctx, salida(ctx, 0.35 * v, cuando, 1.3, pan), cuando, 1.3, "highpass", 4000);
      return;
    case "tom1":
    case "tom2":
    case "tomPiso": {
      const base = { tom1: 210, tom2: 160, tomPiso: 105 }[voz];
      const g = salida(ctx, 0.7 * v, cuando, 0.35, pan);
      tono(ctx, g, cuando, 0.35, base * 1.6, base);
      return;
    }
  }
}

// --- Grooves ---

export type CompasBateria = "4/4" | "3/4" | "6/8";
// Steps per beat: 2 eighths, 3 triplets, 4 sixteenths. In 6/8 the beat is the dotted quarter (3).
export type Subdivision = 2 | 3 | 4;
export const PULSOS: Record<CompasBateria, number> = { "4/4": 4, "3/4": 3, "6/8": 2 };

export type Groove = {
  compas: CompasBateria;
  subdivision: Subdivision;
  compases: number;
  bpm: number;
  pistas: Partial<Record<Voz, string>>;
};

export const MAX_COMPASES = 4;

export const pasos = (g: Pick<Groove, "compas" | "subdivision" | "compases">) =>
  PULSOS[g.compas] * g.subdivision * g.compases;

export const golpeEn = (pista: string | undefined, paso: number): Golpe =>
  (pista?.[paso] as Golpe | undefined) ?? ".";

// Keeps every voice exactly as long as the groove (after changing bar, subdivision or bars).
export function ajustarPistas(g: Groove): Groove {
  const total = pasos(g);
  const pistas: Groove["pistas"] = {};
  for (const [voz, pista] of Object.entries(g.pistas) as [Voz, string][])
    pistas[voz] = (pista ?? "").padEnd(total, ".").slice(0, total);
  return { ...g, pistas };
}

// Count shown under each step: "1 e y a", "1 y", "1 tri pi" (6/8: "1 2 3 4 5 6").
export function conteo(compas: CompasBateria, subdivision: Subdivision, paso: number) {
  if (compas === "6/8") return String((paso % 6) + 1);
  const pulso = Math.floor(paso / subdivision) % PULSOS[compas];
  const dentro = paso % subdivision;
  if (dentro === 0) return String(pulso + 1);
  return { 2: ["", "y"], 3: ["", "tri", "pi"], 4: ["", "e", "y", "a"] }[subdivision][dentro]!;
}

export function programarGroove(
  ctx: AudioContext,
  g: Groove,
  paso: number,
  cuando: number,
  silenciadas: Set<Voz>,
) {
  for (const [voz, pista] of Object.entries(g.pistas) as [Voz, string][]) {
    if (silenciadas.has(voz)) continue;
    const golpe = golpeEn(pista, paso);
    if (golpe !== ".") sonarVoz(ctx, voz, cuando, INTENSIDAD[golpe]);
  }
}

// Style library: starting points a drum teacher would write on the board (editable).
export const ESTILOS: {
  id: string;
  nombre: string;
  consejo: string;
  groove: Groove;
}[] = [
  {
    id: "rock",
    nombre: "Rock",
    consejo: "Hi-hat parejo en corcheas; la caja firme en 2 y 4 es el ancla de la banda.",
    groove: {
      compas: "4/4",
      subdivision: 2,
      compases: 1,
      bpm: 90,
      pistas: { hihat: "xxxxxxxx", caja: "..>...>.", bombo: "x...xx.." },
    },
  },
  {
    id: "balada",
    nombre: "Balada / half-time",
    consejo: "La caja solo en el 3: el groove respira. No apures las corcheas del hi-hat.",
    groove: {
      compas: "4/4",
      subdivision: 2,
      compases: 1,
      bpm: 70,
      pistas: { hihat: "xxxxxxxx", caja: "....>...", bombo: "x.....x." },
    },
  },
  {
    id: "funk",
    nombre: "Funk",
    consejo: "Las notas fantasma van casi sin levantar el palillo; el acento de la caja manda.",
    groove: {
      compas: "4/4",
      subdivision: 4,
      compases: 1,
      bpm: 92,
      pistas: {
        hihat: "x.x.x.x.x.x.x.x.",
        caja: "....>..o.o..>..o",
        bombo: "x.x....x..x.....",
      },
    },
  },
  {
    id: "shuffle",
    nombre: "Shuffle / blues",
    consejo: "Piensa en tresillos y toca la primera y la tercera: ese es el swing.",
    groove: {
      compas: "4/4",
      subdivision: 3,
      compases: 1,
      bpm: 100,
      pistas: { hihat: "x.xx.xx.xx.x", caja: "...>.....>..", bombo: "x.....x....." },
    },
  },
  {
    id: "bossa",
    nombre: "Bossa nova",
    consejo: "Bombo suave y constante; el aro dibuja la clave de bossa en dos compases.",
    groove: {
      compas: "4/4",
      subdivision: 2,
      compases: 2,
      bpm: 120,
      pistas: {
        hihat: "xxxxxxxxxxxxxxxx",
        rim: "x..x..x...x..x..",
        bombo: "x..xx..xx..xx..x",
      },
    },
  },
  {
    id: "cumbia",
    nombre: "Cumbia",
    consejo: "El hi-hat en semicorcheas imita la guacharaca; acentúa el contratiempo.",
    groove: {
      compas: "4/4",
      subdivision: 4,
      compases: 1,
      bpm: 95,
      pistas: {
        hihat: "x.>xx.>xx.>xx.>x",
        rim: "....x.......x...",
        bombo: "x.......x.......",
      },
    },
  },
  {
    id: "polca",
    nombre: "Polca paraguaya",
    consejo:
      "Siente el 6/8 con el bombo en 1 y 4, y deja que el acento de la caja cruce hacia el 3/4: ese vaivén es la polca.",
    groove: {
      compas: "6/8",
      subdivision: 3,
      compases: 2,
      bpm: 66,
      pistas: { hihat: "xxxxxxxxxxxx", caja: "..>..>..>.>.", bombo: "x..x..x..x.." },
    },
  },
  {
    id: "guarania",
    nombre: "Guarania",
    consejo: "Lenta y cantada: escobillas o aro, el bombo apenas marca el 1.",
    groove: {
      compas: "3/4",
      subdivision: 2,
      compases: 2,
      bpm: 60,
      pistas: { ride: "x.x.x.x.x.x.", rim: "..x.x...x.x.", bombo: "x.....x....." },
    },
  },
  {
    id: "galopa",
    nombre: "Galopa",
    consejo: "Alegre y con empuje: la caja contesta al bombo en cada pulso del 6/8.",
    groove: {
      compas: "6/8",
      subdivision: 3,
      compases: 1,
      bpm: 76,
      pistas: { hihat: "x.xx.x", caja: ".>..>.", bombo: "x..x.." },
    },
  },
];

// --- Rudiments (PAS) ---

// Sticking tokens: "R"/"L" stroke, ">R" accent, "lR" flam (grace note before), "llR" drag,
// "-" rest. `subdivision`: strokes per beat.
export type Rudimento = {
  id: string;
  nombre: string;
  grupo: "Redobles" | "Paradiddles" | "Flams" | "Drags";
  digitacion: string;
  subdivision: 1 | 2 | 3 | 4;
  tempo: [number, number];
};

// Saved records point at these ids (records/{alumnoId}_{id}): add new ones freely, but never
// remove or rename an id. Keep the list of ids in sync with firestore.rules.
export const RUDIMENTOS: Rudimento[] = [
  {
    id: "simples",
    nombre: "Redoble de golpes simples",
    grupo: "Redobles",
    digitacion: "R L R L R L R L",
    subdivision: 4,
    tempo: [60, 120],
  },
  {
    id: "dobles",
    nombre: "Redoble de golpes dobles",
    grupo: "Redobles",
    digitacion: "R R L L R R L L",
    subdivision: 4,
    tempo: [60, 110],
  },
  {
    id: "cinco-golpes",
    nombre: "Redoble de cinco golpes",
    grupo: "Redobles",
    digitacion: "R R L L >R - L L R R >L -",
    subdivision: 4,
    tempo: [60, 100],
  },
  {
    id: "seis-golpes",
    nombre: "Redoble de seis golpes",
    grupo: "Redobles",
    digitacion: ">R L L R R >L >R L L R R >L",
    subdivision: 3,
    tempo: [60, 100],
  },
  {
    id: "paradiddle",
    nombre: "Paradiddle simple",
    grupo: "Paradiddles",
    digitacion: ">R L R R >L R L L",
    subdivision: 4,
    tempo: [60, 120],
  },
  {
    id: "doble-paradiddle",
    nombre: "Paradiddle doble",
    grupo: "Paradiddles",
    digitacion: ">R L R L R R >L R L R L L",
    subdivision: 3,
    tempo: [60, 110],
  },
  {
    id: "triple-paradiddle",
    nombre: "Paradiddle triple",
    grupo: "Paradiddles",
    digitacion: ">R L R L R L R R >L R L R L R L L",
    subdivision: 4,
    tempo: [60, 100],
  },
  {
    id: "paradiddle-diddle",
    nombre: "Paradiddle-diddle",
    grupo: "Paradiddles",
    digitacion: ">R L R R L L >R L R R L L",
    subdivision: 3,
    tempo: [60, 110],
  },
  {
    id: "flam",
    nombre: "Flam",
    grupo: "Flams",
    digitacion: "lR rL lR rL",
    subdivision: 1,
    tempo: [50, 100],
  },
  {
    id: "flam-tap",
    nombre: "Flam tap",
    grupo: "Flams",
    digitacion: "lR R rL L lR R rL L",
    subdivision: 4,
    tempo: [50, 100],
  },
  {
    id: "flam-accent",
    nombre: "Flam accent",
    grupo: "Flams",
    digitacion: "lR L R rL R L",
    subdivision: 3,
    tempo: [50, 100],
  },
  {
    id: "drag",
    nombre: "Drag (ruff)",
    grupo: "Drags",
    digitacion: "llR - rrL -",
    subdivision: 2,
    tempo: [50, 100],
  },
];

export const rudimento = (id: string) => RUDIMENTOS.find((r) => r.id === id) ?? RUDIMENTOS[0]!;

export type Toque = { mano: "R" | "L"; acento: boolean; adornos: number } | null;

// "lR" → right stroke with one grace note; lead "L" swaps the hands.
export function toques(r: Rudimento, empiezaCon: "R" | "L" = "R"): Toque[] {
  const cambiar = (m: string) => (empiezaCon === "L" ? (m === "R" ? "L" : "R") : m) as "R" | "L";
  return r.digitacion.split(" ").map((t) => {
    if (t === "-") return null;
    const acento = t.startsWith(">");
    const limpio = t.replace(">", "");
    const mano = cambiar(limpio.slice(-1).toUpperCase());
    return { mano, acento, adornos: limpio.length - 1 };
  });
}

// Schedules one stroke on the snare: right hand right, left hand left; grace notes just before.
export function sonarToque(ctx: AudioContext, toque: Toque, cuando: number) {
  if (!toque) return;
  const pan = toque.mano === "R" ? 0.6 : -0.6;
  for (let i = toque.adornos; i > 0; i--) sonarVoz(ctx, "caja", cuando - i * 0.035, 0.25, -pan);
  sonarVoz(ctx, "caja", cuando, toque.acento ? 1.15 : 0.6, pan);
}

// --- Rhythms (reading and ear training): one 4/4 bar on sixteenths, true = a hit ---

// Per-beat patterns: level 1 quarters and eighths, level 2 adds sixteenths.
const PATRONES: Record<1 | 2, string[]> = {
  1: ["x...", "x.x.", "..x.", "x...", "x.x."],
  2: ["x...", "x.x.", "..x.", "xxxx", "xxx.", "x.xx", "xx.x", ".xxx", "x..x", ".x.x", "..xx"],
};

export function ritmoAlAzar(nivel: 1 | 2): boolean[] {
  for (;;) {
    const compas = Array.from({ length: 4 }, () => {
      const lista = PATRONES[nivel];
      return lista[Math.floor(Math.random() * lista.length)]!;
    }).join("");
    // At least four hits, and the bar starts on beat one (easier to feel).
    if (compas.startsWith("x") && compas.split("x").length - 1 >= 4)
      return [...compas].map((c) => c === "x");
  }
}

export const mismoRitmo = (a: boolean[], b: boolean[]) => a.every((v, i) => v === b[i]);
