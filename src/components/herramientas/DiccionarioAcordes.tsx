import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Play, Search } from "lucide-react";
import { Teclado } from "@/components/herramientas/Teclado";
import { DiagramaAcorde } from "@/components/plan/DiagramaAcorde";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACORDES_COMUNES, notasDeDigitacion, notasDelAcorde } from "@/lib/acordes";
import { tocarNotas } from "@/lib/audio";
import type { InstrumentId } from "@/lib/instruments";
import { frecuenciaDe, nota } from "@/lib/notas";
import { colors, fonts, radius } from "@/lib/theme";

// Usual right-hand fingering for a chord in close position: thumb on the lowest note.
function digitacionMano(midis: number[]) {
  const dedos = { 2: [1, 5], 3: [1, 3, 5], 4: [1, 2, 3, 5], 5: [1, 2, 3, 4, 5] }[
    Math.min(5, midis.length) as 2 | 3 | 4 | 5
  ] ?? [1];
  return new Map([...midis].sort((a, b) => a - b).map((m, i) => [m, dedos[i] ?? 5]));
}

const COMUNES_TECLADO = ["C", "G", "D", "A", "E", "F", "Am", "Dm", "Em", "C7", "G7", "Cmaj7"];

// Look up any chord (Am, Lam, F#7, Sibmaj7…), see it the way the instrument plays it and hear
// it: diagram on guitar and ukulele, keyboard on piano and accordion, notes on the harp.
export function DiccionarioAcordes({ instrumento }: { instrumento: InstrumentId }) {
  const [texto, setTexto] = useState("");
  const [acorde, setAcorde] = useState(instrumento === "ukelele" ? "C" : "G");
  const datos = notasDelAcorde(acorde);
  const cuerdas = instrumento === "guitarra" || instrumento === "ukelele" ? instrumento : null;
  const teclado =
    instrumento === "piano" || instrumento === "acordeon" || instrumento === "teclado";
  const comunes = cuerdas ? ACORDES_COMUNES[cuerdas] : COMUNES_TECLADO;
  const [error, setError] = useState<string | null>(null);

  const buscar = () => {
    const limpio = texto.trim();
    if (!limpio) return;
    if (!notasDelAcorde(limpio)) {
      setError(`No reconozco "${limpio}". Prueba con Am, G7, Fmaj7, Lam o Sol7.`);
      return;
    }
    setError(null);
    setAcorde(limpio);
    setTexto("");
  };

  const escuchar = (arpegio: boolean) => {
    if (!datos) return;
    const midis = (cuerdas && notasDeDigitacion(acorde, cuerdas)) || datos.midis;
    tocarNotas(midis.map(frecuenciaDe), {
      separacion: arpegio ? 0.32 : 0.035,
      duracion: arpegio ? 1.4 : 2,
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.buscar}>
        <View style={styles.flex}>
          <Input
            value={texto}
            onChangeText={setTexto}
            placeholder="Busca un acorde: Am, Lam, F#7, Sibmaj7…"
            accessibilityLabel="Nombre del acorde"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={buscar}
          />
        </View>
        <Button variant="secondary" accessibilityLabel="Buscar acorde" onPress={buscar}>
          <Search size={16} color={buttonForeground("secondary")} />
        </Button>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.comunes}>
        {comunes.map((nombre) => (
          <Pressable
            key={nombre}
            accessibilityRole="radio"
            aria-checked={nombre === acorde}
            onPress={() => {
              setAcorde(nombre);
              setError(null);
            }}
            style={[styles.chip, nombre === acorde && styles.chipElegido]}
          >
            <Text style={styles.chipTexto}>{nombre}</Text>
          </Pressable>
        ))}
      </View>

      {datos ? (
        <View style={styles.acorde}>
          <Text style={styles.titulo}>{acorde}</Text>
          <Text style={styles.subtitulo}>{datos.nombre}</Text>
          {cuerdas ? <DiagramaAcorde nombre={acorde} instrumento={cuerdas} ancho={150} /> : null}
          {teclado ? (
            <>
              <Teclado notas={datos.midis} dedos={digitacionMano(datos.midis)} />
              <Text style={styles.dedos}>
                Mano derecha: {[...digitacionMano(datos.midis).values()].join(" - ")} (1 es el
                pulgar)
              </Text>
            </>
          ) : null}
          <Text style={styles.notas}>
            Notas: {datos.midis.map((m) => nota(m).nombre).join(" · ")}
          </Text>
          <View style={styles.botones}>
            <Button onPress={() => escuchar(false)}>
              <Play size={16} color={buttonForeground()} />
              Escuchar
            </Button>
            <Button variant="secondary" onPress={() => escuchar(true)}>
              Nota por nota
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  buscar: {
    flexDirection: "row",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  comunes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    minWidth: 44,
    height: 34,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  chipElegido: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  chipTexto: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  acorde: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  // Not the display font: it is all caps, and "Em" (minor) is not "EM".
  titulo: {
    fontFamily: fonts.bold,
    fontSize: 40,
    lineHeight: 44,
    color: colors.foreground,
  },
  subtitulo: {
    marginTop: -6,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  notas: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.foreground,
  },
  dedos: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  botones: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
});
