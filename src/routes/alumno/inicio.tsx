import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSearchParams } from "react-router";
import { CalendarDays, UserPlus } from "lucide-react";
import { AvanceSemana } from "@/components/AvanceSemana";
import { Bienvenida } from "@/components/Bienvenida";
import { ClaseItem } from "@/components/ClaseItem";
import { HistorialCorrecciones, Novedades } from "@/components/Correcciones";
import { ResumenDiario } from "@/components/herramientas/Diario";
import { BienvenidaAlumno, vioBienvenida } from "@/components/BienvenidaAlumno";
import { MetasSemana } from "@/components/MetasSemana";
import { MiEvolucion } from "@/components/MiEvolucion";
import { PracticaDeHoy } from "@/components/PracticaDeHoy";
import { Repertorio } from "@/components/Repertorio";
import { Insignias } from "@/components/Insignias";
import { Habilidades } from "@/components/Rubrica";
import { RutaAprendizaje } from "@/components/RutaAprendizaje";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { usePerfil } from "@/lib/auth";
import {
  desdeSuIngreso,
  fechaDeIngreso,
  progreso,
  textoAlDia,
  useClasesDeInscripciones,
  useDiarioAlumno,
  useEntregasAlumno,
  useInscripcionesAlumno,
  useLogrosAlumno,
  useMetasAlumno,
  useRecordsAlumno,
  useRepertorioAlumno,
  type Clase,
  type Entrega,
  type Inscripcion,
} from "@/lib/data";
import { hoy } from "@/lib/dates";
import { formatearDocumento } from "@/lib/documento";
import { instrumentosDe } from "@/lib/herramientas";
import { insignias } from "@/lib/insignias";
import { instrumento } from "@/lib/instruments";
import { colors, fonts } from "@/lib/theme";

const VISTAS = [
  { value: "hoy", label: "Hoy" },
  { value: "clases", label: "Mis clases" },
  { value: "progreso", label: "Mi progreso" },
] as const;
type Vista = (typeof VISTAS)[number]["value"];

// Three questions, one per tab: what do I do today, what are my classes, how am I doing. The tab
// lives in the URL (?ver=), so going back from a class returns to it.
export default function AlumnoInicio() {
  const perfil = usePerfil();
  const { width } = useWindowDimensions();
  const lg = width >= 1024;
  const [params, setParams] = useSearchParams();
  const ver: Vista = VISTAS.find((v) => v.value === params.get("ver"))?.value ?? "hoy";

  const inscripciones = useInscripcionesAlumno(perfil.uid);
  const entregas = useEntregasAlumno(perfil.uid);
  const clases = useClasesDeInscripciones(inscripciones.data);
  const logros = useLogrosAlumno(perfil.uid);
  const diario = useDiarioAlumno(perfil.uid);
  const records = useRecordsAlumno(perfil.uid);
  const obras = useRepertorioAlumno(perfil.uid);
  const metas = useMetasAlumno(perfil.uid);
  const [bienvenida, setBienvenida] = useState(() => !vioBienvenida(perfil.uid));
  const misInstrumentos = instrumentosDe(perfil.instrumentos, inscripciones.data);
  const vigentes = desdeSuIngreso(clases.data, inscripciones.data);
  const lista = insignias({
    entregas: entregas.data,
    diario: diario.data,
    records: records.data,
    logros: logros.data,
    instrumentos: misInstrumentos,
  });
  const sinProfesor = !inscripciones.loading && inscripciones.data.length === 0;

  return (
    <>
      <PageMeta title="Inicio — Pulso" description="Tus clases, tus entregas y tu progreso." />
      <Bienvenida
        titulo={`Hola, ${perfil.nombre.split(" ")[0]}`}
        instrumentos={misInstrumentos}
        rol="alumno"
      >
        <AvanceSemana
          perfil={perfil}
          instrumentos={misInstrumentos}
          clases={vigentes}
          entregas={entregas.data}
        />
      </Bienvenida>

      {bienvenida ? (
        <BienvenidaAlumno
          perfil={perfil}
          instrumentos={misInstrumentos}
          onClose={() => setBienvenida(false)}
        />
      ) : null}

      {inscripciones.loading ? <ActivityIndicator color={colors.primary} /> : null}
      {sinProfesor ? (
        <EmptyState
          icon={UserPlus}
          title="Todavía no estás en la lista de un profesor"
          description={`Pásale tu número de documento (${formatearDocumento(perfil.nro_documento)}) a tu profesor. Cuando te agregue, aquí aparecerán sus clases.`}
        />
      ) : null}

      {inscripciones.data.length ? (
        <Segmented
          value={ver}
          options={VISTAS}
          onChange={(v) => setParams(v === "hoy" ? {} : { ver: v }, { replace: true })}
        />
      ) : null}

      {inscripciones.data.length && ver === "hoy" ? (
        <View style={[styles.columns, lg && styles.row]}>
          <View style={[styles.column, lg && styles.mainColumn]}>
            <Novedades uid={perfil.uid} clases={clases.data} entregas={entregas.data} />
            {clases.loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <PracticaDeHoy
                alumnoId={perfil.uid}
                instrumentos={misInstrumentos}
                clases={vigentes}
                entregas={entregas.data}
                obras={obras.data}
                metas={metas.data}
              />
            )}
          </View>
          <View style={[styles.column, lg && styles.sideColumn]}>
            <ResumenDiario perfil={perfil} />
          </View>
        </View>
      ) : null}

      {inscripciones.data.length && ver === "clases"
        ? inscripciones.data.map((inscripcion) => (
            <InscripcionCard
              key={inscripcion.id}
              inscripcion={inscripcion}
              clases={clases.data}
              cargando={clases.loading}
              entregas={entregas.data}
            />
          ))
        : null}

      {inscripciones.data.length && ver === "progreso" ? (
        <View style={[styles.columns, lg && styles.row]}>
          <View style={[styles.column, lg && styles.mainColumn]}>
            {inscripciones.data.map((inscripcion) => (
              <Section
                key={inscripcion.id}
                title={instrumento(inscripcion.instrumento).name}
                subtitle={`Prof. ${inscripcion.profesorNombre}`}
              >
                <RutaAprendizaje
                  inscripcion={inscripcion}
                  logros={logros.data.find((l) => l.id === inscripcion.id)}
                  editable={false}
                />
                <MetasSemana inscripcion={inscripcion} metas={metas.data} />
                <Repertorio inscripcion={inscripcion} obras={obras.data} />
                <Habilidades
                  instrumento={inscripcion.instrumento}
                  entregas={entregas.data.filter((e) => e.profesorId === inscripcion.profesorId)}
                />
              </Section>
            ))}
            {entregas.data.length ? (
              <Section
                title="Mi evolución"
                subtitle="Tu primera grabación al lado de la última, y cómo cambian tus mediciones."
              >
                <MiEvolucion instrumentos={misInstrumentos} entregas={entregas.data} />
              </Section>
            ) : null}
          </View>
          <View style={[styles.column, lg && styles.sideColumn]}>
            <HistorialCorrecciones clases={clases.data} entregas={entregas.data} />
            <Section
              title="Tus insignias"
              subtitle={`${lista.filter((i) => i.ganada).length} de ${lista.length} ganadas`}
            >
              <Insignias lista={lista} />
            </Section>
          </View>
        </View>
      ) : null}
    </>
  );
}

