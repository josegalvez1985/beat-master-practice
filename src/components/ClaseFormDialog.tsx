import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Plus, X } from "lucide-react";
import { authStyles } from "@/components/AuthLayout";
import { Opciones } from "@/components/plan/comunes";
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

// "18", "18.30" or "8:05" → "18:00", "18:30", "08:05"; null if it is not a time.
export function normalizarHora(texto: string) {
  const m = texto.trim().match(/^(\d{1,2})(?:[:.h](\d{2}))?$/);
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2] ?? 0)];
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

type Modalidad = "" | "presencial" | "virtual";

// Create (optionally repeating every week) or edit a class: when, where (in person or online
// with its link) and, for a recital, the place and the program.
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
  const [hora, setHora] = useState(clase?.hora ?? "");
  const [modalidad, setModalidad] = useState<Modalidad>(clase?.modalidad ?? "");
  const [enlace, setEnlace] = useState(clase?.enlace ?? "");
  const [recital, setRecital] = useState(!!clase?.evento);
  const [lugar, setLugar] = useState(clase?.evento?.lugar ?? "");
  const [programa, setPrograma] = useState(
    clase?.evento?.programa.length ? clase.evento.programa : [{ interprete: "", obra: "" }],
  );
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
    const horaFinal = hora.trim() ? normalizarHora(hora) : "";
    if (horaFinal === null) {
      setError("Escribe la hora como 18:30.");
      return;
    }
    const enlaceFinal = modalidad === "virtual" ? enlace.trim() : "";
    if (enlaceFinal && !/^https:\/\/\S+$/.test(enlaceFinal)) {
      setError("El enlace debe empezar con https:// (Meet, Zoom, Jitsi…).");
      return;
    }
    const cambios = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      hora: horaFinal,
      modalidad: modalidad || undefined,
      enlace: enlaceFinal,
      evento: recital
        ? {
            tipo: "recital" as const,
            lugar: lugar.trim().slice(0, 200),
            programa: programa
              .map((p) => ({ interprete: p.interprete.trim(), obra: p.obra.trim() }))
              .filter((p) => p.interprete || p.obra)
              .slice(0, 60),
          }
        : undefined,
    };
    setError(null);
    setLoading(true);
    try {
      if (clase) {
        await actualizarClase(clase.id, { ...cambios, fecha });
      } else {
        await crearClases(perfil, { instrumento: inst, ...cambios }, fechas);
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

      <View style={styles.dosColumnas}>
        <View style={[authStyles.field, styles.hora]}>
          <Label>Hora (opcional)</Label>
          <Input
            accessibilityLabel="Hora"
            placeholder="18:30"
            value={hora}
            onChangeText={setHora}
            maxLength={5}
            inputMode="numeric"
          />
        </View>
        <View style={[authStyles.field, styles.flex]}>
          <Label>Modalidad</Label>
          <Opciones
            chico
            opciones={[
              { value: "", label: "Sin indicar" },
              { value: "presencial", label: "Presencial" },
              { value: "virtual", label: "Virtual" },
            ]}
            valor={modalidad}
            onChange={setModalidad}
          />
        </View>
      </View>

      {modalidad === "virtual" ? (
        <View style={authStyles.field}>
          <Label>Enlace de la videollamada</Label>
          <Input
            accessibilityLabel="Enlace de la videollamada"
            placeholder="https://meet.google.com/…"
            value={enlace}
            onChangeText={setEnlace}
            autoCapitalize="none"
            inputMode="url"
            maxLength={500}
          />
        </View>
      ) : null}

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

      <View style={styles.repeat}>
        <Pressable style={styles.repeatToggle} onPress={() => setRecital((v) => !v)}>
          <Checkbox
            checked={recital}
            onCheckedChange={setRecital}
            accessibilityLabel="Es un recital o muestra"
          />
          <Text style={authStyles.muted}>Es un recital o muestra</Text>
        </Pressable>
        {recital ? (
          <>
            <View style={authStyles.field}>
              <Label>Lugar</Label>
              <Input
                accessibilityLabel="Lugar del recital"
                placeholder="Ej. Auditorio del colegio"
                value={lugar}
                onChangeText={setLugar}
                maxLength={200}
              />
            </View>
            <View style={authStyles.field}>
              <Label>Programa</Label>
              {programa.map((p, i) => (
                <View key={i} style={styles.programa}>
                  <View style={styles.flex}>
                    <Input
                      accessibilityLabel={`Intérprete ${i + 1}`}
                      placeholder="Quién toca"
                      value={p.interprete}
                      onChangeText={(v) =>
                        setPrograma((lista) =>
                          lista.map((x, k) => (k === i ? { ...x, interprete: v } : x)),
                        )
                      }
                      maxLength={80}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Input
                      accessibilityLabel={`Obra ${i + 1}`}
                      placeholder="Obra"
                      value={p.obra}
                      onChangeText={(v) =>
                        setPrograma((lista) =>
                          lista.map((x, k) => (k === i ? { ...x, obra: v } : x)),
                        )
                      }
                      maxLength={120}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar fila ${i + 1}`}
                    onPress={() => setPrograma((lista) => lista.filter((_, k) => k !== i))}
                    style={styles.quitar}
                  >
                    <X size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}
              {programa.length < 60 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  style={styles.agregar}
                  onPress={() => setPrograma((lista) => [...lista, { interprete: "", obra: "" }])}
                >
                  <Plus size={14} color={buttonForeground("secondary")} />
                  Agregar al programa
                </Button>
              ) : null}
            </View>
          </>
        ) : null}
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
    fontSize: 13,
    color: colors.mutedForeground,
  },
  dosColumnas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  hora: {
    width: 110,
  },
  flex: {
    flex: 1,
    minWidth: 120,
  },
  programa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quitar: {
    width: 32,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  agregar: {
    alignSelf: "flex-start",
  },
});
