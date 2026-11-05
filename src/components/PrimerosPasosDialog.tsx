import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import type { Role } from "@/lib/auth";
import { colors, fonts, radius } from "@/lib/theme";

type Paso = { titulo: string; detalle: string };

const registro: Paso[] = [
  { titulo: "Toca «Crea tu cuenta»", detalle: "Está debajo del botón Entrar." },
  { titulo: "Elige tu rol", detalle: "Profesor si vas a enseñar, Alumno si vas a aprender." },
  {
    titulo: "Completa tus datos",
    detalle:
      "Nombre y apellido, número de documento (solo números), correo y una contraseña de al menos 6 caracteres. Si eres profesor, también tu celular.",
  },
  {
    titulo: "Elige tus instrumentos",
    detalle: "Uno o varios. Más adelante puedes sumar otros desde Mi perfil.",
  },
];

const despues: Record<Role, Paso[]> = {
  profesor: [
    {
      titulo: "Entra con tu documento",
      detalle:
        "Usa tu número de documento y tu contraseña. Si la olvidas, la recuperas con tu documento y tu correo.",
    },
    {
      titulo: "30 días gratis",
      detalle:
        "Pruebas Pulso completo durante 30 días. Después eliges un plan según cuántos alumnos tienes (para ellos es gratis); lo ves y lo pagas en Mi plan, en el menú.",
    },
    {
      titulo: "Arma tus listas de alumnos",
      detalle:
        "En Inicio, toca Agregar alumno y carga su número de documento (su nombre aparece al lado). ¿Todavía no tiene cuenta? Invítalo por WhatsApp desde ahí mismo.",
    },
    {
      titulo: "Planifica tus clases",
      detalle:
        "En Planificación, crea clases por semana, mes o año, y elige para quién es cada una: uno o varios alumnos, o toda la lista de ese instrumento. Con hora y modalidad (presencial o virtual con su enlace). Puedes repetirlas cada semana, duplicarlas para otro alumno o marcar una como recital con su programa.",
    },
    {
      titulo: "Arma el plan de cada clase",
      detalle:
        "Abre la clase y usa la plantilla de 60 min o suma bloques: partituras y tablaturas con sonido, escalas, acordes, rasgueos, respiración, grooves y rudimentos de batería, tempo, videos y archivos. Guarda en tu biblioteca los bloques y archivos que repites y reúsalos en otra clase.",
    },
    {
      titulo: "Revisa las entregas",
      detalle:
        "En Inicio, Para hoy te muestra lo urgente y te lleva a Por revisar: las entregas una tras otra. Escucha o mira cada grabación, más lento o en bucle, y comenta en el segundo exacto, por escrito o grabándole tu respuesta. Evalúa con la rúbrica y márcala como revisada. En la clase, Pasar lista marca la asistencia.",
    },
    {
      titulo: "Sigue el progreso",
      detalle:
        "En Mis alumnos ves el avance de cada uno. Al tocar uno, Para preparar la clase resume en qué quedaron, con tus notas privadas y un resumen para enviar a la familia. Marca los objetivos de su ruta de aprendizaje por nivel. En Herramientas tienes afinador, metrónomo, polca y guarania y más.",
    },
    {
      titulo: "Pregúntale al asistente",
      detalle:
        "El botón ✦ (abajo a la derecha; arrástralo para moverlo donde quieras) responde cómo se usa cada pantalla y consulta tus datos. Solo lee: no cambia nada.",
    },
    {
      titulo: "¿Dudas?",
      detalle:
        "En Mi perfil tienes el Manual de uso, paso a paso. Y si algo no queda claro, escríbenos desde «¿Necesitas ayuda?» en el inicio de sesión o desde Mi perfil: te respondemos por correo.",
    },
  ],
  alumno: [
    {
      titulo: "Entra con tu documento",
      detalle:
        "Usa tu número de documento y tu contraseña. Si la olvidas, la recuperas con tu documento y tu correo.",
    },
    {
      titulo: "Pásale tu documento a tu profesor",
      detalle:
        "Tu profesor te agrega a su lista con tu número de documento. Hasta entonces no verás clases.",
    },
    {
      titulo: "Practica tus clases",
      detalle:
        "En Inicio, Hoy te muestra lo que dijo tu profesor y Tu práctica de hoy: elige cuánto tiempo tienes y toca Practicar ahora. Es el plan de la clase bloque por bloque, con cronómetro y sonido; al terminar cada uno dices Me salió o Me costó (un pedal Bluetooth o las flechas también pasan de bloque). La pantalla queda encendida. En las partituras, el Entrenador sube el tempo en cada vuelta.",
    },
    {
      titulo: "Grábate y entrega",
      detalle:
        "En la clase, graba tu práctica en audio o video (con click en los auriculares si quieres) o sube un archivo (también fotos o PDF de una tarea escrita; en el celular, «Sacar foto» abre la cámara), y envíala. Antes de grabar hay una cuenta para volver al instrumento, y si te quedas sin internet tu grabación se guarda y se envía sola. Pulso la analiza; tu profesor la ve al instante, la comenta y la evalúa. Si tienes una duda, escríbele en Mensajes. Responde cada comentario con Entendido o Ya lo corregí, y si no puedes ir a una clase, toca No puedo ir.",
    },
    {
      titulo: "Usa tus herramientas",
      detalle:
        "En Herramientas: afinador, metrónomo, grabadora, lectura a primera vista, polca y guarania, y ejercicios de oído, según tu instrumento. Funcionan sin internet una vez abiertas.",
    },
    {
      titulo: "Mira tu avance",
      detalle:
        "En Mis clases ves si estás al día con tus entregas, y el anillo del inicio muestra tu semana. En Mi progreso están tu ruta de aprendizaje, tus metas de la semana, tu repertorio con su tempo, tus habilidades, tus insignias, Mi evolución y todo lo que te dijo tu profesor. En Mi perfil activa los avisos y tu recordatorio de práctica.",
    },
    {
      titulo: "Pregúntale al asistente",
      detalle:
        "El botón ✦ (abajo a la derecha; arrástralo para moverlo donde quieras) responde cómo se usa cada pantalla y consulta tus datos. Solo lee: no cambia nada.",
    },
    {
      titulo: "¿Dudas?",
      detalle:
        "En Mi perfil tienes el Manual de uso, paso a paso. Y si algo no queda claro, escríbenos desde «¿Necesitas ayuda?» en el inicio de sesión o desde Mi perfil: te respondemos por correo.",
    },
  ],
};

