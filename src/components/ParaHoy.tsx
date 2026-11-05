import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CalendarCheck,
  ChevronRight,
  Inbox,
  MessageCircle,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/components/Link";
import { Badge, Section } from "@/components/ui/section";
import {
  mensajesSinLeer,
  nombreDestino,
  progreso,
  sinRevisar,
  useMensajesRecientes,
  type Clase,
  type Entrega,
  type Inscripcion,
} from "@/lib/data";
import { aFecha, hoy, sumarDias } from "@/lib/dates";
import { colors, fonts, radius } from "@/lib/theme";

const DIAS_SIN_ENTREGAR = 14;
const MAX_POR_GRUPO = 4;

// The alumnos with something pending who have not delivered anything for a while: the first sign
// that someone is about to leave. Only deliveries: the diary of each alumno would take one query
// per person on every visit to the home.
function alumnosSinActividad(
  inscripciones: Inscripcion[],
  clases: Clase[],
  entregas: Entrega[],
  fechaHoy: string,
) {
  const limite = sumarDias(fechaHoy, -DIAS_SIN_ENTREGAR);
  const vistos = new Set<string>();
  return inscripciones.flatMap((i) => {
    if (vistos.has(i.alumnoId) || !progreso(clases, entregas, i).pendientes) return [];
    const ingreso = i.creadoEn ? aFecha(i.creadoEn.toDate()) : "";
    if (ingreso > limite) return [];
    const ultima = entregas
      .filter((e) => e.alumnoId === i.alumnoId && e.actualizadoEn)
      .map((e) => aFecha(e.actualizadoEn!.toDate()))
      .sort()
      .at(-1);
    if (ultima && ultima > limite) return [];
    vistos.add(i.alumnoId);
    return [{ inscripcion: i, ultima }];
  });
}

// Profesor home: what needs them today, in the order they would act on it. It replaces counting
// things that then have to be looked for.
export function ParaHoy({
  uid,
  inscripciones,
  clases,
  entregas,
}: {
  uid: string;
  inscripciones: Inscripcion[];
  clases: Clase[];
  entregas: Entrega[];
}) {
  const mensajes = useMensajesRecientes("profesorId", uid);
  const fechaHoy = hoy();
  const claseDe = (id: string) => clases.find((c) => c.id === id);
  const nombreDe = (alumnoId: string) =>
    inscripciones.find((i) => i.alumnoId === alumnoId)?.alumnoNombre ?? "Tu alumno";

  const deHoy = clases
    .filter((c) => c.fecha === fechaHoy)
    .sort((a, b) => (a.hora ?? "99").localeCompare(b.hora ?? "99"));
  const porRevisar = entregas.filter(sinRevisar).length;
  const ausencias = mensajes.data.filter(
    (m) => m.tipo === "ausencia" && (claseDe(m.claseId)?.fecha ?? "") >= fechaHoy,
  );
  const nuevos = mensajesSinLeer(mensajes.data, uid).filter((m) => m.tipo !== "ausencia");
  const inactivos = alumnosSinActividad(inscripciones, clases, entregas, fechaHoy);

  const nada =
    !deHoy.length && !porRevisar && !ausencias.length && !nuevos.length && !inactivos.length;

  return (
    <Section title="Para hoy">
      {nada ? (
        <Text style={styles.muted}>
          Nada urgente: no tienes clases hoy ni entregas por revisar.
        </Text>
      ) : null}

      {porRevisar ? (
        <Fila
          href="/revision"
          icono={Inbox}
          titulo={`${porRevisar} ${porRevisar === 1 ? "entrega" : "entregas"} por revisar`}
          detalle="Revísalas una tras otra, de la más antigua a la más nueva."
          destacada
        />
      ) : null}

      {deHoy.map((c) => (
        <Fila
          key={c.id}
          href={`/clases/${c.id}`}
          icono={CalendarCheck}
          titulo={`${c.hora ? `${c.hora} · ` : ""}${c.titulo}`}
          detalle={nombreDestino(c, inscripciones)}
        />
      ))}

      {ausencias.slice(0, MAX_POR_GRUPO).map((m) => (
        <Fila
          key={m.id}
          href={`/clases/${m.claseId}`}
          icono={UserX}
          titulo={`${nombreDe(m.alumnoId)} no puede ir`}
          detalle={`${claseDe(m.claseId)?.titulo ?? "Clase"}: ${m.texto}`}
        />
      ))}

      {nuevos.slice(0, MAX_POR_GRUPO).map((m) => (
        <Fila
          key={m.id}
          href={`/clases/${m.claseId}`}
          icono={MessageCircle}
          titulo={`Mensaje de ${nombreDe(m.alumnoId)}`}
          detalle={m.texto}
          marca={<Badge label="Nuevo" tone="primary" />}
        />
      ))}
      {nuevos.length > MAX_POR_GRUPO ? (
        <Text style={styles.muted}>Y {nuevos.length - MAX_POR_GRUPO} mensajes más.</Text>
      ) : null}

      {inactivos.slice(0, MAX_POR_GRUPO).map(({ inscripcion, ultima }) => (
        <Fila
          key={inscripcion.alumnoId}
          href={`/alumnos/${inscripcion.alumnoId}`}
          icono={UserX}
          titulo={`${inscripcion.alumnoNombre} sin entregar`}
          detalle={
            ultima
              ? `Hace más de ${DIAS_SIN_ENTREGAR} días que no entrega. Puede ser buen momento para escribirle.`
              : "Todavía no entregó nada. Puede ser buen momento para escribirle."
          }
        />
      ))}
    </Section>
  );
}

function Fila({
  href,
  icono: Icono,
  titulo,
  detalle,
  destacada = false,
  marca,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  detalle: string;
  destacada?: boolean;
  marca?: ReactNode;
}) {
  return (
    <Link href={href}>
      <Pressable style={[styles.fila, destacada && styles.destacada]}>
        <Icono size={18} color={destacada ? colors.primary : colors.mutedForeground} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.titulo}>
            {titulo}
          </Text>
          <Text numberOfLines={2} style={styles.muted}>
            {detalle}
          </Text>
        </View>
        {marca}
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
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.muted,
  },
  destacada: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
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
});
