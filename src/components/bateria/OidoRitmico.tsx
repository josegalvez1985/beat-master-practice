import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Play, RotateCcw } from "lucide-react";
import { Ritmo } from "@/components/bateria/Ritmo";
import { oidoStyles } from "@/components/herramientas/Oido";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { mismoRitmo, ritmoAlAzar } from "@/lib/bateria";
import { programarRitmo } from "@/lib/tiempo";
import { colors, fonts, radius } from "@/lib/theme";

const BPM = 72;

// Rhythmic dictation: listen to one bar on the snare and pick it among four written ones.
export function OidoRitmico() {
  const [nivel, setNivel] = useState<"1" | "2">("1");
  const [pregunta, setPregunta] = useState<{ opciones: boolean[][]; correcta: number } | null>(
    null,
  );
  const [elegida, setElegida] = useState<number | null>(null);
  const [puntos, setPuntos] = useState({ aciertos: 0, total: 0 });

  const nueva = () => {
    const n = Number(nivel) as 1 | 2;
    const opciones: boolean[][] = [];
    while (opciones.length < 4) {
      const r = ritmoAlAzar(n);
      if (!opciones.some((o) => mismoRitmo(o, r))) opciones.push(r);
    }
    const correcta = Math.floor(Math.random() * 4);
    setPregunta({ opciones, correcta });
    setElegida(null);
    programarRitmo(opciones[correcta]!, BPM, true);
  };

  const responder = (i: number) => {
    if (!pregunta || elegida !== null) return;
    setElegida(i);
    setPuntos((p) => ({
      aciertos: p.aciertos + (i === pregunta.correcta ? 1 : 0),
      total: p.total + 1,
    }));
  };

  return (
    <View style={styles.wrap}>
      <Opciones
        chico
        opciones={[
          { value: "1", label: "Negras y corcheas" },
          { value: "2", label: "Con semicorcheas" },
        ]}
        valor={nivel}
        onChange={(n) => {
          setNivel(n);
          setPregunta(null);
        }}
      />
      <View style={oidoStyles.marcador}>
        <Text style={oidoStyles.numero}>
          {puntos.aciertos}/{puntos.total}
        </Text>
        <Text style={oidoStyles.marcadorTexto}>aciertos</Text>
      </View>
      <View style={styles.fila}>
        {!pregunta || elegida !== null ? (
          <Button onPress={nueva}>
            <Play size={16} color={buttonForeground()} />
            {pregunta ? "Siguiente" : "Empezar"}
          </Button>
        ) : null}
        {pregunta ? (
          <Button
            variant="secondary"
            onPress={() => programarRitmo(pregunta.opciones[pregunta.correcta]!, BPM, true)}
          >
            <RotateCcw size={16} color={buttonForeground("secondary")} />
            Repetir
          </Button>
        ) : null}
      </View>
      {pregunta ? (
        <>
          <Text style={oidoStyles.consigna}>
            {elegida === null
              ? "¿Cuál de estos ritmos escuchaste?"
              : elegida === pregunta.correcta
                ? "¡Bien!"
                : "Era el marcado en verde."}
          </Text>
          <View style={styles.opciones}>
            {pregunta.opciones.map((ritmo, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Ritmo ${i + 1}`}
                disabled={elegida !== null}
                onPress={() => responder(i)}
                style={[
                  styles.opcion,
                  elegida !== null && i === pregunta.correcta && oidoStyles.correcta,
                  elegida === i && i !== pregunta.correcta && oidoStyles.fallada,
                ]}
              >
                <Ritmo ritmo={ritmo} ancho={300} />
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.ayuda}>
          Escucharás 4 clicks de cuenta y un compás en la caja. Elige el ritmo escrito que sonó.
        </Text>
      )}
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
    gap: 8,
  },
  opciones: {
    gap: 8,
  },
  opcion: {
    alignItems: "center",
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
});
