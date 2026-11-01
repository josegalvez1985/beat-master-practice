import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigate, useParams } from "react-router";
import {
  CalendarPlus,
  CalendarX,
  ChevronLeft,
  Copy,
  FolderOpen,
  Lock,
  MessageCircle,
  Pencil,
  Trash2,
  Video,
} from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { Avatar } from "@/components/ui/avatar";
import { ClaseFormDialog } from "@/components/ClaseFormDialog";
import { Grabadora } from "@/components/Grabadora";
import { Link } from "@/components/Link";
import { MaterialList, UploadButton } from "@/components/Materials";
import { MensajesClase } from "@/components/MensajesClase";
import { RubricaEditor, RubricaVista } from "@/components/Rubrica";
import { PageMeta } from "@/components/PageMeta";
import { PlanClase } from "@/components/plan/PlanClase";
import { Button, buttonForeground } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Badge, Section } from "@/components/ui/section";
import { avisar } from "@/components/ui/toast";
import { usePerfil, type Perfil } from "@/lib/auth";
import { archivoIcs, enlaceGoogle } from "@/lib/calendario";
import {
  avisarAusencia,
  marcarAsistencia,
  responderDevolucion,
  useMensajes,
  useMensajesDeClase,
  agregarDevolucion,
  agregarMaterial,
  duplicarClase,
  eliminarClase,
  limpiarDevoluciones,
  quitarDevolucion,
  agregarArchivoEntrega,
  guardarComentario,
  quitarArchivoEntrega,
  quitarMaterial,
  useClase,
  useEntrega,
  useEntregasDeClase,
  useInscripcionesProfesor,
  type Asistencia,
  type Clase,
  type Entrega,
} from "@/lib/data";
import { formatoLargo, hoy, sumarDias } from "@/lib/dates";
import {
  ACCEPT_ENTREGA,
  ACCEPT_MATERIAL,
  borrarArchivo,
  limiteDeEntrega,
  type Material,
} from "@/lib/files";
import { instrumento } from "@/lib/instruments";
import { colors, fonts, radius } from "@/lib/theme";

export default function ClasePage() {
  const { claseId = "" } = useParams();
  const perfil = usePerfil();
  const clase = useClase(claseId);
  const esProfesor = perfil.rol === "profesor";
  const volver = esProfesor
    ? { href: "/planificacion", label: "Planificación" }
    : { href: "/", label: "Inicio" };

  return (
    <>
      <Link href={volver.href}>
        <Text style={styles.back}>
          <ChevronLeft size={14} color={colors.primary} /> {volver.label}
        </Text>
      </Link>
      {clase.loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!clase.loading && !clase.data ? (
        <EmptyState
          icon={Lock}
          title="Esta clase no está disponible"
          description="Puede que se haya eliminado o que tu profesor todavía no te haya agregado a su lista."
        />
      ) : null}
      {clase.data ? <Detalle clase={clase.data} perfil={perfil} /> : null}
    </>
  );
}

