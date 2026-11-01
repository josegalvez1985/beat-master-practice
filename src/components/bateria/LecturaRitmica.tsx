import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Drum, Play, Shuffle } from "lucide-react";
import { Ritmo } from "@/components/bateria/Ritmo";
import { oidoStyles } from "@/components/herramientas/Oido";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { ritmoAlAzar } from "@/lib/bateria";
import {
  escucharGolpes,
  evaluarRitmo,
  latenciaGuardada,
  programarRitmo,
  type Resultado,
} from "@/lib/tiempo";
import { colors, fonts } from "@/lib/theme";

const niveles = [
  { value: "1", label: "Negras y corcheas" },
  { value: "2", label: "Con semicorcheas" },
] as const;

// Rhythm reading: a bar to read and play on the pad after a count-in; the microphone checks each
// written note (green on time, amber close, red missed).
export function LecturaRitmica() {
  const [nivel, setNivel] = useState<"1" | "2">("1");
  const [bpm, setBpm] = useState(70);
  const [ritmo, setRitmo] = useState(() => ritmoAlAzar(1));
  const [estado, setEstado] = useState<"listo" | "escuchando" | "tocando">("listo");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [puntos, setPuntos] = useState({ aciertos: 0, total: 0 });
  const cancelar = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelar.current?.(), []);

  const nuevo = (n = nivel) => {
    setRitmo(ritmoAlAzar(Number(n) as 1 | 2));
    setResultado(null);
  };

  const escuchar = () => {
    const { ctx, fin } = programarRitmo(ritmo, bpm, true);
    setEstado("escuchando");
    const timer = window.setTimeout(() => setEstado("listo"), (fin - ctx.currentTime) * 1000 + 200);
    cancelar.current = () => window.clearTimeout(timer);
  };

  const tocar = async () => {
    setError(null);
    setResultado(null);
    const golpes: number[] = [];
    let cerrar: () => void;
    try {
      cerrar = await escucharGolpes((t) => golpes.push(t - (latenciaGuardada() ?? 0) / 1000));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el micrófono.");
      return;
    }
    const { ctx, compas, fin, semicorchea } = programarRitmo(ritmo, bpm, false);
    setEstado("tocando");
    const timer = window.setTimeout(
      () => {
        cerrar();
        const r = evaluarRitmo(ritmo, golpes, compas, semicorchea);
        setResultado(r);
        setPuntos((p) => ({
          aciertos: p.aciertos + r.aciertos,
          total: p.total + r.estados.length,
        }));
        setEstado("listo");
      },
      (fin - ctx.currentTime) * 1000 + 300,
    );
    cancelar.current = () => {
      window.clearTimeout(timer);
      cerrar();
    };
  };

  const ok = resultado?.estados.filter((e) => e === "ok").length ?? 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.fila}>
        <Opciones
          chico
          opciones={niveles}
          valor={nivel}
          onChange={(n) => {
            setNivel(n);
            nuevo(n);
          }}
        />
        <Stepper
          label="tempo"
          value={bpm}
          min={40}
          max={160}
          step={5}
          suffix="BPM"
          onChange={setBpm}
        />
      </View>

      <View style={oidoStyles.marcador}>
        <Text style={oidoStyles.numero}>
          {puntos.aciertos}/{puntos.total}
        </Text>
        <Text style={oidoStyles.marcadorTexto}>notas tocadas</Text>
      </View>

      <View style={styles.papel}>
        <Ritmo ritmo={ritmo} estados={resultado?.estados} />
      </View>

      <Text accessibilityLiveRegion="polite" style={oidoStyles.consigna}>
        {estado === "tocando"
          ? "Cuenta 4 clicks y toca el compás en el pad."
          : estado === "escuchando"
            ? "Escucha: 4 clicks de cuenta y el ritmo."
            : resultado
              ? `${ok} justas, ${resultado.aciertos - ok} cerca, ${resultado.estados.length - resultado.aciertos} faltaron${resultado.demas ? `, ${resultado.demas} golpes de más` : ""}.`
              : "Lee el ritmo, escúchalo si quieres y tócalo."}
      </Text>

      <View style={styles.fila}>
        <Button disabled={estado !== "listo"} onPress={() => void tocar()}>
          <Drum size={16} color={buttonForeground()} />
          Tocar
        </Button>
        <Button variant="secondary" disabled={estado !== "listo"} onPress={escuchar}>
          <Play size={16} color={buttonForeground("secondary")} />
          Escuchar
        </Button>
        <Button variant="secondary" disabled={estado !== "listo"} onPress={() => nuevo()}>
          <Shuffle size={16} color={buttonForeground("secondary")} />
          Otro ritmo
        </Button>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.ayuda}>
        Usa auriculares para el click y calibra antes en el Medidor de tiempo: así el micrófono solo
        oye tus golpes y los compara bien.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  papel: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
});
