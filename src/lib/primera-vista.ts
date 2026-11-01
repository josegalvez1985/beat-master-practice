import type { Clave } from "@/lib/herramientas";

// Sight reading: a new four-bar melody each time, in 4/4 and C major (naturals only), as
// alphaTex for the score with sound. Mostly steps, and it always ends on the tonic.

export type NivelLectura = "facil" | "media";

const LETRAS = ["C", "D", "E", "F", "G", "A", "B"];
// Diatonic step (octave × 7 + letter): staff range and tonic of each clef.
const REGISTRO: Record<Clave, { desde: number; hasta: number; tonica: number }> = {
  sol: { desde: 4 * 7 + 2, hasta: 5 * 7 + 3, tonica: 5 * 7 }, // E4 a F5, Do5
  fa: { desde: 2 * 7 + 4, hasta: 3 * 7 + 5, tonica: 3 * 7 }, // G2 a A3, Do3
};

// Rhythms of one bar (alphaTex durations: 1 whole, 2 half, 4 quarter, 8 eighth).
const RITMOS: Record<NivelLectura, number[][]> = {
  facil: [
    [4, 4, 4, 4],
    [2, 4, 4],
    [4, 4, 2],
    [2, 2],
  ],
  media: [
    [4, 4, 4, 4],
    [8, 8, 4, 4, 4],
    [4, 8, 8, 2],
    [8, 8, 8, 8, 4, 4],
    [2, 8, 8, 4],
  ],
};
const FINAL: number[][] = [[4, 4, 2], [2, 2], [1]];

const azar = <T>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)]!;
const nombre = (paso: number) => `${LETRAS[paso % 7]}${Math.floor(paso / 7)}`;

export function melodia(clave: Clave, nivel: NivelLectura, compases = 4) {
  const { desde, hasta, tonica } = REGISTRO[clave];
  const saltos = nivel === "facil" ? [-1, 1, -1, 1, 0] : [-1, 1, -1, 1, -2, 2, -3, 3, 0];
  const ritmos = Array.from({ length: compases }, (_, i) =>
    i === compases - 1 ? azar(FINAL) : azar(RITMOS[nivel]),
  );
  let paso = tonica;
  return ritmos.map((ritmo, c) =>
    ritmo.map((duracion, n) => {
      const ultima = c === compases - 1 && n === ritmo.length - 1;
      if (ultima) paso = tonica;
      else if (c || n) {
        // Lean back toward the tonic when the line wanders too far.
        const salto = Math.abs(paso - tonica) > 4 ? Math.sign(tonica - paso) : azar(saltos);
        paso = Math.min(hasta, Math.max(desde, paso + salto));
      }
      return { paso, duracion };
    }),
  );
}

export function texMelodia(
  notas: ReturnType<typeof melodia>,
  { clave, programa, bpm }: { clave: Clave; programa: number; bpm: number },
) {
  const compases = notas.map((compas) =>
    compas.map((n) => `:${n.duracion} ${nombre(n.paso)}`).join(" "),
  );
  return [
    `\\tempo ${bpm}`,
    ".",
    '\\track "Lectura"',
    `\\instrument ${programa}`,
    "\\tuning piano",
    ...(clave === "fa" ? ["\\clef F4"] : []),
    compases.join(" | "),
  ].join("\n");
}