function Detalle({ clase, perfil }: { clase: Clase; perfil: Perfil }) {
  const navigate = useNavigate();
  const [editando, setEditando] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const esDueno = perfil.uid === clase.profesorId;

  const eliminar = async () => {
    if (
      !window.confirm(
        `¿Eliminar la clase "${clase.titulo}"? También se borran sus materiales y las entregas de los alumnos.`,
      )
    )
      return;
    await eliminarClase(clase);
    navigate("/planificacion", { replace: true });
  };

  // File first: if deleting it fails, the class keeps pointing at it.
  const quitar = async (material: Material) => {
    await borrarArchivo(material.ruta);
    await quitarMaterial(clase.id, material);
  };

  return (
    <>
      <PageMeta title={`${clase.titulo} — Pulso`} description={clase.descripcion.slice(0, 150)} />
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.date}>{formatoLargo(clase.fecha)}</Text>
          <Text style={shellStyles.pageTitle}>{clase.titulo}</Text>
          <View style={styles.badges}>
            <Badge label={instrumento(clase.instrumento).name} tone="primary" />
            {clase.evento ? <Badge label="Recital" tone="primary" /> : null}
            {clase.hora ? <Badge label={`${clase.hora} h`} /> : null}
            {clase.modalidad ? (
              <Badge label={clase.modalidad === "virtual" ? "Virtual" : "Presencial"} />
            ) : null}
            {esDueno ? null : <Badge label={`Prof. ${clase.profesorNombre}`} />}
            {!esDueno && clase.asistencia?.[perfil.uid] ? (
              <Badge
                label={ASISTENCIA[clase.asistencia[perfil.uid]!]}
                tone={clase.asistencia[perfil.uid] === "ausente" ? "muted" : "success"}
              />
            ) : null}
          </View>
          <AccionesDeFecha clase={clase} />
          {!esDueno && clase.fecha >= hoy() ? <NoPuedoIr clase={clase} perfil={perfil} /> : null}
        </View>
        {esDueno ? (
          <View style={styles.actions}>
            <Button variant="secondary" onPress={() => setEditando(true)}>
              <Pencil size={14} color={buttonForeground("secondary")} />
              Editar
            </Button>
            <Button variant="secondary" onPress={() => setDuplicando(true)}>
              <Copy size={14} color={buttonForeground("secondary")} />
              Duplicar
            </Button>
            <Button variant="outline" accessibilityLabel="Eliminar clase" onPress={eliminar}>
              <Trash2 size={14} color={buttonForeground("outline")} />
            </Button>
          </View>
        ) : null}
      </View>

      {clase.evento ? (
        <Section title="Recital" subtitle={clase.evento.lugar || undefined}>
          {clase.evento.programa.length ? (
            clase.evento.programa.map((p, i) => (
              <View key={i} style={styles.programa}>
                <Text style={styles.programaNumero}>{i + 1}</Text>
                <View style={styles.flex}>
                  <Text style={styles.name}>{p.obra || "Obra por definir"}</Text>
                  {p.interprete ? <Text style={styles.muted}>{p.interprete}</Text> : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>El programa todavía no está armado.</Text>
          )}
        </Section>
      ) : null}

      {clase.descripcion ? (
        <Section title="Objetivos y tarea">
          <Text style={styles.body}>{clase.descripcion}</Text>
        </Section>
      ) : null}

      <PlanClase clase={clase} esDueno={esDueno} alumnoId={perfil.uid} />

      {/* With a plan, an alumno does not need an empty "no materials" card. */}
      {esDueno || clase.materiales.length > 0 || !clase.bloques?.length ? (
        <Section
          title={clase.bloques?.length ? "Otros materiales" : "Materiales"}
          subtitle={
            esDueno ? "Audio, video, PDF, imágenes y partituras (MusicXML, Guitar Pro)." : undefined
          }
        >
          {clase.materiales.length === 0 ? (
            <Text style={styles.muted}>
              {esDueno
                ? "Sube lo que tus alumnos necesitan para esta clase."
                : "Esta clase no tiene materiales."}
            </Text>
          ) : (
            <MaterialList materiales={clase.materiales} onRemove={esDueno ? quitar : undefined} />
          )}
          {esDueno ? (
            <UploadButton
              label="Subir materiales"
              carpeta={`clases/${clase.id}`}
              accept={ACCEPT_MATERIAL}
              onUploaded={(material) => agregarMaterial(clase.id, material)}
            />
          ) : null}
        </Section>
      ) : null}

      {esDueno ? (
        <EntregasDeAlumnos clase={clase} perfil={perfil} />
      ) : (
        <MiEntrega clase={clase} perfil={perfil} />
      )}

      {esDueno && duplicando ? (
        <DuplicarDialog clase={clase} perfil={perfil} onClose={() => setDuplicando(false)} />
      ) : null}

      {esDueno ? (
        <ClaseFormDialog
          visible={editando}
          onClose={() => setEditando(false)}
          perfil={perfil}
          clase={clase}
          fechaInicial={clase.fecha}
        />
      ) : null}
    </>
  );
}

const ASISTENCIA: Record<Asistencia, string> = {
  presente: "Presente",
  tarde: "Llegó tarde",
  ausente: "Ausente",
};

// Join the video call and add the class to the calendar (with a reminder an hour before).
function AccionesDeFecha({ clase }: { clase: Clase }) {
  const ics = clase.hora ? archivoIcs(clase) : null;
  if (!clase.enlace && !ics) return null;
  return (
    <View style={styles.fechaAcciones}>
      {clase.modalidad === "virtual" && clase.enlace ? (
        <Pressable
          accessibilityRole="link"
          href={clase.enlace}
          hrefAttrs={{ target: "_blank", rel: "noopener" }}
          style={styles.enlace}
        >
          <Video size={14} color={colors.foreground} />
          <Text style={styles.enlaceTexto}>Entrar a la videollamada</Text>
        </Pressable>
      ) : null}
      {ics ? (
        <>
          <Pressable
            accessibilityRole="link"
            href={enlaceGoogle(clase)}
            hrefAttrs={{ target: "_blank", rel: "noopener" }}
            style={styles.enlace}
          >
            <CalendarPlus size={14} color={colors.foreground} />
            <Text style={styles.enlaceTexto}>Google Calendar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            href={ics.url}
            hrefAttrs={{ download: ics.nombre }}
            style={styles.enlace}
          >
            <CalendarPlus size={14} color={colors.foreground} />
            <Text style={styles.enlaceTexto}>Otro calendario (.ics)</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

// Alumno: "I cannot come", with an optional reason. It is a message of the class (type
// ausencia): the profesor sees it next to the attendance.
function NoPuedoIr({ clase, perfil }: { clase: Clase; perfil: Perfil }) {
  const mensajes = useMensajes(clase, perfil.uid);
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const avisado = mensajes.data.some((m) => m.tipo === "ausencia" && m.autorId === perfil.uid);

  if (avisado)
    return (
      <View style={styles.badges}>
        <Badge label="Avisaste que no vas" />
      </View>
    );

  const enviar = async () => {
    setEnviando(true);
    try {
      await avisarAusencia(clase, perfil.uid, motivo);
      avisar({ texto: "Le avisamos a tu profesor." });
      setAbierto(false);
    } catch {
      avisar({ texto: "No se pudo avisar.", tipo: "error" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setAbierto(true)}
        style={[styles.enlace, styles.noPuedo]}
      >
        <CalendarX size={14} color={colors.foreground} />
        <Text style={styles.enlaceTexto}>No puedo ir</Text>
      </Pressable>
      <Dialog
        visible={abierto}
        onClose={() => setAbierto(false)}
        title="No puedo ir a esta clase"
        description="Tu profesor lo verá en la clase, junto a la asistencia."
      >
        <View style={styles.duplicar}>
          <Input
            accessibilityLabel="Motivo"
            placeholder="Motivo (opcional): estoy enfermo, tengo un examen…"
            value={motivo}
            onChangeText={setMotivo}
            maxLength={300}
          />
          <Button disabled={enviando} onPress={enviar}>
            {enviando ? "Avisando…" : "Avisar a mi profesor"}
          </Button>
        </View>
      </Dialog>
    </>
  );
}

// The same class on another date, with its plan; files are not copied (see duplicarClase).
function DuplicarDialog({
  clase,
  perfil,
  onClose,
}: {
  clase: Clase;
  perfil: Perfil;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(sumarDias(clase.fecha, 7));
  const [guardando, setGuardando] = useState(false);
  const conArchivos =
    clase.materiales.length > 0 ||
    (clase.bloques ?? []).some((b) => b.tipo === "archivos" && b.archivos.length > 0);

  const duplicar = async () => {
    setGuardando(true);
    try {
      const id = await duplicarClase(perfil, clase, fecha);
      avisar({ texto: "Clase duplicada." });
      onClose();
      navigate(`/clases/${id}`);
    } catch {
      avisar({ texto: "No se pudo duplicar la clase.", tipo: "error" });
      setGuardando(false);
    }
  };

  return (
    <Dialog
      visible
      onClose={onClose}
      title="Duplicar clase"
      description="Se crea una clase igual (título, objetivos, ficha y plan) en la fecha que elijas."
    >
      <View style={styles.duplicar}>
        <DateInput label="Fecha de la copia" value={fecha} onChange={setFecha} />
        {conArchivos ? (
          <Text style={styles.muted}>
            Los archivos (materiales y bloques de archivos) no se copian: súbelos de nuevo en la
            copia. Así cada clase es dueña de sus archivos y borrar una no deja a la otra sin ellos.
          </Text>
        ) : null}
        <Button disabled={!fecha || guardando} onPress={duplicar}>
          <Copy size={16} color={buttonForeground()} />
          {guardando ? "Duplicando…" : "Duplicar"}
        </Button>
      </View>
    </Dialog>
  );
}

// Alumno: upload audio/video of the task and leave a note for the profesor.
function MiEntrega({ clase, perfil }: { clase: Clase; perfil: Perfil }) {
  const entrega = useEntrega(clase.id, perfil.uid);
  if (entrega.loading) return <ActivityIndicator color={colors.primary} />;
  return <EntregaForm clase={clase} perfil={perfil} entrega={entrega.data} />;
}

function EntregaForm({
  clase,
  perfil,
  entrega,
}: {
  clase: Clase;
  perfil: Perfil;
  entrega: Entrega | null;
}) {
  const [comentario, setComentario] = useState(entrega?.comentario ?? "");
  const [guardado, setGuardado] = useState(false);
  const archivos = entrega?.archivos ?? [];

  // Comments left on a file that is no longer here (see limpiarDevoluciones).
  useEffect(() => {
    if (entrega) limpiarDevoluciones(entrega, true).catch(() => {});
  }, [entrega]);

  const onGuardarComentario = async () => {
    if (!entrega) return;
    await guardarComentario(entrega, comentario.trim());
    setGuardado(true);
  };

  const quitar = async (material: Material) => {
    if (!entrega) return;
    await borrarArchivo(material.ruta);
    await quitarArchivoEntrega(entrega, material);
  };

  return (
    <Section
      title="Tu entrega"
      subtitle="Grábate aquí mismo en audio o video, o sube un archivo: grabación, foto o PDF (una tarea escrita, una partitura). Tu profesor lo verá al instante."
      actions={
        archivos.length ? <Badge label="Entregada" tone="success" /> : <Badge label="Pendiente" />
      }
    >
      {entrega?.evaluacion ? (
        <View style={styles.evaluacion}>
          <Text style={styles.name}>Evaluación de tu profesor</Text>
          <RubricaVista evaluacion={entrega.evaluacion} instrumento={clase.instrumento} />
        </View>
      ) : null}
      {archivos.length ? (
        <MaterialList
          materiales={archivos}
          onRemove={quitar}
          devoluciones={entrega?.devoluciones}
          respuestas={entrega?.respuestas}
          onResponder={(devolucion, respuesta) =>
            entrega &&
            void responderDevolucion(entrega, devolucion.id, respuesta).catch(() =>
              avisar({ texto: "No se pudo guardar tu respuesta.", tipo: "error" }),
            )
          }
        />
      ) : null}
      <Grabadora
        principal={!archivos.length}
        instrumento={clase.instrumento}
        envio={{
          carpeta: `entregas/${clase.id}/${perfil.uid}`,
          anotar: (material) => agregarArchivoEntrega(perfil, clase, material),
        }}
      />
      <UploadButton
        label={archivos.length ? "Agregar otro archivo" : "Subir audio, video, foto o PDF"}
        carpeta={`entregas/${clase.id}/${perfil.uid}`}
        accept={ACCEPT_ENTREGA}
        limite={limiteDeEntrega}
        onUploaded={(material) => agregarArchivoEntrega(perfil, clase, material)}
      />
      {archivos.length ? (
        <View style={styles.comment}>
          <Input
            accessibilityLabel="Comentario para tu profesor"
            placeholder="Comentario para tu profesor (opcional)"
            value={comentario}
            onChangeText={(value) => {
              setComentario(value);
              setGuardado(false);
            }}
            multiline
            numberOfLines={3}
            maxLength={2000}
            style={styles.textarea}
          />
          <Button
            variant="secondary"
            size="sm"
            style={styles.saveComment}
            onPress={onGuardarComentario}
          >
            {guardado ? "Comentario guardado" : "Guardar comentario"}
          </Button>
        </View>
      ) : null}
      <View style={styles.evaluacion}>
        <Text style={styles.name}>Mensajes con tu profesor</Text>
        <MensajesClase
          clase={clase}
          alumnoId={perfil.uid}
          perfil={perfil}
          otroNombre={clase.profesorNombre}
        />
      </View>
    </Section>
  );
}

// Profesor: every enrolled alumno and what they delivered for this class.
function EntregasDeAlumnos({ clase, perfil }: { clase: Clase; perfil: Perfil }) {
  const inscripciones = useInscripcionesProfesor(perfil.uid);
  const entregas = useEntregasDeClase(clase.id, perfil.uid);
  const alumnos = inscripciones.data.filter((i) => i.instrumento === clase.instrumento);
  const porAlumno = new Map(entregas.data.map((e) => [e.alumnoId, e]));

  // Comments left on a file the alumno removed meanwhile (see limpiarDevoluciones).
  useEffect(() => {
    entregas.data.forEach((e) => limpiarDevoluciones(e, false).catch(() => {}));
  }, [entregas.data]);

  // Who said they cannot come (the last notice of each alumno).
  const mensajes = useMensajesDeClase(clase);
  const ausencias = new Map(
    mensajes.data.filter((m) => m.tipo === "ausencia").map((m) => [m.alumnoId, m.texto]),
  );
  const presentes = alumnos.filter((a) => {
    const estado = clase.asistencia?.[a.alumnoId];
    return estado === "presente" || estado === "tarde";
  }).length;

  return (
    <Section
      title="Alumnos de la clase"
      subtitle={`${porAlumno.size} de ${alumnos.length} entregaron${clase.asistencia ? ` · ${presentes} asistieron` : ""}`}
    >
      {alumnos.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={`No tienes alumnos de ${instrumento(clase.instrumento).name}`}
          description="Agrégalos desde el inicio para que vean esta clase."
        />
      ) : null}
      {alumnos.map((alumno) => {
        const entrega = porAlumno.get(alumno.alumnoId);
        return (
          <View key={alumno.id} style={styles.delivery}>
            <View style={styles.deliveryHeader}>
              <Avatar nombre={alumno.alumnoNombre} />
              <Text style={[styles.name, styles.flex]}>{alumno.alumnoNombre}</Text>
              {entrega ? <Badge label="Entregada" tone="success" /> : <Badge label="Pendiente" />}
            </View>
            {ausencias.has(alumno.alumnoId) ? (
              <Text style={styles.ausencia}>
                Avisó que no viene: “{ausencias.get(alumno.alumnoId)}”
              </Text>
            ) : null}
            <SelectorAsistencia clase={clase} alumnoId={alumno.alumnoId} />
            {entrega?.comentario ? <Text style={styles.body}>“{entrega.comentario}”</Text> : null}
            {entrega ? (
              <MaterialList
                materiales={entrega.archivos}
                devoluciones={entrega.devoluciones}
                respuestas={entrega.respuestas}
                onComentar={(material, segundo, texto) =>
                  agregarDevolucion(entrega, {
                    id: Math.random().toString(36).slice(2, 10),
                    archivoId: material.id,
                    segundo: Math.round(segundo * 10) / 10,
                    texto,
                    fecha: Date.now(),
                  }).catch(() => {
                    avisar({ texto: "No se pudo guardar el comentario.", tipo: "error" });
                  })
                }
                onQuitarDevolucion={(devolucion) =>
                  void quitarDevolucion(entrega, devolucion).catch(() =>
                    avisar({ texto: "No se pudo borrar el comentario.", tipo: "error" }),
                  )
                }
              />
            ) : null}
            {entrega ? (
              <RubricaEditor
                key={entrega.evaluacion?.fecha ?? "nueva"}
                entrega={entrega}
                instrumento={clase.instrumento}
              />
            ) : null}
            <MensajesPlegables
              clase={clase}
              alumnoId={alumno.alumnoId}
              alumnoNombre={alumno.alumnoNombre}
              perfil={perfil}
            />
          </View>
        );
      })}
    </Section>
  );
}

// Present, late or absent; tapping the marked one again clears it.
function SelectorAsistencia({ clase, alumnoId }: { clase: Clase; alumnoId: string }) {
  const actual = clase.asistencia?.[alumnoId];
  const marcar = (estado: Asistencia) =>
    void marcarAsistencia(clase.id, alumnoId, actual === estado ? null : estado).catch(() =>
      avisar({ texto: "No se pudo guardar la asistencia.", tipo: "error" }),
    );
  return (
    <View accessibilityRole="radiogroup" aria-label="Asistencia" style={styles.asistencia}>
      {(Object.keys(ASISTENCIA) as Asistencia[]).map((estado) => (
        <Pressable
          key={estado}
          accessibilityRole="radio"
          aria-checked={actual === estado}
          onPress={() => marcar(estado)}
          style={[styles.asistenciaOpcion, actual === estado && styles.asistenciaActiva]}
        >
          <Text style={styles.asistenciaTexto}>{ASISTENCIA[estado]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MensajesPlegables({
  clase,
  alumnoId,
  alumnoNombre,
  perfil,
}: {
  clase: Clase;
  alumnoId: string;
  alumnoNombre: string;
  perfil: Perfil;
}) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto)
    return (
      <Button
        variant="secondary"
        size="sm"
        style={styles.saveComment}
        onPress={() => setAbierto(true)}
      >
        <MessageCircle size={14} color={buttonForeground("secondary")} />
        Mensajes
      </Button>
    );
  return (
    <MensajesClase
      clase={clase}
      alumnoId={alumnoId}
      perfil={perfil}
      otroNombre={alumnoNombre.split(" ")[0] ?? alumnoNombre}
    />
  );
}

const styles = StyleSheet.create({
  fechaAcciones: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  enlace: {
    flexDirection: "row",
    alignItems: "center",
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
  noPuedo: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  ausencia: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  programa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  programaNumero: {
    width: 28,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.mutedForeground,
  },
  evaluacion: {
    gap: 8,
    paddingTop: 6,
  },
  asistencia: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  asistenciaOpcion: {
    height: 30,
    paddingHorizontal: 10,
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  asistenciaActiva: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  asistenciaTexto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  back: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: colors.primary,
  },
  badges: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: colors.foreground,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  comment: {
    gap: 8,
  },
  textarea: {
    height: 84,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  saveComment: {
    alignSelf: "flex-start",
  },
  duplicar: {
    marginTop: 16,
    gap: 12,
  },
  delivery: {
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
});
