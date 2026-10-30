import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, FolderOpen, Lock, Pencil, Trash2 } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { Avatar } from "@/components/ui/avatar";
import { ClaseFormDialog } from "@/components/ClaseFormDialog";
import { Link } from "@/components/Link";
import { MaterialList, UploadButton } from "@/components/Materials";
import { PageMeta } from "@/components/PageMeta";
import { PlanClase } from "@/components/plan/PlanClase";
import { Button, buttonForeground } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Badge, Section } from "@/components/ui/section";
import { usePerfil, type Perfil } from "@/lib/auth";
import {
  agregarMaterial,
  eliminarClase,
  agregarArchivoEntrega,
  guardarComentario,
  quitarArchivoEntrega,
  quitarMaterial,
  useClase,
  useEntrega,
  useEntregasDeClase,
  useInscripcionesProfesor,
  type Clase,
  type Entrega,
} from "@/lib/data";
import { formatoLargo } from "@/lib/dates";
import { ACCEPT_ENTREGA, ACCEPT_MATERIAL, borrarArchivo, type Material } from "@/lib/files";
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
            {esDueno ? null : <Badge label={`Prof. ${clase.profesorNombre}`} />}
          </View>
        </View>
        {esDueno ? (
          <View style={styles.actions}>
            <Button variant="secondary" onPress={() => setEditando(true)}>
              <Pencil size={14} color={buttonForeground("secondary")} />
              Editar
            </Button>
            <Button variant="outline" accessibilityLabel="Eliminar clase" onPress={eliminar}>
              <Trash2 size={14} color={buttonForeground("outline")} />
            </Button>
          </View>
        ) : null}
      </View>

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
      subtitle="Graba tu práctica y súbela en audio o video. Tu profesor la verá al instante."
      actions={
        archivos.length ? <Badge label="Entregada" tone="success" /> : <Badge label="Pendiente" />
      }
    >
      {archivos.length ? <MaterialList materiales={archivos} onRemove={quitar} /> : null}
      <UploadButton
        label={archivos.length ? "Agregar otro archivo" : "Subir audio o video"}
        variant={archivos.length ? "secondary" : "default"}
        carpeta={`entregas/${clase.id}/${perfil.uid}`}
        accept={ACCEPT_ENTREGA}
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
    </Section>
  );
}

// Profesor: every enrolled alumno and what they delivered for this class.
function EntregasDeAlumnos({ clase, perfil }: { clase: Clase; perfil: Perfil }) {
  const inscripciones = useInscripcionesProfesor(perfil.uid);
  const entregas = useEntregasDeClase(clase.id, perfil.uid);
  const alumnos = inscripciones.data.filter((i) => i.instrumento === clase.instrumento);
  const porAlumno = new Map(entregas.data.map((e) => [e.alumnoId, e]));

  return (
    <Section
      title="Entregas de alumnos"
      subtitle={`${porAlumno.size} de ${alumnos.length} alumnos entregaron`}
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
            {entrega?.comentario ? <Text style={styles.body}>“{entrega.comentario}”</Text> : null}
            {entrega ? <MaterialList materiales={entrega.archivos} /> : null}
          </View>
        );
      })}
    </Section>
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
