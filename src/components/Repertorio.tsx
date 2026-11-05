import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gauge, Plus, RotateCcw, X } from "lucide-react";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { avisar } from "@/components/ui/toast";
import {
  agregarObra,
  cambiarObra,
  quitarObra,
  type EstadoObra,
  type Inscripcion,
  type Obra,
} from "@/lib/data";
import { formatoDia, hoy } from "@/lib/dates";
import { colors, fonts, radius } from "@/lib/theme";

export const ESTADOS_OBRA: { value: EstadoObra; label: string }[] = [
  { value: "aprendiendo", label: "Aprendiendo" },
  { value: "entera", label: "La toco entera" },
  { value: "memoria", label: "De memoria" },
  { value: "lista", label: "Lista para recital" },
];

const error = () => avisar({ texto: "No se pudo guardar el repertorio.", tipo: "error" });

// "hoy a 72 BPM, objetivo 100", in words, for the routine and the profesor's summary.
export function textoTempoObra(obra: Obra) {
  if (!obra.bpm) return obra.bpmObjetivo ? `Objetivo ${obra.bpmObjetivo} BPM` : "";
  const cuando = obra.bpmEn
    ? obra.bpmEn === hoy()
      ? "hoy "
      : `el ${formatoDia(obra.bpmEn)} `
    : "";
  return `${cuando}a ${obra.bpm} BPM${obra.bpmObjetivo ? `, objetivo ${obra.bpmObjetivo}` : ""}`;
}

const TEMPO_INICIAL = 60;

// The tempo a piece goes at and the one it should reach. Each tap changes the number; it saves a
// moment after the last one (one write, not one per tap).
function TempoObra({ obra }: { obra: Obra }) {
  const [abierto, setAbierto] = useState(false);
  const [bpm, setBpm] = useState(obra.bpm ?? TEMPO_INICIAL);
  const [objetivo, setObjetivo] = useState(obra.bpmObjetivo ?? 100);
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void cambiarObra(obra.id, { bpm, bpmObjetivo: objetivo, bpmEn: hoy() }).catch(error);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [bpm, objetivo, obra.id]);

  if (!abierto)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Anotar el tempo de ${obra.obra}`}
        onPress={() => setAbierto(true)}
        style={styles.tempoCerrado}
      >
        <Gauge size={14} color={colors.mutedForeground} />
        <Text style={styles.ayuda}>{textoTempoObra(obra) || "Anotar a qué tempo va"}</Text>
      </Pressable>
    );

  return (
    <View style={styles.tempo}>
      <Stepper
        label="tempo actual"
        value={bpm}
        onChange={setBpm}
        min={20}
        max={300}
        step={2}
        suffix="BPM"
      />
      <Text style={styles.ayuda}>objetivo</Text>
      <Stepper
        label="tempo objetivo"
        value={objetivo}
        onChange={setObjetivo}
        min={20}
        max={300}
        step={2}
        suffix="BPM"
      />
    </View>
  );
}

// The alumno's pieces in one list, with how far each one is and when it was last reviewed. The
// alumno and the profesor both edit it.
export function Repertorio({ inscripcion, obras }: { inscripcion: Inscripcion; obras: Obra[] }) {
  const [nueva, setNueva] = useState("");
  const propias = obras
    .filter(
      (o) => o.instrumento === inscripcion.instrumento && o.profesorId === inscripcion.profesorId,
    )
    .sort((a, b) => a.obra.localeCompare(b.obra, "es"));

  const agregar = () => {
    if (!nueva.trim()) return;
    void agregarObra(inscripcion, nueva, "aprendiendo").then(() => setNueva(""), error);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Repertorio</Text>
      {propias.length === 0 ? (
        <Text style={styles.ayuda}>
          Anota las obras que estás tocando y marca cómo van: la práctica de hoy te propone
          repasarlas para no olvidarlas.
        </Text>
      ) : null}
      {propias.map((o) => (
        <View key={o.id} style={styles.obra}>
          <View style={styles.cabecera}>
            <View style={styles.flex}>
              <Text style={styles.nombre}>{o.obra}</Text>
              <Text style={styles.ayuda}>
                {o.repasadoEn ? `Repasada el ${formatoDia(o.repasadoEn)}` : "Sin repasar todavía"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Repasé ${o.obra} hoy`}
              onPress={() => void cambiarObra(o.id, { repasadoEn: hoy() }).catch(error)}
              style={styles.accion}
            >
              <RotateCcw size={14} color={colors.foreground} />
              <Text style={styles.accionTexto}>Repasé hoy</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${o.obra}`}
              onPress={() => void quitarObra(o.id).catch(error)}
              style={styles.quitar}
            >
              <X size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Opciones
            chico
            opciones={ESTADOS_OBRA}
            valor={o.estado}
            onChange={(estado) => void cambiarObra(o.id, { estado }).catch(error)}
          />
          <TempoObra obra={o} />
        </View>
      ))}
      <View style={styles.agregar}>
        <View style={styles.flex}>
          <Input
            accessibilityLabel="Obra nueva"
            placeholder="Obra nueva (ej. Recuerdos de Ypacaraí)"
            value={nueva}
            onChangeText={setNueva}
            maxLength={120}
            onSubmitEditing={agregar}
          />
        </View>
        <Button variant="secondary" accessibilityLabel="Agregar obra" onPress={agregar}>
          <Plus size={16} color={buttonForeground("secondary")} />
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.foreground,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  obra: {
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  accion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accionTexto: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.foreground,
  },
  quitar: {
    padding: 6,
  },
  tempoCerrado: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
  },
  tempo: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  agregar: {
    flexDirection: "row",
    gap: 8,
  },
});