const VISIBLES = 5;

// One profesor + instrument: how up to date they are and the classes, pending ones first. Classes
// from before they joined stay available at the end, without a status: nothing is due from them.
function InscripcionCard({
  inscripcion,
  clases,
  cargando,
  entregas,
}: {
  inscripcion: Inscripcion;
  clases: Clase[];
  cargando: boolean;
  entregas: Entrega[];
}) {
  const [todas, setTodas] = useState(false);
  const deLaLista = clases.filter(
    (c) => c.profesorId === inscripcion.profesorId && c.instrumento === inscripcion.instrumento,
  );
  const p = progreso(deLaLista, entregas, inscripcion);
  const entregadas = new Set(entregas.map((e) => e.claseId));
  const fechaHoy = hoy();
  const ingreso = fechaDeIngreso(inscripcion);

  const orden = (claseId: string, fecha: string) =>
    entregadas.has(claseId) ? 2 : fecha < ingreso ? 3 : fecha < fechaHoy ? 0 : 1;
  const lista = [...deLaLista].sort(
    (a, b) => orden(a.id, a.fecha) - orden(b.id, b.fecha) || a.fecha.localeCompare(b.fecha),
  );
  const mostradas = todas ? lista : lista.slice(0, VISIBLES);

  return (
    <Section
      title={instrumento(inscripcion.instrumento).name}
      subtitle={`Prof. ${inscripcion.profesorNombre} · ${textoAlDia(p)}`}
    >
      {p.total ? <Progress value={p.porcentaje} /> : null}
      {cargando ? <ActivityIndicator color={colors.primary} /> : null}
      {!cargando && lista.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Tu profesor todavía no publicó clases para ti"
          description="Cuando las planifique, aparecerán aquí."
        />
      ) : null}
      {mostradas.map((clase) => (
        <ClaseItem
          key={clase.id}
          clase={clase}
          estado={
            entregadas.has(clase.id) ? "entregada" : clase.fecha < ingreso ? undefined : "pendiente"
          }
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
      {p.pendientes ? (
        <Text style={styles.ayuda}>
          Te{" "}
          {p.pendientes === 1 ? "falta entregar 1 clase" : `faltan entregar ${p.pendientes} clases`}
          .
        </Text>
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
  more: {
    alignSelf: "flex-start",
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
