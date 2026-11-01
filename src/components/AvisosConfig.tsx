import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bell, BellOff } from "lucide-react";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { avisar } from "@/components/ui/toast";
import type { Perfil } from "@/lib/auth";
import { activarAvisos, desactivarAvisos, estadoAvisos, type EstadoAvisos } from "@/lib/avisos";
import { guardarRecordatorio } from "@/lib/data";
import { colors, fonts } from "@/lib/theme";

const HORAS = ["", "7", "12", "15", "17", "18", "19", "20", "21"] as const;

const EXPLICACION: Record<EstadoAvisos, string> = {
  "sin-configurar": "Los avisos todavía no están configurados en Pulso.",
  "no-soportado":
    "Este navegador no recibe avisos. En iPhone o iPad, agrega Pulso a la pantalla de inicio (Compartir → Agregar a inicio) y actívalos desde ahí.",
  bloqueado:
    "Bloqueaste los avisos de Pulso en este navegador. Permítelos desde el candado de la barra de direcciones y vuelve aquí.",
  apagado: "Recibe en este dispositivo las clases nuevas, los comentarios y los mensajes.",
  activo: "Este dispositivo recibe los avisos de Pulso.",
};

// Profile: push notices on this device and, for alumnos, the daily practice reminder.
export function AvisosConfig({ perfil }: { perfil: Perfil }) {
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let activo = true;
    void estadoAvisos().then((e) => activo && setEstado(e));
    return () => {
      activo = false;
    };
  }, []);

  const cambiar = async () => {
    setOcupado(true);
    try {
      if (estado === "activo") await desactivarAvisos();
      else await activarAvisos(perfil.uid);
      avisar({ texto: estado === "activo" ? "Avisos desactivados." : "Avisos activados." });
    } catch {
      avisar({ texto: "No se pudieron cambiar los avisos.", tipo: "error" });
    } finally {
      setEstado(await estadoAvisos());
      setOcupado(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {estado ? <Text style={styles.texto}>{EXPLICACION[estado]}</Text> : null}
      {estado === "apagado" || estado === "activo" ? (
        <Button
          variant={estado === "activo" ? "secondary" : "default"}
          disabled={ocupado}
          style={styles.boton}
          onPress={() => void cambiar()}
        >
          {estado === "activo" ? (
            <BellOff size={16} color={buttonForeground("secondary")} />
          ) : (
            <Bell size={16} color={buttonForeground()} />
          )}
          {estado === "activo" ? "Desactivar en este dispositivo" : "Activar avisos"}
        </Button>
      ) : null}
      {perfil.rol === "alumno" ? (
        <View style={styles.recordatorio}>
          <Text style={styles.label}>Recordatorio de práctica, todos los días a las…</Text>
          <Opciones
            chico
            opciones={HORAS.map((h) => ({ value: h, label: h ? `${h}:00` : "Sin recordatorio" }))}
            valor={perfil.recordatorio === undefined ? "" : String(perfil.recordatorio)}
            onChange={(h) =>
              void guardarRecordatorio(perfil.uid, h ? Number(h) : null).catch(() =>
                avisar({ texto: "No se pudo guardar el recordatorio.", tipo: "error" }),
              )
            }
          />
          <Text style={styles.ayuda}>
            Llega solo si ese día todavía no anotaste práctica en tu diario, y te cuenta tu racha.
            Necesita los avisos activados.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  boton: {
    alignSelf: "flex-start",
  },
  recordatorio: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
