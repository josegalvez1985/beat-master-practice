import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Shuffle } from "lucide-react";
import { Opciones } from "@/components/plan/comunes";
import { Partitura } from "@/components/plan/Partitura";
import { Button, buttonForeground } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import type { Clave } from "@/lib/herramientas";
import type { InstrumentId } from "@/lib/instruments";
import { programaMidi } from "@/lib/plan";
import { melodia, texMelodia, type NivelLectura } from "@/lib/primera-vista";
import { colors, fonts } from "@/lib/theme";

// Sight reading: a new melody each time. Read it (or play it) first, then listen to check.
export function PrimeraVista({ instrumento, clave }: { instrumento: InstrumentId; clave: Clave }) {
  const [nivel, setNivel] = useState<NivelLectura>("facil");
  const [bpm, setBpm] = useState(72);
  const [notas, setNotas] = useState(() => melodia(clave, "facil"));
  const [cuenta, setCuenta] = useState(1);

  const nueva = (n = nivel) => {
    setNotas(melodia(clave, n));
    setCuenta((c) => c + 1);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.fila}>
        <Opciones
          chico
          opciones={[
            { value: "facil", label: "Fácil: negras y blancas" },
            { value: "media", label: "Media: corcheas y saltos" },
          ]}
          valor={nivel}
          onChange={(n) => {
            setNivel(n);
            nueva(n);
          }}
        />
        <Stepper
          label="tempo"
          value={bpm}
          onChange={setBpm}
          min={40}
          max={160}
          step={4}
          suffix="BPM"
        />
      </View>
      <Text style={styles.consigna}>
        Melodía {cuenta}: léela marcando el pulso (o tócala) sin detenerte. Después escúchala y
        compara.
      </Text>
      <Partitura tex={texMelodia(notas, { clave, programa: programaMidi(instrumento), bpm })} />
      <Button style={styles.nueva} onPress={() => nueva()}>
        <Shuffle size={16} color={buttonForeground()} />
        Otra melodía
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  consigna: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  nueva: {
    alignSelf: "flex-start",
  },
});
