import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pause, Play } from "lucide-react";
import { Teclado } from "@/components/herramientas/Teclado";
import { Fila, Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { tocarNota } from "@/lib/audio";
import { ESCALAS, escala as escalaDe, notasDeEscala } from "@/lib/escalas";
import type { InstrumentId } from "@/lib/instruments";
import { useMetronomo } from "@/lib/metronomo";
import { LATINAS, frecuenciaDe, nota } from "@/lib/notas";
import type { Bloque } from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type Escala = Extract<Bloque, { tipo: "escala" }>;

const TONICAS = LATINAS.map((label, value) => ({ value: String(value), label }));
const FIGURAS = [
  { value: "1", label: "Negras" },
  { value: "2", label: "Corcheas" },
] as const;

// A scale or arpeggio: its notes (Do-Re-Mi), the keyboard lit and the sound with a click, the
// note that sounds highlighted. The profesor picks the tonic, the kind, octaves and tempo.
export function EscalaBloque({
  bloque,
  editable,
  instrumento,
  onChange,
}: {
  bloque: Escala;
  editable: boolean;
  instrumento: InstrumentId;
  onChange: (bloque: Escala) => void;
}) {
  const [sonando, setSonando] = useState(false);
  const notas = notasDeEscala(instrumento, bloque.tonica, bloque.escala, bloque.octavas);
  const actual = useMetronomo({
    activo: sonando,
    bpm: bloque.bpm,
    slots: notas.length,
    porPulso: bloque.porPulso,
    sonidoDe: (slot) => (slot % bloque.porPulso === 0 ? "pulso" : null),
    programar: (slot, cuando, ctx) => {
      const midi = notas[slot];
      if (midi !== undefined)
        tocarNota(frecuenciaDe(midi), {
          retraso: Math.max(0, cuando - ctx.currentTime),
          duracion: (60 / bloque.bpm / bloque.porPulso) * 0.95,
          volumen: 0.25,
        });
    },
  });

  return (
    <View style={styles.wrap}>
      {editable ? (
        <View style={styles.opciones}>
          <Fila label="Tónica">
            <Opciones
              chico
              opciones={TONICAS}
              valor={String(bloque.tonica)}
              onChange={(v) => onChange({ ...bloque, tonica: Number(v) })}
            />
          </Fila>
          <Fila label="Escala o arpegio">
            <Opciones
              chico
              opciones={ESCALAS.map((e) => ({ value: e.value, label: e.label }))}
              valor={bloque.escala}
              onChange={(escala) => onChange({ ...bloque, escala })}
            />
          </Fila>
          <View style={styles.fila}>
            <Opciones
              chico
              opciones={[
                { value: "1", label: "1 octava" },
                { value: "2", label: "2 octavas" },
              ]}
              valor={String(bloque.octavas)}
              onChange={(v) => onChange({ ...bloque, octavas: Number(v) })}
            />
            <Opciones
              chico
              opciones={FIGURAS}
              valor={String(bloque.porPulso) as "1" | "2"}
              onChange={(v) => onChange({ ...bloque, porPulso: Number(v) as 1 | 2 })}
            />
            <Stepper
              label="tempo"
              value={bloque.bpm}
              min={30}
              max={200}
              step={5}
              suffix="BPM"
              onChange={(bpm) => onChange({ ...bloque, bpm })}
            />
          </View>
        </View>
      ) : null}

      <Text style={styles.nombre}>
        {escalaDe(bloque.escala).label} de {LATINAS[bloque.tonica]} · {bloque.bpm} BPM
      </Text>
      <View style={styles.notas}>
        {notas.map((midi, i) => (
          <View key={i} style={[styles.nota, actual === i && styles.notaSonando]}>
            <Text style={styles.notaTexto}>{nota(midi).nombre}</Text>
          </View>
        ))}
      </View>
      <Teclado notas={notas} ancho={420} />
      <Button style={styles.play} onPress={() => setSonando(!sonando)}>
        {sonando ? (
          <Pause size={16} color={buttonForeground()} />
        ) : (
          <Play size={16} color={buttonForeground()} />
        )}
        {sonando ? "Detener" : "Escuchar"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  opciones: {
    gap: 10,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  nombre: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  notas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  nota: {
    minWidth: 40,
    height: 32,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
  },
  // What is sounding: amber.
  notaSonando: {
    backgroundColor: colors.selected,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  notaTexto: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.foreground,
  },
  play: {
    alignSelf: "flex-start",
  },
});
