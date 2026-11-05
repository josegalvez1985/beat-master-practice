import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  CalendarDays,
  ChevronRight,
  Inbox,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Bienvenida } from "@/components/Bienvenida";
import { ParaHoy } from "@/components/ParaHoy";
import { AvisoPlan, BloqueadoPorPlan, usePlanProfesor } from "@/components/PlanAviso";
import { Pastilla, pastillaStyles } from "@/components/ui/pastilla";
import { ClaseItem } from "@/components/ClaseItem";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/components/Link";
import { PageMeta } from "@/components/PageMeta";
import { Button, buttonForeground } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { confirmar } from "@/components/ui/confirmar";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { avisar } from "@/components/ui/toast";
import { usePerfil, type Perfil } from "@/lib/auth";
import { invitacionAlumno } from "@/lib/contacto";
import {
  agregarAlumno,
  buscarPorDocumento,
  inscripcionId,
  nombreDestino,
  progreso,
  quitarInscripcion,
  sinRevisar,
  textoAlDia,
  useClasesProfesor,
  useEntregasProfesor,
  useInscripcionesProfesor,
  useLogrosProfesor,
  type Clase,
  type Entrega,
  type Inscripcion,
  type Logros,
} from "@/lib/data";
import { hoy, rango } from "@/lib/dates";
import { documentoValido, formatearDocumento, normalizarDocumento } from "@/lib/documento";
import { instrumento, type InstrumentId } from "@/lib/instruments";
import { avanceDeNivel, nivelLabel } from "@/lib/ruta";
import { colors, fonts, radius } from "@/lib/theme";

export default function ProfesorInicio() {
  const perfil = usePerfil();
  const { width } = useWindowDimensions();
  const lg = width >= 1024;
  const inscripciones = useInscripcionesProfesor(perfil.uid);
  const clases = useClasesProfesor(perfil.uid);
  const entregas = useEntregasProfesor(perfil.uid);
  const logros = useLogrosProfesor(perfil.uid);

  const fechaHoy = hoy();
  const [inicioMes, finMes] = rango("mes", fechaHoy);
  const alumnos = new Set(inscripciones.data.map((i) => i.alumnoId)).size;
  const clasesMes = clases.data.filter((c) => c.fecha >= inicioMes && c.fecha <= finMes).length;
  const porRevisar = entregas.data.filter(sinRevisar).length;

  return (
    <>
      <PageMeta
        title="Inicio — Pulso"
        description="Tus alumnos, su progreso y tus próximas clases."
      />
      <Bienvenida
        titulo={`Hola, ${perfil.nombre.split(" ")[0]}`}
        subtitulo={`Enseñas ${perfil.instrumentos.map((id) => instrumento(id).name).join(", ")}.`}
        instrumentos={perfil.instrumentos}
        rol="profesor"
      >
        <View style={[pastillaStyles.fila, styles.porInstrumento]}>
          {perfil.instrumentos.map((id) => {
            const item = instrumento(id);
            const cantidad = inscripciones.data.filter((i) => i.instrumento === id).length;
            return (
              <Pastilla
                key={id}
                icon={item.icon}
                label={item.name}
                valor={`${cantidad} ${cantidad === 1 ? "alumno" : "alumnos"}`}
              />
            );
          })}
        </View>
      </Bienvenida>

      <AvisoPlan uid={perfil.uid} />

      <ParaHoy
        uid={perfil.uid}
        inscripciones={inscripciones.data}
        clases={clases.data}
        entregas={entregas.data}
      />

      <View style={styles.stats}>
        <Stat icon={Users} label="Alumnos" value={String(alumnos)} />
        <Stat icon={CalendarDays} label="Clases este mes" value={String(clasesMes)} />
        <Stat icon={Inbox} label="Por revisar" value={String(porRevisar)} />
      </View>

      <View style={[styles.columns, lg && styles.row]}>
        <View style={[styles.column, lg && styles.mainColumn]}>
          <MisAlumnos
            perfil={perfil}
            inscripciones={inscripciones.data}
            loading={inscripciones.loading}
            clases={clases.data}
            entregas={entregas.data}
            logros={logros.data}
          />
        </View>
        <View style={[styles.column, lg && styles.sideColumn]}>
          <ProximasClases
            clases={clases.data.filter((c) => c.fecha >= fechaHoy).slice(0, 6)}
            inscripciones={inscripciones.data}
          />
        </View>
      </View>
    </>
  );
}

