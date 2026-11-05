import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { bloquesQueCostaron } from "@/components/EntregaRevision";
import { textoTempoObra } from "@/components/Repertorio";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { avisar } from "@/components/ui/toast";
import { diasPracticados, minutosEntre } from "@/lib/avance";
import { enlaceWhatsApp } from "@/lib/contacto";
import {
  agregarNota,
  esParaAlumno,
  progreso,
  quitarNota,
  textoAlDia,
  useDiarioDe,
  useNotasAlumno,
  type Clase,
  type Entrega,
  type Inscripcion,
  type Logros,
  type Meta,
  type Obra,
  type Practica,
} from "@/lib/data";
import { formatoDia, hoy, inicioDeSemana, rango } from "@/lib/dates";
import { instrumento } from "@/lib/instruments";
import { etiquetaNota } from "@/lib/rubrica";
import { avanceDeNivel, nivelLabel } from "@/lib/ruta";
import { colors, fonts, radius } from "@/lib/theme";

// "¿En qué quedamos?": before a lesson, the profesor reads in a minute what happened since the last
// one, and keeps their own notes (the alumno never sees them). Built from what is already saved,
// except the notes.
export function PrepararClase({
  inscripcion,
  clases,
  entregas,
  practicas,
  metas,
  obras,
  logros,
}: {
  inscripcion: Inscripcion;
  clases: Clase[];
  entregas: Entrega[];
  practicas: Practica[];
  metas: Meta[];
  obras: Obra[];
  logros: Logros | undefined;
}) {
  const { alumnoId, profesorId } = inscripcion;
  const diario = useDiarioDe(alumnoId, inscripcion.instrumento);
  const fechaHoy = hoy();
  const [lunes, domingo] = rango("semana", fechaHoy);

  const suyas = clases.filter(
    (c) => c.instrumento === inscripcion.instrumento && esParaAlumno(c, alumnoId),
  );
  const ultima = suyas.filter((c) => c.fecha < fechaHoy).at(-1);
  const proxima = suyas.find((c) => c.fecha >= fechaHoy);
  const entregaDe = (claseId: string) =>
    entregas.find((e) => e.claseId === claseId && e.alumnoId === alumnoId);
  const practicaDe = (claseId: string) => practicas.find((p) => p.claseId === claseId);

  const minutos = minutosEntre(diario.data, lunes, domingo);
  const dias = diasPracticados(diario.data, lunes, domingo);
  const evaluada = entregas
    .filter((e) => e.alumnoId === alumnoId && e.instrumento === inscripcion.instrumento)
    .filter((e) => e.evaluacion)
    .sort((a, b) => b.evaluacion!.fecha - a.evaluacion!.fecha)[0];
  const sinResponder = entregas
    .filter((e) => e.alumnoId === alumnoId && e.instrumento === inscripcion.instrumento)
    .flatMap((e) => (e.devoluciones ?? []).filter((d) => !e.respuestas?.[d.id])).length;
  const semana = inicioDeSemana(fechaHoy);
  const metasSemana = metas.filter(
    (m) =>
      m.instrumento === inscripcion.instrumento &&
      m.profesorId === profesorId &&
      m.semana === semana,
  );
  const cumplidas = metasSemana.filter((m) => m.cumplida).length;
  const costaron = ultima ? bloquesQueCostaron(ultima, practicaDe(ultima.id)) : [];
  const conTempo = obras
    .filter((o) => o.instrumento === inscripcion.instrumento && o.profesorId === profesorId)
    .filter((o) => o.bpm);
  const nivel = logros?.nivel ?? "inicial";
  const avance = avanceDeNivel(inscripcion.instrumento, nivel, logros?.cumplidos ?? []);

  const lineas = [
    ultima
      ? {
          titulo: "Última clase",
          texto: `${ultima.titulo} (${formatoDia(ultima.fecha)}): ${entregaDe(ultima.id) ? "entregó" : "todavía no entregó"}.${
            costaron.length ? ` Le costó: ${costaron.join(", ")}.` : ""
          }`,
        }
      : null,
    {
      titulo: "Esta semana",
      texto: minutos
        ? `Practicó ${minutos} min en ${dias} ${dias === 1 ? "día" : "días"}.`
        : "Todavía no anotó práctica.",
    },
    evaluada?.evaluacion
      ? {
          titulo: "Tu última evaluación",
          texto:
            evaluada.evaluacion.comentario ||
            Object.values(evaluada.evaluacion.criterios).map(etiquetaNota).join(", "),
        }
      : null,
    sinResponder
      ? {
          titulo: "Comentarios sin responder",
          texto: `${sinResponder}: puede que no los haya visto.`,
        }
      : null,
    metasSemana.length
      ? { titulo: "Metas de la semana", texto: `${cumplidas} de ${metasSemana.length} cumplidas.` }
      : null,
    conTempo.length
      ? {
          titulo: "Tempo de sus obras",
          texto: conTempo.map((o) => `${o.obra}: ${textoTempoObra(o)}`).join(" · "),
        }
      : null,
    proxima
      ? { titulo: "Próxima clase", texto: `${proxima.titulo} (${formatoDia(proxima.fecha)}).` }
      : null,
  ].filter((l) => l !== null);

  // For the family: what they would ask at the door, ready to send. Saved nowhere.
  const resumen = [
    `Resumen de la semana de ${inscripcion.alumnoNombre.split(" ")[0]} en ${instrumento(inscripcion.instrumento).name}:`,
    "",
    `• Práctica: ${minutos ? `${minutos} min en ${dias} ${dias === 1 ? "día" : "días"}` : "todavía sin anotar"}`,
    `• Clases: ${textoAlDia(progreso(clases, entregas, inscripcion)).toLowerCase()}`,
    `• Nivel: ${nivelLabel(nivel).toLowerCase()}, ${avance}% de sus objetivos`,
    ...(metasSemana.length ? [`• Metas de la semana: ${cumplidas} de ${metasSemana.length}`] : []),
    ...(proxima ? [`• Próxima clase: ${formatoDia(proxima.fecha)}, ${proxima.titulo}`] : []),
    "",
    `Prof. ${inscripcion.profesorNombre}`,
  ].join("\n");

  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Para preparar la clase</Text>
      {lineas.map((l) => (
        <View key={l.titulo} style={styles.linea}>
          <Text style={styles.etiqueta}>{l.titulo}</Text>
          <Text style={styles.texto}>{l.texto}</Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="link"
        href={enlaceWhatsApp(resumen)}
        hrefAttrs={{ target: "_blank", rel: "noopener" }}
        style={styles.enlace}
      >
        <MessageCircle size={14} color={colors.foreground} />
        <Text style={styles.enlaceTexto}>Enviar resumen a la familia</Text>
      </Pressable>
      <Notas inscripcion={inscripcion} />
    </View>
  );
}

function Notas({ inscripcion }: { inscripcion: Inscripcion }) {
  const notas = useNotasAlumno(inscripcion.profesorId, inscripcion.alumnoId);
  const [texto, setTexto] = useState("");
  const propias = notas.data.filter((n) => n.instrumento === inscripcion.instrumento);

  const guardar = () => {
    if (!texto.trim()) return;
    void agregarNota(inscripcion, texto).then(
      () => setTexto(""),
      () => avisar({ texto: "No se pudo guardar la nota.", tipo: "error" }),
    );
  };

  return (
    <View style={styles.notas}>
      <Text style={styles.etiqueta}>Tus notas privadas (el alumno no las ve)</Text>
      {propias.slice(0, 5).map((n) => (
        <View key={n.id} style={styles.nota}>
          <Text style={[styles.texto, styles.flex]}>
            {n.creadoEn ? (
              <Text style={styles.fecha}>
                {n.creadoEn
                  .toDate()
                  .toLocaleDateString("es-PY", { day: "numeric", month: "short" })}{" "}
                ·{" "}
              </Text>
            ) : null}
            {n.texto}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Borrar nota"
            onPress={() =>
              void quitarNota(n.id).catch(() =>
                avisar({ texto: "No se pudo borrar la nota.", tipo: "error" }),
              )
            }
            style={styles.borrar}
          >
            <Trash2 size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ))}
      <View style={styles.escribir}>
        <View style={styles.flex}>
          <Input
            accessibilityLabel="Nota privada"
            placeholder="Ej.: le cuesta el cambio de Sol a Do; probar más lento"
            value={texto}
            onChangeText={setTexto}
            maxLength={2000}
            onSubmitEditing={guardar}
          />
        </View>
        <Button
          variant="secondary"
          accessibilityLabel="Guardar nota"
          disabled={!texto.trim()}
          onPress={guardar}
        >
          <Plus size={16} color={buttonForeground("secondary")} />
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.foreground,
  },
  linea: {
    gap: 1,
  },
  etiqueta: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.foreground,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  fecha: {
    color: colors.mutedForeground,
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
  notas: {
    gap: 8,
    paddingTop: 4,
  },
  nota: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  borrar: {
    padding: 4,
  },
  escribir: {
    flexDirection: "row",
    gap: 8,
  },
});
