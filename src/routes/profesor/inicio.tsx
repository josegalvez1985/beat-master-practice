import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { CalendarDays, ChevronRight, Inbox, Plus, Search, Trash2, Users } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { ClaseItem } from "@/components/ClaseItem";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/components/Link";
import { PageMeta } from "@/components/PageMeta";
import { Button, buttonForeground } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { usePerfil, type Perfil } from "@/lib/auth";
import {
  agregarAlumno,
  buscarAlumnos,
  inscripcionId,
  progreso,
  quitarInscripcion,
  useClasesProfesor,
  useEntregasProfesor,
  useInscripcionesProfesor,
  type Clase,
  type Entrega,
  type Inscripcion,
} from "@/lib/data";
import { hoy, inicioDeSemana, rango } from "@/lib/dates";
import { formatearDocumento } from "@/lib/documento";
import { instrumento, type InstrumentId } from "@/lib/instruments";
import { colors, fonts, radius } from "@/lib/theme";

export default function ProfesorInicio() {
  const perfil = usePerfil();
  const { width } = useWindowDimensions();
  const lg = width >= 1024;
  const inscripciones = useInscripcionesProfesor(perfil.uid);
  const clases = useClasesProfesor(perfil.uid);
  const entregas = useEntregasProfesor(perfil.uid);

  const fechaHoy = hoy();
  const [inicioMes, finMes] = rango("mes", fechaHoy);
  const semana = inicioDeSemana(fechaHoy);
  const alumnos = new Set(inscripciones.data.map((i) => i.alumnoId)).size;
  const clasesMes = clases.data.filter((c) => c.fecha >= inicioMes && c.fecha <= finMes).length;
  const entregasSemana = entregas.data.filter(
    (e) => e.actualizadoEn && e.actualizadoEn.toDate() >= new Date(`${semana}T00:00:00`),
  ).length;

  return (
    <>
      <PageMeta
        title="Inicio — Pulso"
        description="Tus alumnos, su progreso y tus próximas clases."
      />
      <View>
        <Text style={shellStyles.pageTitle}>Hola, {perfil.nombre.split(" ")[0]}</Text>
        <Text style={shellStyles.pageSubtitle}>
          Enseñas {perfil.instrumentos.map((id) => instrumento(id).name).join(", ")}.
        </Text>
      </View>

      <View style={styles.stats}>
        <Stat icon={Users} label="Alumnos" value={String(alumnos)} />
        <Stat icon={CalendarDays} label="Clases este mes" value={String(clasesMes)} />
        <Stat icon={Inbox} label="Entregas esta semana" value={String(entregasSemana)} />
      </View>

      <View style={[styles.columns, lg && styles.row]}>
        <View style={[styles.column, lg && styles.mainColumn]}>
          <AgregarAlumno perfil={perfil} inscripciones={inscripciones.data} />
          <MisAlumnos
            perfil={perfil}
            inscripciones={inscripciones.data}
            loading={inscripciones.loading}
            clases={clases.data}
            entregas={entregas.data}
          />
        </View>
        <View style={[styles.column, lg && styles.sideColumn]}>
          <ProximasClases clases={clases.data.filter((c) => c.fecha >= fechaHoy).slice(0, 6)} />
        </View>
      </View>
    </>
  );
}

