import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Play, RotateCcw } from "lucide-react";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { INTERVALOS, NOMBRE_CALIDAD } from "@/lib/acordes";
import { tocarNotas } from "@/lib/audio";
import { tocaAcordes } from "@/lib/herramientas";
import type { InstrumentId } from "@/lib/instruments";
import { frecuenciaDe } from "@/lib/notas";
import { colors, fonts, radius } from "@/lib/theme";

// Ear training: listen and name the interval (or the chord, on instruments that play chords).

const INTERVALOS_NOMBRES: { semitonos: number; label: string }[] = [
  { semitonos: 1, label: "2.ª menor" },
  { semitonos: 2, label: "2.ª mayor" },
  { semitonos: 3, label: "3.ª menor" },
  { semitonos: 4, label: "3.ª mayor" },
  { semitonos: 5, label: "4.ª justa" },
  { semitonos: 6, label: "Tritono" },
  { semitonos: 7, label: "5.ª justa" },
  { semitonos: 8, label: "6.ª menor" },
  { semitonos: 9, label: "6.ª mayor" },
  { semitonos: 10, label: "7.ª menor" },
  { semitonos: 11, label: "7.ª mayor" },
  { semitonos: 12, label: "Octava" },
];
const INTERVALOS_BASICOS = [2, 4, 5, 7, 12];
const ACORDES_BASICOS = ["", "m"];
const ACORDES_TODOS = ["", "m", "dim", "7", "maj7", "m7"];

// Where the questions sound: around the instrument's own register.
function registro(instrumento: InstrumentId): [number, number] {
  if (instrumento === "bajo" || instrumento === "contrabajo") return [40, 52];
  if (instrumento === "violonchelo") return [43, 55];
  if (instrumento === "flauta" || instrumento === "violin") return [62, 74];
  return [52, 64];
}

type Ejercicio = "intervalos" | "acordes";
type Pregunta = { respuesta: string; midis: number[] };

const azar = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)]!;

export function Oido({ instrumento }: { instrumento: InstrumentId }) {
  const conAcordes = tocaAcordes(instrumento);
  const [ejercicio, setEjercicio] = useState<Ejercicio>("intervalos");
  const [nivel, setNivel] = useState<"basico" | "completo">("basico");
  const [forma, setForma] = useState<"melodico" | "armonico">("melodico");
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [puntos, setPuntos] = useState({ aciertos: 0, total: 0, racha: 0 });

  const opciones =
    ejercicio === "intervalos"
      ? INTERVALOS_NOMBRES.filter(
          (i) => nivel === "completo" || INTERVALOS_BASICOS.includes(i.semitonos),
        ).map((i) => ({ value: String(i.semitonos), label: i.label }))
      : (nivel === "completo" ? ACORDES_TODOS : ACORDES_BASICOS).map((c) => ({
          value: c,
          label: NOMBRE_CALIDAD[c]!.replace(/^./, (l) => l.toUpperCase()),
        }));

  const sonar = (p: Pregunta) =>
    tocarNotas(p.midis.map(frecuenciaDe), {
      separacion: ejercicio === "intervalos" && forma === "melodico" ? 0.75 : 0.03,
      duracion: 1.6,
    });

  const nueva = () => {
    const [bajo, alto] = registro(instrumento);
    const raiz = bajo + Math.floor(Math.random() * (alto - bajo + 1));
    const respuesta = azar(opciones).value;
    const midis =
      ejercicio === "intervalos"
        ? [raiz, raiz + Number(respuesta)]
        : (INTERVALOS[respuesta] ?? [0]).map((i) => raiz + i);
    const p = { respuesta, midis };
    setPregunta(p);
    setElegida(null);
    sonar(p);
  };

  const responder = (valor: string) => {
    if (!pregunta || elegida !== null) return;
    setElegida(valor);
    const bien = valor === pregunta.respuesta;
    setPuntos((p) => ({
      aciertos: p.aciertos + (bien ? 1 : 0),
      total: p.total + 1,
      racha: bien ? p.racha + 1 : 0,
    }));
  };

  const reiniciar = (cambio: () => void) => {
    cambio();
    setPregunta(null);
    setElegida(null);
  };

  return (
    <View style={styles.wrap}>
      {conAcordes ? (
        <Opciones
          opciones={[
            { value: "intervalos", label: "Intervalos" },
            { value: "acordes", label: "Acordes" },
          ]}
          valor={ejercicio}
          onChange={(v) => reiniciar(() => setEjercicio(v))}
        />
      ) : null}
      <View style={styles.fila}>
        <Opciones
          chico
          opciones={[
            { value: "basico", label: "Básico" },
            { value: "completo", label: "Completo" },
          ]}
          valor={nivel}
          onChange={(v) => reiniciar(() => setNivel(v))}
        />
        {ejercicio === "intervalos" ? (
          <Opciones
            chico
            opciones={[
              { value: "melodico", label: "Una nota tras otra" },
              { value: "armonico", label: "Juntas" },
            ]}
            valor={forma}
            onChange={(v) => reiniciar(() => setForma(v))}
          />
        ) : null}
      </View>

      <View style={styles.marcador}>
        <Text style={styles.numero}>
          {puntos.aciertos}/{puntos.total}
        </Text>
        <Text style={styles.marcadorTexto}>
          aciertos{puntos.racha >= 3 ? ` · ${puntos.racha} seguidos` : ""}
        </Text>
      </View>

      <View style={styles.botones}>
        {!pregunta || elegida !== null ? (
          <Button onPress={nueva}>
            <Play size={16} color={buttonForeground()} />
            {pregunta ? "Siguiente" : "Empezar"}
          </Button>
        ) : null}
        {pregunta ? (
          <Button variant="secondary" onPress={() => sonar(pregunta)}>
            <RotateCcw size={16} color={buttonForeground("secondary")} />
            Repetir
          </Button>
        ) : null}
      </View>

      {pregunta ? (
        <>
          <Text style={styles.consigna}>
            {elegida === null
              ? ejercicio === "intervalos"
                ? "¿Qué intervalo escuchaste?"
                : "¿Qué acorde escuchaste?"
              : elegida === pregunta.respuesta
                ? "¡Bien!"
                : `Era: ${opciones.find((o) => o.value === pregunta.respuesta)?.label}`}
          </Text>
          <View style={styles.respuestas}>
            {opciones.map((o) => {
              const correcta = elegida !== null && o.value === pregunta.respuesta;
              const fallada = elegida === o.value && o.value !== pregunta.respuesta;
              return (
                <Pressable
                  key={o.value}
                  accessibilityRole="button"
                  disabled={elegida !== null}
                  onPress={() => responder(o.value)}
                  style={[styles.respuesta, correcta && styles.correcta, fallada && styles.fallada]}
                >
                  <Text style={styles.respuestaTexto}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <Text style={styles.ayuda}>
          Toca Empezar, escucha y elige la respuesta. Puedes repetir el sonido las veces que
          quieras.
        </Text>
      )}
    </View>
  );
}

export const oidoStyles = StyleSheet.create({
  marcador: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  numero: {
    fontFamily: fonts.display,
    fontSize: 36,
    fontVariant: ["tabular-nums"],
    color: colors.primary,
  },
  marcadorTexto: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  respuesta: {
    minWidth: 96,
    paddingHorizontal: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  correcta: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  fallada: {
    borderColor: colors.destructive,
    borderWidth: 2,
  },
  respuestaTexto: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  consigna: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.foreground,
  },
});

const styles = StyleSheet.create({
  ...oidoStyles,
  wrap: {
    gap: 14,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  botones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  respuestas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
});