const roles = [
  { value: "alumno", label: "Soy alumno" },
  { value: "profesor", label: "Soy profesor" },
] as const;

export function PrimerosPasosDialog({
  visible,
  onClose,
  onRegistrarse,
}: {
  visible: boolean;
  onClose: () => void;
  onRegistrarse: () => void;
}) {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Primeros pasos"
      description="Cómo registrarte y qué hacer la primera vez que entras."
    >
      <Pasos onRegistrarse={onRegistrarse} />
    </Dialog>
  );
}

function Pasos({ onRegistrarse }: { onRegistrarse: () => void }) {
  const [rol, setRol] = useState<Role>("alumno");

  return (
    <View style={styles.body}>
      <Segmented value={rol} options={roles} onChange={setRol} />

      <Text style={styles.section}>Para registrarte</Text>
      <Lista pasos={registro} desde={1} />

      <Text style={styles.section}>Después de entrar</Text>
      <Lista pasos={despues[rol]} desde={registro.length + 1} />

      <Button size="lg" onPress={onRegistrarse}>
        Crear mi cuenta
      </Button>
    </View>
  );
}

function Lista({ pasos, desde }: { pasos: Paso[]; desde: number }) {
  return (
    <View style={styles.list}>
      {pasos.map((paso, i) => (
        <View key={paso.titulo} style={styles.step}>
          <View style={styles.number}>
            <Text style={styles.numberText}>{desde + i}</Text>
          </View>
          <View style={styles.stepText}>
            <Text style={styles.stepTitle}>{paso.titulo}</Text>
            <Text style={styles.stepDetail}>{paso.detalle}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: 20,
    gap: 16,
  },
  section: {
    marginTop: 4,
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.primary,
  },
  list: {
    gap: 12,
  },
  step: {
    flexDirection: "row",
    gap: 12,
  },
  number: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: "rgba(249, 161, 41, 0.14)",
  },
  numberText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.primary,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  stepDetail: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
});
