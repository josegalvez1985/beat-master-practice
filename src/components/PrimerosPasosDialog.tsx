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
  { titulo: "Elige tu rol", detalle: "Alumno si vas a aprender, Profesor si vas a enseñar." },
  {
    titulo: "Completa tus datos",
    detalle:
      "Nombre y apellido, número de documento (solo números), correo y una contraseña de al menos 6 caracteres.",
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
      titulo: "Arma tus listas de alumnos",
      detalle:
        "En Inicio, busca a cada alumno por número de documento o nombre y agrégalo al instrumento que le enseñas.",
    },
    {
      titulo: "Planifica tus clases",
      detalle:
        "En Planificación, crea clases por semana, mes o año. Puedes repetirlas cada semana o duplicar una clase.",
    },
    {
      titulo: "Arma el plan de cada clase",
      detalle:
        "Abre la clase y usa la plantilla de 60 min o suma bloques: tablaturas, acordes, rasgueos, grooves y rudimentos de batería, tempo, videos y archivos.",
    },
    {
      titulo: "Revisa las entregas",
      detalle:
        "Escucha o mira la grabación de cada alumno, más lento o en bucle, y comenta en el segundo exacto.",
    },
    {
      titulo: "Sigue el progreso",
      detalle:
        "En Mis alumnos ves el avance de cada uno, su diario de práctica y, en batería, sus récords. En Herramientas tienes afinador, metrónomo y más.",
    },
    {
      titulo: "¿Dudas?",
      detalle:
        "Escríbenos desde «¿Necesitas ayuda?» en el inicio de sesión o desde Mi perfil: te respondemos por correo.",
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
        "En Inicio toca Practicar ahora: el plan de la clase bloque por bloque, con cronómetro y sonido.",
    },
    {
      titulo: "Grábate y entrega",
      detalle:
        "En la clase, graba tu práctica en audio o video (o sube un archivo) y envíala. Tu profesor la ve al instante y puede comentarla.",
    },
    {
      titulo: "Usa tus herramientas",
      detalle:
        "En Herramientas: afinador, metrónomo, grabadora y ejercicios de oído y lectura, según tu instrumento.",
    },
    {
      titulo: "Mira tu avance",
      detalle:
        "Cada entrega suma al progreso de tu instrumento, y el anillo del inicio muestra tu semana: tu meta y lo que practicaste.",
    },
    {
      titulo: "¿Dudas?",
      detalle:
        "Escríbenos desde «¿Necesitas ayuda?» en el inicio de sesión o desde Mi perfil: te respondemos por correo.",
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
