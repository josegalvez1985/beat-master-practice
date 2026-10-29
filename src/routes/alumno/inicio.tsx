import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CalendarDays, UserPlus } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { ClaseItem } from "@/components/ClaseItem";
import { Metronome } from "@/components/Metronome";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { usePerfil } from "@/lib/auth";
import {
  progreso,
  useClasesDe,
  useEntregasAlumno,
  useInscripcionesAlumno,
  type Entrega,
  type Inscripcion,
} from "@/lib/data";
import { hoy } from "@/lib/dates";
import { formatearDocumento } from "@/lib/documento";
import { instrumento } from "@/lib/instruments";
import { colors, fonts } from "@/lib/theme";

export default function AlumnoInicio() {
  const perfil = usePerfil();
  const { width } = useWindowDimensions();
  const lg = width >= 1024;
  const inscripciones = useInscripcionesAlumno(perfil.uid);
  const entregas = useEntregasAlumno(perfil.uid);

  return (
    <>
      <PageMeta title="Inicio — Pulso" description="Tus clases, tus entregas y tu progreso." />
      <View>
        <Text style={shellStyles.pageTitle}>Hola, {perfil.nombre.split(" ")[0]}</Text>
        <Text style={shellStyles.pageSubtitle}>
          Tu número de documento: {formatearDocumento(perfil.nro_documento)}
        </Text>
      </View>

      <View style={[styles.columns, lg && styles.row]}>
        <View style={[styles.column, lg && styles.mainColumn]}>
          {inscripciones.loading ? <ActivityIndicator color={colors.primary} /> : null}
          {!inscripciones.loading && inscripciones.data.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Todavía no estás en la lista de un profesor"
              description={`Pásale tu número de documento (${formatearDocumento(perfil.nro_documento)}) a tu profesor. Cuando te agregue, aquí aparecerán sus clases.`}
            />
          ) : null}
          {inscripciones.data.map((inscripcion) => (
            <InscripcionCard
              key={inscripcion.id}
              inscripcion={inscripcion}
              entregas={entregas.data}
            />
          ))}
        </View>
        <View style={[styles.column, lg && styles.sideColumn]}>
          <Metronome />
        </View>
      </View>
    </>
  );
}

const VISIBLES = 5;

// One profesor + instrument: progress bar and the classes, pending ones first.
function InscripcionCard({
  inscripcion,
  entregas,
}: {
  inscripcion: Inscripcion;
  entregas: Entrega[];
}) {
  const clases = useClasesDe(inscripcion.profesorId, inscripcion.instrumento);
  const [todas, setTodas] = useState(false);
  const p = progreso(clases.data, entregas, inscripcion.alumnoId, inscripcion.instrumento);
  const entregadas = new Set(entregas.map((e) => e.claseId));
  const fechaHoy = hoy();

  // Past classes not delivered yet, then upcoming, then delivered.
  const orden = (claseId: string, fecha: string) =>
    entregadas.has(claseId) ? 2 : fecha < fechaHoy ? 0 : 1;
  const lista = [...clases.data].sort(
    (a, b) => orden(a.id, a.fecha) - orden(b.id, b.fecha) || a.fecha.localeCompare(b.fecha),
  );
  const mostradas = todas ? lista : lista.slice(0, VISIBLES);

  return (
    <Section
      title={instrumento(inscripcion.instrumento).name}
      subtitle={`Prof. ${inscripcion.profesorNombre} · ${p.hechas} de ${p.total} clases entregadas`}
      actions={<Text style={styles.percent}>{p.porcentaje}%</Text>}
    >
      <Progress value={p.porcentaje} />
      {clases.loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!clases.loading && lista.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Tu profesor todavía no publicó clases"
          description="Cuando las planifique, aparecerán aquí."
        />
      ) : null}
      {mostradas.map((clase) => (
        <ClaseItem
          key={clase.id}
          clase={clase}
          estado={entregadas.has(clase.id) ? "entregada" : "pendiente"}
        />
      ))}
      {lista.length > VISIBLES ? (
        <Button
          variant="secondary"
          size="sm"
          style={styles.more}
          onPress={() => setTodas((v) => !v)}
        >
          {todas ? "Ver menos" : `Ver todas (${lista.length})`}
        </Button>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  columns: {
    gap: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  column: {
    gap: 24,
  },
  mainColumn: {
    flexGrow: 1.6,
    flexBasis: 0,
  },
  sideColumn: {
    flexGrow: 1,
    flexBasis: 0,
  },
  percent: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.primary,
  },
  more: {
    alignSelf: "flex-start",
  },
});