// Adding someone is occasional: it opens from a button, it does not take the top of the home.
function AgregarAlumno({
  perfil,
  inscripciones,
  visible,
  onClose,
}: {
  perfil: Perfil;
  inscripciones: Inscripcion[];
  visible: boolean;
  onClose: () => void;
}) {
  const plan = usePlanProfesor(perfil.uid);
  const alumnos = new Set(inscripciones.map((i) => i.alumnoId)).size;
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Agregar alumno"
      description={
        plan.limite
          ? `Carga su número de documento. Tienes ${alumnos} de ${plan.limite} alumnos de tu plan.`
          : "Carga su número de documento."
      }
    >
      <FormularioAlumno perfil={perfil} inscripciones={inscripciones} />
    </Dialog>
  );
}

function FormularioAlumno({
  perfil,
  inscripciones,
}: {
  perfil: Perfil;
  inscripciones: Inscripcion[];
}) {
  const [documento, setDocumento] = useState("");
  const [buscando, setBuscando] = useState(false);
  // The alumno with that exact document number; null until one is found.
  const [alumno, setAlumno] = useState<Perfil | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState<string | null>(null);
  const inscriptos = new Set(inscripciones.map((i) => i.id));
  const plan = usePlanProfesor(perfil.uid);
  const [sinCuenta, setSinCuenta] = useState(false);

  const cambiarDocumento = (valor: string) => {
    setDocumento(valor);
    // A different number is a different person: the name shown no longer applies.
    setAlumno(null);
    setAviso(null);
    setError(null);
    setSinCuenta(false);
  };

  const buscar = async () => {
    const nro = normalizarDocumento(documento);
    setAlumno(null);
    setAviso(null);
    setSinCuenta(false);
    if (!documentoValido(nro)) {
      setError("Escribe el número de documento del alumno (solo números, de 5 a 10 cifras).");
      return;
    }
    setError(null);
    setBuscando(true);
    try {
      const encontrado = await buscarPorDocumento(nro);
      if (!encontrado) {
        setAviso(
          `Todavía no hay ninguna cuenta con el documento ${formatearDocumento(nro)}. Invítalo a registrarse con ese número.`,
        );
        setSinCuenta(true);
      } else if (encontrado.rol !== "alumno") {
        setAviso(
          `El documento ${formatearDocumento(nro)} es de una cuenta de profesor, no de alumno.`,
        );
      } else {
        setAlumno(encontrado);
      }
    } catch {
      setError("No se pudo buscar. Vuelve a probar.");
    } finally {
      setBuscando(false);
    }
  };

  const agregar = async (alumno: Perfil, id: InstrumentId) => {
    setError(null);
    setAgregando(`${alumno.uid}_${id}`);
    try {
      await agregarAlumno(alumno, id);
      avisar({ texto: `Agregaste a ${alumno.nombre} a ${instrumento(id).name}.` });
    } catch (e) {
      // The function explains the plan's limit or a blocked plan; anything else is generic.
      const { code, message } = (e ?? {}) as { code?: string; message?: string };
      setError(
        code && code !== "functions/internal" && code !== "functions/unavailable" && message
          ? message
          : `No se pudo agregar a ${alumno.nombre}. Revisa tu conexión.`,
      );
    } finally {
      setAgregando(null);
    }
  };

  return (
    <View style={styles.formulario}>
      {plan.bloqueado ? <BloqueadoPorPlan que="agregar alumnos" /> : null}
      <View style={styles.campos}>
        <View style={styles.campo}>
          <Label>Nro. de documento</Label>
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <Input
                accessibilityLabel="Número de documento del alumno"
                placeholder="Ej. 4567890"
                value={documento}
                onChangeText={cambiarDocumento}
                onSubmitEditing={buscar}
                keyboardType="number-pad"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
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
        </View>
        <View style={styles.campo}>
          <Label>Nombre del alumno</Label>
          <Input
            accessibilityLabel="Nombre del alumno"
            placeholder="Aparece al buscar el documento"
            value={alumno?.nombre ?? ""}
            editable={false}
            style={styles.soloLectura}
          />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {aviso ? <Text style={styles.muted}>{aviso}</Text> : null}
      {sinCuenta ? <InvitarPorWhatsApp nombre={perfil.nombre} /> : null}
      {alumno ? (
        <View style={styles.result}>
          <Avatar nombre={alumno.nombre} foto={alumno.foto} />
          <View style={styles.flex}>
            <Text style={styles.muted}>
              Doc. {formatearDocumento(alumno.nro_documento)} · Estudia{" "}
              {alumno.instrumentos.map((id) => instrumento(id).name).join(", ")}
            </Text>
            <Text style={styles.muted}>Agrégalo a tu lista de:</Text>
            <View style={styles.chips}>
              {perfil.instrumentos.map((id) => {
                const agregado = inscriptos.has(inscripcionId(perfil.uid, alumno.uid, id));
                const ocupado = agregando === `${alumno.uid}_${id}`;
                return (
                  <Chip
                    key={id}
                    label={
                      agregado
                        ? `${instrumento(id).name} ✓`
                        : ocupado
                          ? `Agregando ${instrumento(id).name}…`
                          : `+ ${instrumento(id).name}`
                    }
                    selected={agregado}
                    onPress={
                      agregado || plan.bloqueado || agregando ? () => {} : () => agregar(alumno, id)
                    }
                  />
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
      {!sinCuenta && !alumno ? (
        <View style={styles.invitar}>
          <Text style={styles.muted}>¿Todavía no tiene cuenta?</Text>
          <InvitarPorWhatsApp nombre={perfil.nombre} />
        </View>
      ) : null}
    </View>
  );
}

// The message is ready: WhatsApp asks who to send it to. Nothing is saved in Pulso.
function InvitarPorWhatsApp({ nombre }: { nombre: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      href={invitacionAlumno(nombre)}
      hrefAttrs={{ target: "_blank", rel: "noopener" }}
      style={styles.enlace}
    >
      <MessageCircle size={14} color={colors.foreground} />
      <Text style={styles.enlaceTexto}>Invitar por WhatsApp</Text>
    </Pressable>
  );
}

function MisAlumnos({
  perfil,
  inscripciones,
  loading,
  clases,
  entregas,
  logros,
}: {
  perfil: Perfil;
  inscripciones: Inscripcion[];
  loading: boolean;
  clases: Clase[];
  entregas: Entrega[];
  logros: Logros[];
}) {
  const [agregando, setAgregando] = useState(false);
  const [filtro, setFiltro] = useState<InstrumentId | null>(null);
  const visibles = inscripciones.filter((i) => !filtro || i.instrumento === filtro);

  const quitar = async (inscripcion: Inscripcion) => {
    const nombre = instrumento(inscripcion.instrumento).name;
    const ok = await confirmar({
      titulo: `¿Quitar a ${inscripcion.alumnoNombre}?`,
      mensaje: `Sale de tu lista de ${nombre} y deja de ver tus clases de ${nombre}. Se borra lo que tenía en esta lista:`,
      detalle: [
        "Su ruta de aprendizaje",
        "Sus metas de la semana",
        "Su repertorio",
        "Tus notas sobre este alumno",
      ],
      aceptar: "Quitar de la lista",
      peligro: true,
    });
    if (!ok) return;
    try {
      await quitarInscripcion(inscripcion);
      avisar({ texto: `${inscripcion.alumnoNombre} ya no está en tu lista de ${nombre}.` });
    } catch {
      avisar({ texto: "No se pudo quitar al alumno. Revisa tu conexión.", tipo: "error" });
    }
  };

  return (
    <Section
      title="Mis alumnos"
      subtitle="La barra es su avance en la ruta de aprendizaje."
      actions={
        <Button
          variant={inscripciones.length ? "secondary" : "default"}
          onPress={() => setAgregando(true)}
        >
          <UserPlus
            size={16}
            color={buttonForeground(inscripciones.length ? "secondary" : "default")}
          />
          Agregar alumno
        </Button>
      }
    >
      <AgregarAlumno
        perfil={perfil}
        inscripciones={inscripciones}
        visible={agregando}
        onClose={() => setAgregando(false)}
      />
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
          description="Toca «Agregar alumno» y carga su número de documento. Al agregarlos ven las clases que les asignes."
        />
      ) : null}
      {visibles.map((inscripcion) => {
        const p = progreso(clases, entregas, inscripcion);
        const ruta = logros.find((l) => l.id === inscripcion.id);
        const nivel = ruta?.nivel ?? "inicial";
        const avance = avanceDeNivel(inscripcion.instrumento, nivel, ruta?.cumplidos ?? []);
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
                    <Text style={styles.percent}>{avance}%</Text>
                  </View>
                  <Text style={styles.muted}>
                    {instrumento(inscripcion.instrumento).name} · nivel{" "}
                    {nivelLabel(nivel).toLowerCase()} · {textoAlDia(p)}
                  </Text>
                  <Progress value={avance} style={styles.progress} />
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

function ProximasClases({
  clases,
  inscripciones,
}: {
  clases: Clase[];
  inscripciones: Inscripcion[];
}) {
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
        <ClaseItem key={clase.id} clase={clase} destino={nombreDestino(clase, inscripciones)} />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  porInstrumento: {
    marginTop: 12,
  },
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
  formulario: {
    marginTop: 16,
    gap: 12,
  },
  invitar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  enlace: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  enlaceTexto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  campos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  campo: {
    flexGrow: 1,
    flexBasis: 240,
    gap: 6,
  },
  soloLectura: {
    backgroundColor: colors.muted,
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
