import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CalendarDays, UserPlus, Wrench } from "lucide-react";
import { Afinador } from "@/components/Afinador";
import { AvanceSemana } from "@/components/AvanceSemana";
import { Bienvenida } from "@/components/Bienvenida";
import { ClaseItem } from "@/components/ClaseItem";
import { ResumenDiario } from "@/components/herramientas/Diario";
import { BienvenidaAlumno, vioBienvenida } from "@/components/BienvenidaAlumno";
import { InformeFamilia } from "@/components/InformeFamilia";
import { MetasSemana } from "@/components/MetasSemana";
import { MiEvolucion } from "@/components/MiEvolucion";
import { PracticaDeHoy } from "@/components/PracticaDeHoy";
import { Repertorio } from "@/components/Repertorio";
import { Insignias } from "@/components/Insignias";
import { Habilidades } from "@/components/Rubrica";
import { RutaAprendizaje } from "@/components/RutaAprendizaje";
import { Link } from "@/components/Link";
import { Metronome } from "@/components/Metronome";
import { PageMeta } from "@/components/PageMeta";
import { ProximaPractica } from "@/components/ProximaPractica";
import { Button, buttonForeground } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { afinable } from "@/lib/afinador";
import { usePerfil } from "@/lib/auth";
import {
  progreso,
  useClasesDe,
  useClasesDeInscripciones,
  useDiarioAlumno,
  useEntregasAlumno,
  useInscripcionesAlumno,
  useLogrosAlumno,
  useMetasAlumno,
  useRecordsAlumno,
  useRepertorioAlumno,
  type Entrega,
  type Inscripcion,
  type Logros,
  type Meta,
  type Obra,
} from "@/lib/data";
import { hoy } from "@/lib/dates";
import { formatearDocumento } from "@/lib/documento";
import { instrumentosDe } from "@/lib/herramientas";
import { insignias } from "@/lib/insignias";
import { instrumento } from "@/lib/instruments";
import { colors, fonts } from "@/lib/theme";

export default function AlumnoInicio() {
  const perfil = usePerfil();
  const { width } = useWindowDimensions();
  const lg = width >= 1024;
  const inscripciones = useInscripcionesAlumno(perfil.uid);
  const entregas = useEntregasAlumno(perfil.uid);
  const clases = useClasesDeInscripciones(inscripciones.data);
  // Only the tuner of instruments this alumno studies (profile or a profesor list).
  const afinables = instrumentosDe(perfil.instrumentos, inscripciones.data).filter(afinable);
  const logros = useLogrosAlumno(perfil.uid);
  const diario = useDiarioAlumno(perfil.uid);
  const records = useRecordsAlumno(perfil.uid);
  const obras = useRepertorioAlumno(perfil.uid);
  const metas = useMetasAlumno(perfil.uid);
  const [bienvenida, setBienvenida] = useState(() => !vioBienvenida(perfil.uid));
  const misInstrumentos = instrumentosDe(perfil.instrumentos, inscripciones.data);
  const lista = insignias({
    entregas: entregas.data,
    diario: diario.data,
    records: records.data,
    logros: logros.data,
  });

  return (
    <>
      <PageMeta title="Inicio — Pulso" description="Tus clases, tus entregas y tu progreso." />
      <Bienvenida
        titulo={`Hola, ${perfil.nombre.split(" ")[0]}`}
        instrumentos={instrumentosDe(perfil.instrumentos, inscripciones.data)}
      >
        <AvanceSemana
          perfil={perfil}
          instrumentos={instrumentosDe(perfil.instrumentos, inscripciones.data)}
          clases={clases.data}
          entregas={entregas.data}
        />
      </Bienvenida>

      {inscripciones.data.length && !clases.loading ? (
        <ProximaPractica alumnoId={perfil.uid} clases={clases.data} entregas={entregas.data} />
      ) : null}

      {inscripciones.data.length ? (
        <PracticaDeHoy
          instrumentos={misInstrumentos}
          clases={clases.data}
          entregas={entregas.data}
          obras={obras.data}
          metas={metas.data}
        />
      ) : null}

      {bienvenida ? (
        <BienvenidaAlumno
          perfil={perfil}
          instrumentos={misInstrumentos}
          onClose={() => setBienvenida(false)}
        />
      ) : null}

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
              logros={logros.data.find((l) => l.id === inscripcion.id)}
              obras={obras.data}
              metas={metas.data}
            />
          ))}
          {entregas.data.length ? (
            <Section
              title="Mi evolución"
              subtitle="Tu primera grabación al lado de la última, y cómo cambian tu afinación y tu tiempo."
            >
              <MiEvolucion instrumentos={misInstrumentos} entregas={entregas.data} />
            </Section>
          ) : null}
        </View>
        <View style={[styles.column, lg && styles.sideColumn]}>
          <ResumenDiario perfil={perfil} />
          <Section
            title="Tus insignias"
            subtitle={`${lista.filter((i) => i.ganada).length} de ${lista.length} ganadas`}
          >
            <Insignias lista={lista} />
          </Section>
          {afinables.length ? <Afinador instrumentos={afinables} /> : null}
          <Metronome />
          <Link href="/herramientas">
            <Button variant="secondary">
              <Wrench size={16} color={buttonForeground("secondary")} />
              Más herramientas para practicar
            </Button>
          </Link>
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
  logros,
  obras,
  metas,
}: {
  inscripcion: Inscripcion;
  entregas: Entrega[];
  logros: Logros | undefined;
  obras: Obra[];
  metas: Meta[];
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
      <RutaAprendizaje inscripcion={inscripcion} logros={logros} editable={false} />
      <MetasSemana inscripcion={inscripcion} metas={metas} />
      <Repertorio inscripcion={inscripcion} obras={obras} />
      <Habilidades
        instrumento={inscripcion.instrumento}
        entregas={entregas.filter((e) => e.profesorId === inscripcion.profesorId)}
      />
      <InformeFamilia
        inscripcion={inscripcion}
        clases={clases.data}
        entregas={entregas}
        logros={logros}
      />
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
