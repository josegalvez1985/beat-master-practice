import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useParams } from "react-router";
import { ChevronLeft, UserX } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { ClaseItem } from "@/components/ClaseItem";
import { DiarioDelAlumno } from "@/components/herramientas/Diario";
import { RecordsDelAlumno } from "@/components/bateria/RecordsDelAlumno";
import { MetasSemana } from "@/components/MetasSemana";
import { Repertorio } from "@/components/Repertorio";
import { Habilidades } from "@/components/Rubrica";
import { RutaAprendizaje } from "@/components/RutaAprendizaje";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/components/Link";
import { PageMeta } from "@/components/PageMeta";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { usePerfil } from "@/lib/auth";
import {
  progreso,
  useClasesProfesor,
  useEntregasProfesor,
  useInscripcionesProfesor,
  useLogrosProfesor,
  useMetasDe,
  useRepertorioDe,
  useUsuario,
} from "@/lib/data";
import { formatearDocumento } from "@/lib/documento";
import { instrumento } from "@/lib/instruments";
import { colors, fonts } from "@/lib/theme";

// Profesor view of one alumno: progress per instrument and every class with its delivery status.
export default function AlumnoDetalle() {
  const { alumnoId = "" } = useParams();
  const perfil = usePerfil();
  const inscripciones = useInscripcionesProfesor(perfil.uid);
  const clases = useClasesProfesor(perfil.uid);
  const entregas = useEntregasProfesor(perfil.uid);
  const alumno = useUsuario(alumnoId);
  const logros = useLogrosProfesor(perfil.uid);
  const obras = useRepertorioDe(perfil.uid, alumnoId);
  const metas = useMetasDe(perfil.uid, alumnoId);

  const propias = inscripciones.data.filter((i) => i.alumnoId === alumnoId);
  const [primera] = propias;
  const entregadas = new Set(
    entregas.data.filter((e) => e.alumnoId === alumnoId).map((e) => e.claseId),
  );

  if (inscripciones.loading) return <ActivityIndicator color={colors.primary} />;

  return (
    <>
      <PageMeta
        title={`${primera?.alumnoNombre ?? "Alumno"} — Pulso`}
        description="Progreso del alumno en tus clases."
      />
      <Link href="/">
        <Text style={styles.back}>
          <ChevronLeft size={14} color={colors.primary} /> Mis alumnos
        </Text>
      </Link>

      {!primera ? (
        <EmptyState
          icon={UserX}
          title="Este alumno no está en tus listas"
          description="Agrégalo desde el inicio buscando su número de documento."
        />
      ) : (
        <>
          <View style={styles.header}>
            <Avatar nombre={primera.alumnoNombre} />
            <View>
              <Text style={shellStyles.pageTitle}>{primera.alumnoNombre}</Text>
              <Text style={shellStyles.pageSubtitle}>
                Doc. {formatearDocumento(primera.alumnoDocumento)}
              </Text>
            </View>
          </View>

          {propias.map((inscripcion) => {
            const p = progreso(clases.data, entregas.data, alumnoId, inscripcion.instrumento);
            const lista = clases.data.filter((c) => c.instrumento === inscripcion.instrumento);
            const marcadas = lista.filter((c) => c.asistencia?.[alumnoId]);
            const presentes = marcadas.filter((c) => c.asistencia![alumnoId] !== "ausente");
            const suyas = entregas.data.filter((e) => e.alumnoId === alumnoId);
            return (
              <Section
                key={inscripcion.id}
                title={instrumento(inscripcion.instrumento).name}
                subtitle={`${p.hechas} de ${p.total} clases entregadas${marcadas.length ? ` · asistió a ${presentes.length} de ${marcadas.length}` : ""}`}
                actions={<Text style={styles.percent}>{p.porcentaje}%</Text>}
              >
                <Progress value={p.porcentaje} />
                <RutaAprendizaje
                  inscripcion={inscripcion}
                  logros={logros.data.find((l) => l.id === inscripcion.id)}
                  editable
                  sugerido={alumno.data?.autoevaluacion?.[inscripcion.instrumento]}
                />
                <MetasSemana inscripcion={inscripcion} metas={metas.data} />
                <Repertorio inscripcion={inscripcion} obras={obras.data} />
                <Habilidades instrumento={inscripcion.instrumento} entregas={suyas} />
                {lista.length === 0 ? (
                  <Text style={styles.muted}>
                    Todavía no planificaste clases de este instrumento.
                  </Text>
                ) : null}
                {lista.map((clase) => (
                  <ClaseItem
                    key={clase.id}
                    clase={clase}
                    estado={entregadas.has(clase.id) ? "entregada" : "pendiente"}
                  />
                ))}
                <DiarioDelAlumno
                  alumnoId={alumnoId}
                  instrumento={inscripcion.instrumento}
                  metaSemanal={alumno.data?.metaSemanal}
                />
                {inscripcion.instrumento === "bateria" ? (
                  <RecordsDelAlumno alumnoId={alumnoId} />
                ) : null}
              </Section>
            );
          })}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  back: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  percent: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.primary,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
