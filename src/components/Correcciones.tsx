import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ChevronRight,
  ClipboardCheck,
  MessageCircle,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/components/Link";
import { minutosYSegundos } from "@/components/Reproductor";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { mensajesSinLeer, useMensajesRecientes, type Clase, type Entrega } from "@/lib/data";
import { colors, fonts, radius } from "@/lib/theme";

const DIAS_EVALUACION_NUEVA = 14;
const MAX_NOVEDADES = 5;
const POR_PAGINA = 8;

const tituloDe = (clases: Clase[], claseId: string) =>
  clases.find((c) => c.id === claseId)?.titulo ?? "Tu clase";

const fechaCorta = (ms: number) =>
  new Date(ms).toLocaleDateString("es-PY", { day: "numeric", month: "short" });

const evaluacionesRecientes = (entregas: Entrega[]) => {
  const desde = Date.now() - DIAS_EVALUACION_NUEVA * 24 * 60 * 60 * 1000;
  return entregas.filter((e) => e.evaluacion && e.evaluacion.fecha >= desde);
};

// Alumno home: what the profesor just said, before anything else. Practicing what was corrected is
// worth more than practicing anything new.
export function Novedades({
  uid,
  clases,
  entregas,
}: {
  uid: string;
  clases: Clase[];
  entregas: Entrega[];
}) {
  const mensajes = useMensajesRecientes("alumnoId", uid);
  const nuevos = mensajesSinLeer(mensajes.data, uid);

  const sinResponder = entregas
    .flatMap((e) =>
      (e.devoluciones ?? [])
        .filter((d) => !e.respuestas?.[d.id])
        .map((d) => ({ entrega: e, devolucion: d })),
    )
    .sort((a, b) => b.devolucion.fecha - a.devolucion.fecha);
  const evaluaciones = evaluacionesRecientes(entregas);

  if (!sinResponder.length && !evaluaciones.length && !nuevos.length) return null;

  return (
    <Section title="Tu profesor te dijo">
      {sinResponder.slice(0, MAX_NOVEDADES).map(({ entrega, devolucion }) => (
        <Fila
          key={devolucion.id}
          href={`/clases/${entrega.claseId}`}
          icono={MessageSquare}
          titulo={devolucion.texto || "Te grabó una respuesta"}
          detalle={`${tituloDe(clases, entrega.claseId)} · en ${minutosYSegundos(devolucion.segundo)} · sin responder`}
        />
      ))}
      {sinResponder.length > MAX_NOVEDADES ? (
        <Text style={styles.muted}>
          Y {sinResponder.length - MAX_NOVEDADES} comentarios más sin responder.
        </Text>
      ) : null}
      {evaluaciones.map((e) => (
        <Fila
          key={e.id}
          href={`/clases/${e.claseId}`}
          icono={ClipboardCheck}
          titulo="Evaluó tu entrega"
          detalle={`${tituloDe(clases, e.claseId)}${e.evaluacion?.comentario ? `: ${e.evaluacion.comentario}` : ""}`}
        />
      ))}
      {nuevos.slice(0, MAX_NOVEDADES).map((m) => (
        <Fila
          key={m.id}
          href={`/clases/${m.claseId}`}
          icono={MessageCircle}
          titulo="Mensaje nuevo"
          detalle={m.texto}
        />
      ))}
    </Section>
  );
}

// Everything the profesor said, in one place, newest first: to read before practicing.
export function HistorialCorrecciones({
  clases,
  entregas,
}: {
  clases: Clase[];
  entregas: Entrega[];
}) {
  const [cuantas, setCuantas] = useState(POR_PAGINA);
  const todas = entregas
    .flatMap((e) => [
      ...(e.devoluciones ?? []).map((d) => ({
        id: d.id,
        fecha: d.fecha,
        claseId: e.claseId,
        texto: d.texto || "Te grabó una respuesta",
        detalle: `en ${minutosYSegundos(d.segundo)}`,
      })),
      ...(e.evaluacion?.comentario
        ? [
            {
              id: `${e.id}-evaluacion`,
              fecha: e.evaluacion.fecha,
              claseId: e.claseId,
              texto: e.evaluacion.comentario,
              detalle: "en su evaluación",
            },
          ]
        : []),
    ])
    .sort((a, b) => b.fecha - a.fecha);
  if (!todas.length) return null;

  return (
    <Section title="Lo que me dijo mi profesor">
      {todas.slice(0, cuantas).map((c) => (
        <Fila
          key={c.id}
          href={`/clases/${c.claseId}`}
          icono={MessageSquare}
          titulo={c.texto}
          detalle={`${fechaCorta(c.fecha)} · ${tituloDe(clases, c.claseId)} · ${c.detalle}`}
        />
      ))}
      {todas.length > cuantas ? (
        <Button
          variant="secondary"
          size="sm"
          style={styles.mas}
          onPress={() => setCuantas((n) => n + POR_PAGINA)}
        >
          Ver más
        </Button>
      ) : null}
    </Section>
  );
}

function Fila({
  href,
  icono: Icono,
  titulo,
  detalle,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  detalle: string;
}) {
  return (
    <Link href={href}>
      <Pressable style={styles.fila}>
        <Icono size={18} color={colors.mutedForeground} />
        <View style={styles.flex}>
          <Text numberOfLines={2} style={styles.titulo}>
            {titulo}
          </Text>
          <Text numberOfLines={1} style={styles.muted}>
            {detalle}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.foreground,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  mas: {
    alignSelf: "flex-start",
  },
});
