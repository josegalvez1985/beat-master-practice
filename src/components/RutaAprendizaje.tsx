import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react";
import { Opciones } from "@/components/plan/comunes";
import { Progress } from "@/components/ui/progress";
import { avisar } from "@/components/ui/toast";
import { guardarLogros, type Inscripcion, type Logros } from "@/lib/data";
import { NIVELES, avanceDeNivel, nivelLabel, rutaPara, type Nivel } from "@/lib/ruta";
import { colors, fonts, radius } from "@/lib/theme";

// The alumno's learning path in one list: the level and its objectives. The profesor marks them
// (saved at once); the alumno sees what comes next.
export function RutaAprendizaje({
  inscripcion,
  logros,
  editable,
  sugerido,
}: {
  inscripcion: Inscripcion;
  logros: Logros | undefined;
  editable: boolean;
  // The alumno's self-assessment (first-time welcome), offered while there is no path yet.
  sugerido?: string;
}) {
  const nivel = (logros?.nivel ?? "inicial") as Nivel;
  const cumplidos = logros?.cumplidos ?? [];
  const objetivos = rutaPara(inscripcion.instrumento)[nivel] ?? [];
  const avance = avanceDeNivel(inscripcion.instrumento, nivel, cumplidos);

  const guardar = (nuevoNivel: string, nuevos: string[]) =>
    void guardarLogros(inscripcion, nuevoNivel, nuevos).catch(() =>
      avisar({ texto: "No se pudo guardar la ruta.", tipo: "error" }),
    );

  return (
    <View style={styles.wrap}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>
          Ruta de aprendizaje · nivel {nivelLabel(nivel).toLowerCase()}
        </Text>
        <Text style={styles.porcentaje}>{avance}%</Text>
      </View>
      {editable ? (
        <Opciones chico opciones={NIVELES} valor={nivel} onChange={(n) => guardar(n, cumplidos)} />
      ) : null}
      {editable && !logros && sugerido && NIVELES.some((n) => n.value === sugerido) ? (
        <View style={styles.sugerido}>
          <Text style={styles.sugeridoTexto}>
            Se autoevaluó en nivel {nivelLabel(sugerido).toLowerCase()}.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => guardar(sugerido, [])}
            style={styles.usar}
          >
            <Text style={styles.usarTexto}>Empezar ahí</Text>
          </Pressable>
        </View>
      ) : null}
      <Progress value={avance} />
      <View style={styles.lista}>
        {objetivos.map((o) => {
          const hecho = cumplidos.includes(o.id);
          const contenido = (
            <>
              <View style={[styles.marca, hecho && styles.marcaHecha]}>
                {hecho ? (
                  <Check size={12} strokeWidth={3} color={colors.primaryForeground} />
                ) : null}
              </View>
              <Text style={[styles.objetivo, hecho && styles.hecho]}>{o.texto}</Text>
            </>
          );
          return editable ? (
            <Pressable
              key={o.id}
              accessibilityRole="checkbox"
              aria-checked={hecho}
              onPress={() =>
                guardar(nivel, hecho ? cumplidos.filter((id) => id !== o.id) : [...cumplidos, o.id])
              }
              style={styles.fila}
            >
              {contenido}
            </Pressable>
          ) : (
            <View
              key={o.id}
              style={styles.fila}
              accessibilityLabel={`${o.texto}${hecho ? ", logrado" : ""}`}
            >
              {contenido}
            </View>
          );
        })}
      </View>
      {editable && avance === 100 && nivel !== "avanzado" ? (
        <Text style={styles.ayuda}>¡Nivel completo! Pásalo al siguiente nivel cuando quieras.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titulo: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.foreground,
  },
  porcentaje: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.primary,
  },
  lista: {
    gap: 6,
  },
  sugerido: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  sugeridoTexto: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.foreground,
  },
  usar: {
    height: 30,
    paddingHorizontal: 10,
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usarTexto: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.foreground,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  marca: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  // Progress reached: solid amber.
  marcaHecha: {
    backgroundColor: colors.primary,
  },
  objetivo: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.foreground,
  },
  hecho: {
    color: colors.mutedForeground,
  },
  ayuda: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.success,
  },
});
