import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { authStyles } from "@/components/AuthLayout";
import { Button, buttonForeground } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Perfil } from "@/lib/auth";
import { actualizarClase, crearClases, type Clase } from "@/lib/data";
import { repetir, sumarDias } from "@/lib/dates";
import { instrumento, type InstrumentId } from "@/lib/instruments";
import { colors, fonts } from "@/lib/theme";

// Create (optionally repeating every week) or edit a class.
export function ClaseFormDialog({
  visible,
  onClose,
  perfil,
  clase,
  fechaInicial,
  instrumentoInicial,
}: {
  visible: boolean;
  onClose: () => void;
  perfil: Perfil;
  clase?: Clase;
  fechaInicial: string;
  instrumentoInicial?: InstrumentId | null;
}) {
  return (
    <Dialog visible={visible} onClose={onClose} title={clase ? "Editar clase" : "Nueva clase"}>
      <ClaseForm
        onClose={onClose}
        perfil={perfil}
        clase={clase}
        fechaInicial={fechaInicial}
        instrumentoInicial={instrumentoInicial}
      />
    </Dialog>
  );
}

function ClaseForm({
  onClose,
  perfil,
  clase,
  fechaInicial,
  instrumentoInicial,
}: {
  onClose: () => void;
  perfil: Perfil;
  clase?: Clase;
  fechaInicial: string;
  instrumentoInicial?: InstrumentId | null;
}) {
  const [inst, setInst] = useState<InstrumentId>(
    clase?.instrumento ?? instrumentoInicial ?? (perfil.instrumentos[0] as InstrumentId),
  );
  const [fecha, setFecha] = useState(clase?.fecha ?? fechaInicial);
  const [titulo, setTitulo] = useState(clase?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(clase?.descripcion ?? "");
  const [semanal, setSemanal] = useState(false);
  const [hasta, setHasta] = useState(sumarDias(fechaInicial, 7 * 11));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechas = semanal && !clase ? repetir(fecha, hasta) : [fecha];

  const onSubmit = async () => {
    if (!titulo.trim()) {
      setError("Ponle un título a la clase.");
      return;
    }
    if (!fecha) {
      setError("Elige la fecha.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (clase) {
        await actualizarClase(clase.id, {
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          fecha,
        });
      } else {
        await crearClases(
          perfil,
          { instrumento: inst, titulo: titulo.trim(), descripcion: descripcion.trim() },
          fechas,
        );
      }
      onClose();
    } catch {
      setError("No se pudo guardar. Vuelve a probar.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.form}>
      {!clase && perfil.instrumentos.length > 1 ? (
        <View style={authStyles.field}>
          <Label>Instrumento</Label>
          <View style={styles.chips}>
            {perfil.instrumentos.map((id) => (
              <Chip
                key={id}
                label={instrumento(id).name}
                icon={instrumento(id).icon}
                selected={inst === id}
                onPress={() => setInst(id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={authStyles.field}>
        <Label>Título</Label>
        <Input
          accessibilityLabel="Título"
          placeholder="Ej. Acordes abiertos: Do, Sol y Re"
          value={titulo}
          onChangeText={setTitulo}
          maxLength={120}
        />
      </View>

      <View style={authStyles.field}>
        <Label>Fecha</Label>
        <DateInput label="Fecha" value={fecha} onChange={setFecha} />
      </View>

      <View style={authStyles.field}>
        <Label>Objetivos y tarea</Label>
        <Input
          accessibilityLabel="Objetivos y tarea"
          placeholder="Qué se trabaja en la clase y qué debe practicar el alumno."
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={4}
          maxLength={4000}
          style={styles.textarea}
        />
      </View>

      {!clase ? (
        <View style={styles.repeat}>
          <Pressable style={styles.repeatToggle} onPress={() => setSemanal((v) => !v)}>
            <Checkbox
              checked={semanal}
              onCheckedChange={setSemanal}
              accessibilityLabel="Repetir cada semana"
            />
            <Text style={authStyles.muted}>Repetir cada semana</Text>
          </Pressable>
          {semanal ? (
            <View style={authStyles.field}>
              <Label>Hasta</Label>
              <DateInput label="Repetir hasta" value={hasta} min={fecha} onChange={setHasta} />
              <Text style={styles.hint}>
                Se crearán {fechas.length} {fechas.length === 1 ? "clase" : "clases"} (máximo 60).
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {error ? <Text style={authStyles.error}>{error}</Text> : null}

      <Button size="lg" disabled={loading} onPress={onSubmit}>
        {loading ? <ActivityIndicator size="small" color={buttonForeground()} /> : null}
        {clase
          ? "Guardar cambios"
          : fechas.length > 1
            ? `Crear ${fechas.length} clases`
            : "Crear clase"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 20,
    gap: 18,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  textarea: {
    height: 104,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  repeat: {
    gap: 12,
  },
  repeatToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
