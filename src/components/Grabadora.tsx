import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Circle, Download, RotateCcw, Send, Square } from "lucide-react";
import { Opciones } from "@/components/plan/comunes";
import { Reproductor, minutosYSegundos } from "@/components/Reproductor";
import { Button, buttonForeground } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { avisar } from "@/components/ui/toast";
import { MAX_BYTES, formatearTamano, subirYAnotar, type Material } from "@/lib/files";
import { MAX_SEGUNDOS, useGrabadora, type ModoGrabacion } from "@/lib/grabadora";
import { colors, fonts, radius } from "@/lib/theme";

const modos = [
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
] as const;

// Record → listen (slower, in a loop) → send as a delivery, record again or download.
// Without `envio` it is a practice mirror: record and listen to yourself, nothing is uploaded.
export function Grabadora({
  envio,
  principal = false,
}: {
  envio?: { carpeta: string; anotar: (material: Material) => Promise<void> };
  principal?: boolean;
}) {
  const [modo, setModo] = useState<ModoGrabacion>("audio");
  const { estado, error, segundos, vista, toma, grabar, detener, descartar } = useGrabadora();
  const [subida, setSubida] = useState<number | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const enviar = async () => {
    if (!envio || !toma) return;
    if (toma.file.size > MAX_BYTES) {
      setErrorEnvio(`La grabación supera ${formatearTamano(MAX_BYTES)}.`);
      return;
    }
    setErrorEnvio(null);
    setSubida(0);
    try {
      await subirYAnotar(envio.carpeta, toma.file, setSubida, envio.anotar);
      avisar({ texto: "Grabación enviada a tu profesor." });
      descartar();
    } catch {
      setErrorEnvio("No se pudo enviar. Revisa tu conexión y vuelve a intentar.");
    } finally {
      setSubida(null);
    }
  };

  if (estado === "lista" && toma) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.info}>
          Tu grabación · {minutosYSegundos(toma.segundos)} · {formatearTamano(toma.file.size)}
        </Text>
        <Reproductor url={toma.url} tipo={toma.modo} />
        {subida !== null ? <Progress value={subida} /> : null}
        <View style={styles.acciones}>
          {envio ? (
            <Button disabled={subida !== null} onPress={enviar}>
              <Send size={16} color={buttonForeground()} />
              {subida !== null ? `Enviando… ${subida}%` : "Enviar a mi profesor"}
            </Button>
          ) : null}
          <Button variant="secondary" disabled={subida !== null} onPress={descartar}>
            <RotateCcw size={16} color={buttonForeground("secondary")} />
            Grabar de nuevo
          </Button>
          <Pressable
            accessibilityRole="link"
            href={toma.url}
            hrefAttrs={{ download: toma.file.name }}
            style={styles.descargar}
          >
            <Download size={14} color={colors.foreground} />
            <Text style={styles.descargarTexto}>Descargar</Text>
          </Pressable>
        </View>
        {errorEnvio ? <Text style={styles.error}>{errorEnvio}</Text> : null}
      </View>
    );
  }

  if (estado === "grabando" || estado === "pidiendo") {
    return (
      <View style={styles.wrap}>
        {vista ? <VistaPrevia stream={vista} /> : null}
        <View style={styles.grabando} accessibilityLiveRegion="polite">
          <View style={styles.punto} />
          <Text style={styles.tiempo}>
            {estado === "pidiendo"
              ? modo === "video"
                ? "Permite el uso de la cámara y el micrófono…"
                : "Permite el uso del micrófono…"
              : `Grabando ${minutosYSegundos(segundos)} de ${minutosYSegundos(MAX_SEGUNDOS[modo])}`}
          </Text>
        </View>
        <Button variant="secondary" disabled={estado === "pidiendo"} onPress={detener}>
          <Square size={14} color={buttonForeground("secondary")} />
          Detener
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.acciones}>
        <Opciones chico opciones={modos} valor={modo} onChange={setModo} />
        <Button variant={principal ? "default" : "secondary"} onPress={() => void grabar(modo)}>
          <Circle
            size={14}
            color={buttonForeground(principal ? "default" : "secondary")}
            fill={buttonForeground(principal ? "default" : "secondary")}
          />
          {modo === "video" ? "Grabar video" : "Grabar audio"}
        </Button>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

// Live camera while recording (muted, mirrored like a selfie).
function VistaPrevia({ stream }: { stream: MediaStream }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={video}
      autoPlay
      muted
      playsInline
      style={{ width: "100%", maxHeight: 360, borderRadius: 12, transform: "scaleX(-1)" }}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  info: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  grabando: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  punto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.destructive,
  },
  tiempo: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  descargar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
  },
  descargarTexto: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
    textDecorationLine: "underline",
    textDecorationColor: colors.primary,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
});
