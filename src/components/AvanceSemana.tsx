import { StyleSheet, Text, View } from "react-native";
import { Link } from "@/components/Link";
import { Anillo } from "@/components/ui/anillo";
import { Pastilla, pastillaStyles } from "@/components/ui/pastilla";
import type { Perfil } from "@/lib/auth";
import { avanceSemanal } from "@/lib/avance";
import { useDiarioAlumno, type Clase, type Entrega } from "@/lib/data";
import { hoy, rango } from "@/lib/dates";
import { instrumento, type InstrumentId } from "@/lib/instruments";
import { colors, fonts } from "@/lib/theme";

// Alumno home header: their instruments and how this week is going, as a percentage. With a
// weekly goal, minutes logged in the diary against it (what the profesor sees too); without it,
// this week's classes delivered; with neither, the minutes and a nudge to set a goal.
export function AvanceSemana({
  perfil,
  instrumentos,
  clases,
  entregas,
}: {
  perfil: Perfil;
  instrumentos: InstrumentId[];
  clases: Clase[];
  entregas: Entrega[];
}) {
  const diario = useDiarioAlumno(perfil.uid);
  const [desde, hasta] = rango("semana", hoy());
  const semana = avanceSemanal({
    diario: diario.data,
    meta: perfil.metaSemanal,
    clases,
    entregas,
    desde,
    hasta,
  });
  const minutos = semana.tipo === "clases" ? 0 : semana.minutos;
  const avance =
    semana.tipo === "meta"
      ? {
          porcentaje: semana.porcentaje,
          titulo: "de tu meta semanal",
          detalle: `${semana.minutos} de ${semana.meta} min anotados en tu diario`,
        }
      : semana.tipo === "clases"
        ? {
            porcentaje: semana.porcentaje,
            titulo: "de las clases de la semana",
            detalle: `${semana.entregadas} de ${semana.total} entregadas`,
          }
        : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.instrumentos}>
        <Text style={pastillaStyles.etiqueta}>Tus instrumentos</Text>
        <View style={pastillaStyles.fila}>
          {instrumentos.map((id) => {
            const item = instrumento(id);
            return <Pastilla key={id} icon={item.icon} label={item.name} />;
          })}
        </View>
      </View>
      <View style={styles.avance}>
        <Anillo porcentaje={avance?.porcentaje ?? 0} />
        <View style={styles.avanceTextos}>
          <Text style={pastillaStyles.etiqueta}>Tu semana</Text>
          {avance ? (
            <>
              <Text style={styles.titulo}>{avance.titulo}</Text>
              <Text style={styles.detalle}>{avance.detalle}</Text>
            </>
          ) : (
            <>
              <Text style={styles.titulo}>{minutos} min practicados</Text>
              <Link href="/herramientas?h=diario">
                <Text style={styles.enlace}>Define tu meta semanal</Text>
              </Link>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 20,
  },
  instrumentos: {
    gap: 6,
  },
  avance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avanceTextos: {
    gap: 2,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  detalle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  enlace: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
    textDecorationLine: "underline",
    textDecorationColor: colors.primary,
  },
});
