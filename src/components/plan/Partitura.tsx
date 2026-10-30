import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Gauge, Pause, Play, Square } from "lucide-react";
import fuenteWoff from "@coderline/alphatab/font/Bravura.woff?url";
import fuenteWoff2 from "@coderline/alphatab/font/Bravura.woff2?url";
import sonidos from "@coderline/alphatab/soundfont/sonivox.sf3?url";
import { colors, fonts, radius } from "@/lib/theme";

type AlphaTabApi = import("@coderline/alphatab").AlphaTabApi;

// Score + tab with playback (alphaTab, loaded only when a class uses it). The source is alphaTex
// text or a Guitar Pro / MusicXML file URL. Always drawn on paper, in both themes.
export function Partitura({ tex, url }: { tex?: string; url?: string }) {
  const host = useRef<HTMLDivElement | null>(null);
  const api = useRef<AlphaTabApi | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [error, setError] = useState<string | null>(null);
  const [reproductor, setReproductor] = useState<"cargando" | "listo" | "sonando">("cargando");
  const [velocidad, setVelocidad] = useState(1);

  // Create the renderer once.
  useEffect(() => {
    let cancelado = false;
    void import("@coderline/alphatab").then((alphaTab) => {
      if (cancelado || !host.current) return;
      estilosDelCursor();
      const instancia = new alphaTab.AlphaTabApi(host.current, {
        core: {
          // Small class exercises: rendering on the main thread avoids bundling workers.
          useWorkers: false,
          // Short exercises: draw everything at once instead of only what is on screen.
          enableLazyLoading: false,
          smuflFontSources: new Map([
            ["woff2", fuenteWoff2],
            ["woff", fuenteWoff],
          ]),
        },
        display: { scale: 0.9, staveProfile: "default" },
        player: {
          playerMode: "EnabledSynthesizer",
          outputMode: "WebAudioScriptProcessor",
          soundFont: sonidos,
          enableCursor: true,
          enableUserInteraction: true,
          scrollMode: "off",
        },
      });
      instancia.renderFinished.on(() => {
        setEstado("listo");
        setError(null);
      });
      instancia.error.on((e) => {
        setEstado("error");
        setError(e instanceof Error ? e.message : String(e));
      });
      instancia.playerReady.on(() => setReproductor("listo"));
      instancia.playerStateChanged.on((e) => setReproductor(e.state === 1 ? "sonando" : "listo"));
      api.current = instancia;
      cargar(instancia, tex, url);
    });
    return () => {
      cancelado = true;
      api.current?.destroy();
      api.current = null;
    };
    // The source updates below; the renderer is created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New source: re-render in place.
  useEffect(() => {
    if (api.current) cargar(api.current, tex, url);
  }, [tex, url]);

  const cambiarVelocidad = () => {
    const opciones = [0.5, 0.75, 1, 1.25];
    const siguiente = opciones[(opciones.indexOf(velocidad) + 1) % opciones.length] ?? 1;
    setVelocidad(siguiente);
    if (api.current) api.current.playbackSpeed = siguiente;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reproductor === "sonando" ? "Pausar" : "Reproducir"}
          disabled={reproductor === "cargando" || estado !== "listo"}
          onPress={() => api.current?.playPause()}
          style={[
            styles.play,
            (reproductor === "cargando" || estado !== "listo") && styles.disabled,
          ]}
        >
          {reproductor === "sonando" ? (
            <Pause size={16} color={colors.primaryForeground} />
          ) : (
            <Play size={16} color={colors.primaryForeground} />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Detener"
          onPress={() => api.current?.stop()}
          style={styles.tool}
        >
          <Square size={14} color={colors.foreground} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Velocidad ${Math.round(velocidad * 100)} %`}
          onPress={cambiarVelocidad}
          style={styles.tool}
        >
          <Gauge size={14} color={colors.foreground} />
          <Text style={styles.toolText}>{Math.round(velocidad * 100)} %</Text>
        </Pressable>
        <Text style={styles.hint}>
          {reproductor === "cargando"
            ? "Cargando sonidos…"
            : "Toca una nota para empezar desde ahí"}
        </Text>
      </View>
      <View style={styles.paper}>
        {estado === "cargando" ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : null}
        {estado === "error" ? (
          <Text style={styles.error}>
            No se pudo dibujar la partitura. Revisa la escritura de la tablatura.
            {error ? `\n${error.slice(0, 200)}` : ""}
          </Text>
        ) : null}
        <div ref={host} style={{ width: "100%" }} />
      </View>
    </View>
  );
}

function cargar(api: AlphaTabApi, tex?: string, url?: string) {
  if (url) api.load(url);
  else api.tex(tex ?? "");
}

// alphaTab draws its playback cursor and highlights with these classes.
let estilosListos = false;
function estilosDelCursor() {
  if (estilosListos) return;
  estilosListos = true;
  const style = document.createElement("style");
  style.textContent = `
    .at-cursor-bar { background: rgba(249, 161, 41, 0.18); }
    .at-selection div { background: rgba(249, 161, 41, 0.12); }
    .at-cursor-beat { background: #e9622e; width: 3px; }
    .at-highlight * { fill: #c2570c; stroke: #c2570c; }`;
  document.head.appendChild(style);
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  play: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  tool: {
    height: 32,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  toolText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  paper: {
    minHeight: 120,
    padding: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    overflow: "hidden",
  },
  loading: {
    marginVertical: 40,
  },
  error: {
    padding: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.destructive,
  },
});
