import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ControlesPractica, type Bucle } from "@/components/Reproductor";
import { Input } from "@/components/ui/input";
import { youtube, type Bloque } from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type Youtube = Extract<Bloque, { tipo: "youtube" }>;

// Reference video, embedded without tracking cookies (youtube-nocookie.com), with practice
// speed and an A-B loop.
export function YoutubeBloque({
  bloque,
  editable,
  onChange,
}: {
  bloque: Youtube;
  editable: boolean;
  onChange: (bloque: Youtube) => void;
}) {
  const video = youtube(bloque.url);

  return (
    <View style={styles.wrap}>
      {editable ? (
        <>
          <Input
            value={bloque.url}
            onChangeText={(url) => onChange({ ...bloque, url: url.trim().slice(0, 300) })}
            placeholder="Pega el enlace de YouTube (también sirve con ?t=90 para empezar en un minuto)"
            accessibilityLabel="Enlace de YouTube"
            autoCapitalize="none"
            inputMode="url"
          />
          {bloque.url && !video ? (
            <Text style={styles.error}>Ese enlace no parece de un video de YouTube.</Text>
          ) : null}
        </>
      ) : null}
      {video ? (
        <Video key={video.id} id={video.id ?? ""} inicio={video.inicio} titulo={bloque.titulo} />
      ) : !editable ? (
        <Text style={styles.vacio}>Sin video.</Text>
      ) : null}
    </View>
  );
}

// The embed is driven with the iframe API messages (no extra script): commands go in with
// postMessage, and the player reports its current time back while we listen.
function Video({ id, inicio, titulo }: { id: string; inicio: number; titulo: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const tiempo = useRef(inicio);
  const [velocidad, setVelocidad] = useState("1");
  const [bucle, setBucle] = useState<Bucle>({ a: null, b: null });

  const enviar = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );

  useEffect(() => {
    const escuchar = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const t = data?.info?.currentTime;
        if (typeof t === "number") tiempo.current = t;
      } catch {
        // Not a player message.
      }
    };
    window.addEventListener("message", escuchar);
    return () => window.removeEventListener("message", escuchar);
  }, []);

  useEffect(() => {
    const { a, b } = bucle;
    if (a === null || b === null) return;
    const timer = window.setInterval(() => {
      if (tiempo.current >= b) {
        tiempo.current = a;
        enviar("seekTo", [a, true]);
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [bucle]);

  const origen = encodeURIComponent(window.location.origin);

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <iframe
          ref={frame}
          title={titulo || "Video de YouTube"}
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&enablejsapi=1&origin=${origen}${inicio ? `&start=${inicio}` : ""}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() =>
            frame.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
              "*",
            )
          }
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      </View>
      <View style={styles.controles}>
        <ControlesPractica
          velocidades={["0.5", "0.75", "1"]}
          velocidad={velocidad}
          onVelocidad={(v) => {
            setVelocidad(v);
            enviar("setPlaybackRate", [Number(v)]);
          }}
          bucle={bucle}
          onBucle={setBucle}
          tiempoActual={() => tiempo.current}
          onIrA={(segundos) => {
            tiempo.current = segundos;
            enviar("seekTo", [segundos, true]);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  frame: {
    position: "relative",
    width: "100%",
    maxWidth: 720,
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  controles: {
    maxWidth: 720,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.destructive,
  },
  vacio: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