function AgregarAlumno({
  perfil,
  inscripciones,
}: {
  perfil: Perfil;
  inscripciones: Inscripcion[];
}) {
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<Perfil[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inscriptos = new Set(inscripciones.map((i) => i.id));

  const buscar = async () => {
    if (texto.trim().length < 2) {
      setError("Escribe un número de documento o al menos 2 letras del nombre.");
      return;
    }
    setError(null);
    setBuscando(true);
    try {
      setResultados(await buscarAlumnos(texto));
    } catch {
      setError("No se pudo buscar. Vuelve a probar.");
    } finally {
      setBuscando(false);
    }
  };

  const agregar = async (alumno: Perfil, id: InstrumentId) => {
    try {
      await agregarAlumno(perfil, alumno, id);
    } catch {
      setError(`No se pudo agregar a ${alumno.nombre}.`);
    }
  };

  return (
    <Section title="Agregar alumno" subtitle="Busca por número de documento o por nombre.">
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Input
            accessibilityLabel="Buscar alumno"
            placeholder="Ej. 4567890 o María González"
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={buscar}
            returnKeyType="search"
          />
        </View>
        <Button onPress={buscar} disabled={buscando}>
          {buscando ? (
            <ActivityIndicator size="small" color={buttonForeground()} />
          ) : (
            <Search size={16} color={buttonForeground()} />
          )}
          Buscar
        </Button>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {resultados?.length === 0 ? (
        <Text style={styles.muted}>
          No encontramos alumnos. Pídele que se registre en Pulso con su número de documento.
        </Text>
      ) : null}
      {resultados?.map((alumno) => (
        <View key={alumno.uid} style={styles.result}>
          <Avatar nombre={alumno.nombre} foto={alumno.foto} />
          <View style={styles.flex}>
            <Text style={styles.name}>{alumno.nombre}</Text>
            <Text style={styles.muted}>
              Doc. {formatearDocumento(alumno.nro_documento)} · Estudia{" "}
              {alumno.instrumentos.map((id) => instrumento(id).name).join(", ")}
            </Text>
            <View style={styles.chips}>
              {perfil.instrumentos.map((id) => {
                const agregado = inscriptos.has(inscripcionId(perfil.uid, alumno.uid, id));
                return (
                  <Chip
                    key={id}
                    label={agregado ? `${instrumento(id).name} ✓` : `+ ${instrumento(id).name}`}
                    selected={agregado}
                    onPress={agregado ? () => {} : () => agregar(alumno, id)}
                  />
                );
              })}
            </View>
          </View>
        </View>
      ))}
    </Section>
  );
}

function MisAlumnos({
  perfil,
  inscripciones,
  loading,
  clases,
  entregas,
}: {
  perfil: Perfil;
  inscripciones: Inscripcion[];
  loading: boolean;
  clases: Clase[];
  entregas: Entrega[];
}) {
  const [filtro, setFiltro] = useState<InstrumentId | null>(null);
  const visibles = inscripciones.filter((i) => !filtro || i.instrumento === filtro);

  const quitar = (inscripcion: Inscripcion) => {
    const nombre = instrumento(inscripcion.instrumento).name;
    if (window.confirm(`¿Quitar a ${inscripcion.alumnoNombre} de tu lista de ${nombre}?`)) {
      quitarInscripcion(inscripcion.id);
    }
  };

  return (
    <Section title="Mis alumnos" subtitle="Progreso: clases entregadas sobre clases planificadas.">
      {perfil.instrumentos.length > 1 ? (
        <View style={styles.chips}>
          <Chip label="Todos" selected={!filtro} onPress={() => setFiltro(null)} />
          {perfil.instrumentos.map((id) => (
            <Chip
              key={id}
              label={instrumento(id).name}
              selected={filtro === id}
              onPress={() => setFiltro(id)}
            />
          ))}
        </View>
      ) : null}
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && visibles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no tienes alumnos en tu lista"
          description="Búscalos arriba por número de documento o nombre. Al agregarlos se les habilitan tus clases."
        />
      ) : null}
      {visibles.map((inscripcion) => {
        const p = progreso(clases, entregas, inscripcion.alumnoId, inscripcion.instrumento);
        return (
          <View key={inscripcion.id} style={styles.studentRow}>
            <Link href={`/alumnos/${inscripcion.alumnoId}`}>
              <Pressable style={styles.studentMain}>
                <Avatar nombre={inscripcion.alumnoNombre} />
                <View style={styles.flex}>
                  <View style={styles.studentHeader}>
                    <Text numberOfLines={1} style={styles.name}>
                      {inscripcion.alumnoNombre}
                    </Text>
                    <Text style={styles.percent}>{p.porcentaje}%</Text>
                  </View>
                  <Text style={styles.muted}>
                    Doc. {formatearDocumento(inscripcion.alumnoDocumento)} ·{" "}
                    {instrumento(inscripcion.instrumento).name} · {p.hechas} de {p.total} clases
                  </Text>
                  <Progress value={p.porcentaje} style={styles.progress} />
                </View>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </Pressable>
            </Link>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar a ${inscripcion.alumnoNombre}`}
              onPress={() => quitar(inscripcion)}
              style={styles.iconButton}
            >
              <Trash2 size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        );
      })}
    </Section>
  );
}

function ProximasClases({ clases }: { clases: Clase[] }) {
  return (
    <Section
      title="Próximas clases"
      actions={
        <Link href="/planificacion">
          <Button variant="secondary" size="sm">
            <Plus size={14} color={buttonForeground("secondary")} />
            Planificar
          </Button>
        </Link>
      }
    >
      {clases.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No hay clases planificadas"
          description="Arma tu plan por semana, mes o año en Planificación."
        />
      ) : null}
      {clases.map((clase) => (
        <ClaseItem key={clase.id} clase={clase} />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
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
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  result: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  chips: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.destructive,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studentMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  studentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  percent: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.primary,
  },
  progress: {
    marginTop: 8,
    height: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
});
