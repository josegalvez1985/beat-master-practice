import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Award, Bell, CalendarCheck, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { avisar } from "@/components/ui/toast";
import type { Perfil } from "@/lib/auth";
import { guardarAutoevaluacion } from "@/lib/data";
import { instrumento as instrumentoDe, type InstrumentId } from "@/lib/instruments";
import { NIVELES, comoToco, type Nivel } from "@/lib/ruta";
import { colors, fonts, radius } from "@/lib/theme";

const PASOS = [
  {
    icon: CalendarCheck,
    titulo: "Tu práctica de hoy",
    texto:
      "En el inicio eliges cuánto tiempo tienes y Pulso arma la rutina: calentamiento, tu clase, lo que más te cuesta y un repaso.",
  },
  {
    icon: Mic,
    titulo: "Grábate y entrega",
    texto:
      "En cada clase te grabas (con click si quieres). Pulso mide tu afinación y tu tiempo, y tu profesor te devuelve comentarios: respóndele con «Entendido» o «Ya lo corregí».",
  },
  {
    icon: Award,
    titulo: "Mira cómo avanzas",
    texto:
      "Tu ruta de aprendizaje, tus metas de la semana, tu repertorio, tus insignias y tu evolución: la primera grabación al lado de la última.",
  },
  {
    icon: Bell,
    titulo: "Avisos",
    texto:
      "En Mi perfil activa los avisos para enterarte de clases nuevas, comentarios y mensajes, y elige la hora de tu recordatorio de práctica.",
  },
];

const clave = (uid: string) => `pulso-bienvenida-${uid}`;

export function vioBienvenida(uid: string) {
  try {
    return localStorage.getItem(clave(uid)) === "1";
  } catch {
    return true;
  }
}

// First time an alumno enters: a short tour and a self-assessment per instrument, which the
// profesor sees as a suggestion for the learning path. Shown once per browser.
export function BienvenidaAlumno({
  perfil,
  instrumentos,
  onClose,
}: {
  perfil: Perfil;
  instrumentos: InstrumentId[];
  onClose: () => void;
}) {
  const [paso, setPaso] = useState(0);
  const [niveles, setNiveles] = useState<Partial<Record<InstrumentId, Nivel>>>({});
  const enAutoevaluacion = paso >= PASOS.length;

  const cerrar = () => {
    try {
      localStorage.setItem(clave(perfil.uid), "1");
    } catch {
      // Blocked storage: it shows again next time.
    }
    onClose();
  };

  const terminar = async () => {
    try {
      await Promise.all(
        Object.entries(niveles).map(([i, nivel]) =>
          guardarAutoevaluacion(perfil.uid, i as InstrumentId, nivel),
        ),
      );
    } catch {
      avisar({ texto: "No se pudo guardar tu nivel.", tipo: "error" });
    }
    cerrar();
  };

  const actual = PASOS[paso];
  return (
    <Dialog
      visible
      onClose={cerrar}
      title={
        enAutoevaluacion ? "¿Cómo tocas hoy?" : `Bienvenido a Pulso, ${perfil.nombre.split(" ")[0]}`
      }
      description={
        enAutoevaluacion
          ? "Tu profesor lo ve como punto de partida de tu ruta. Puedes saltearlo."
          : `${paso + 1} de ${PASOS.length + 1}`
      }
    >
      <View style={styles.body}>
        {actual ? (
          <View style={styles.paso}>
            <View style={styles.icono}>
              <actual.icon size={28} color={colors.primary} />
            </View>
            <Text style={styles.titulo}>{actual.titulo}</Text>
            <Text style={styles.texto}>{actual.texto}</Text>
          </View>
        ) : (
          instrumentos.map((i) => (
            <View key={i} style={styles.instrumento}>
              <Text style={styles.titulo}>{instrumentoDe(i).name}</Text>
              {NIVELES.map((n) => {
                const elegido = niveles[i] === n.value;
                return (
                  <Pressable
                    key={n.value}
                    accessibilityRole="radio"
                    aria-checked={elegido}
                    onPress={() => setNiveles((v) => ({ ...v, [i]: n.value }))}
                    style={[styles.opcion, elegido && styles.opcionElegida]}
                  >
                    <Text style={styles.opcionTitulo}>{n.label}</Text>
                    <Text style={styles.opcionTexto}>{comoToco(i)[n.value]}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
        <View style={styles.acciones}>
          <Button variant="secondary" onPress={cerrar}>
            {enAutoevaluacion ? "Ahora no" : "Saltar"}
          </Button>
          {enAutoevaluacion ? (
            <Button onPress={() => void terminar()}>Listo</Button>
          ) : (
            <Button
              onPress={() =>
                paso + 1 === PASOS.length && !instrumentos.length ? cerrar() : setPaso(paso + 1)
              }
            >
              Siguiente
            </Button>
          )}
        </View>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: 16,
    gap: 16,
  },
  paso: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  icono: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: colors.selected,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: colors.foreground,
  },
  instrumento: {
    gap: 6,
  },
  opcion: {
    gap: 2,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  opcionElegida: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  opcionTitulo: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  opcionTexto: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  acciones: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
