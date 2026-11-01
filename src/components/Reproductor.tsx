import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MessageSquarePlus, Repeat, Trash2, X } from "lucide-react";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { colors, fonts, radius } from "@/lib/theme";

// Practice player: slower playback without changing the pitch, and an A-B loop to repeat a
// passage. Used for every audio and video of the classes and deliveries. `marcas` are the
// profesor's comments at a point of the file (tap one to go there); `onComentar` lets the
// profesor add one at the current time.

export type Marca = { id: string; segundo: number; texto: string };

export const minutosYSegundos = (segundos: number) =>
  `${Math.floor(segundos / 60)}:${String(Math.floor(segundos % 60)).padStart(2, "0")}`;

export function Reproductor({
  url,
  tipo,
  autoPlay = false,
  marcas = [],
  onComentar,
  onQuitarMarca,
}: {
  url: string;
  tipo: "audio" | "video";
  autoPlay?: boolean;
  marcas?: Marca[];
  onComentar?: (segundo: number, texto: string) => Promise<void>;
  onQuitarMarca?: (id: string) => void;
}) {
  const [nueva, setNueva] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const [velocidad, setVelocidad] = useState("1");
  const [bucle, setBucle] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });

  const aplicarVelocidad = () => {
    const el = media.current;
    if (!el) return;
    el.preservesPitch = true;
    el.playbackRate = Number(velocidad);
  };
  // Also on load: a new source starts at normal speed.
  useEffect(aplicarVelocidad, [velocidad]);

  // Checked every frame while the loop is set: `timeupdate` only fires 4 times a second.
  useEffect(() => {
    const el = media.current;
    const { a, b } = bucle;
    if (!el || a === null || b === null) return;
    let id = 0;
    const vigilar = () => {
      if (el.currentTime >= b) el.currentTime = a;
      id = requestAnimationFrame(vigilar);
    };
    id = requestAnimationFrame(vigilar);
    return () => cancelAnimationFrame(id);
  }, [bucle]);

  return (
    <View style={styles.wrap}>
      {tipo === "video" ? (
        <video
          ref={media}
          controls
          playsInline
          autoPlay={autoPlay}
          src={url}
          onLoadedMetadata={aplicarVelocidad}
          style={{ width: "100%", maxHeight: 360, borderRadius: 12 }}
        />
      ) : (
        <audio
          ref={media}
          controls
          autoPlay={autoPlay}
          src={url}
          onLoadedMetadata={aplicarVelocidad}
          style={{ width: "100%" }}
        />
      )}
      <ControlesPractica
        velocidades={["0.5", "0.75", "0.9", "1"]}
        velocidad={velocidad}
        onVelocidad={setVelocidad}
        bucle={bucle}
        onBucle={setBucle}
        tiempoActual={() => media.current?.currentTime ?? 0}
        onIrA={(segundos) => {
          if (media.current) media.current.currentTime = segundos;
        }}
      />
      {marcas.length ? (
        <View style={styles.marcas}>
          <Text style={styles.etiqueta}>Comentarios del profesor</Text>
          {[...marcas]
            .sort((a, b) => a.segundo - b.segundo)
            .map((marca) => (
              <View key={marca.id} style={styles.marca}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ir a ${minutosYSegundos(marca.segundo)}: ${marca.texto}`}
                  onPress={() => {
                    const el = media.current;
                    if (!el) return;
                    el.currentTime = marca.segundo;
                    void el.play();
                  }}
                  style={styles.marcaBoton}
                >
                  <Text style={styles.marcaTiempo}>{minutosYSegundos(marca.segundo)}</Text>
                  <Text style={styles.marcaTexto}>{marca.texto}</Text>
                </Pressable>
                {onQuitarMarca ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Borrar comentario"
                    onPress={() => onQuitarMarca(marca.id)}
                    style={styles.quitar}
                  >
                    <Trash2 size={14} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
            ))}
        </View>
      ) : null}
      {onComentar ? (
        nueva === null ? (
          <Button
            variant="secondary"
            size="sm"
            style={styles.comentar}
            onPress={() => {
              media.current?.pause();
              setNueva(media.current?.currentTime ?? 0);
            }}
          >
            <MessageSquarePlus size={14} color={buttonForeground("secondary")} />
            Comentar en este momento
          </Button>
        ) : (
          <View style={styles.nueva}>
            <Text style={styles.etiqueta}>Comentario en {minutosYSegundos(nueva)}</Text>
            <Input
              value={texto}
              onChangeText={setTexto}
              placeholder="Ej.: acá se apura el fill, mantén el hi-hat parejo"
              accessibilityLabel="Comentario"
              maxLength={300}
            />
            <View style={styles.fila}>
              <Button
                size="sm"
                disabled={!texto.trim() || guardando}
                onPress={async () => {
                  setGuardando(true);
                  try {
                    await onComentar(nueva, texto.trim());
                    setNueva(null);
                    setTexto("");
                  } finally {
                    setGuardando(false);
                  }
                }}
              >
                Guardar comentario
              </Button>
              <Button variant="secondary" size="sm" onPress={() => setNueva(null)}>
                Cancelar
              </Button>
            </View>
          </View>
        )
      ) : null}
    </View>
  );
}

export type Bucle = { a: number | null; b: number | null };

// Speed options and the A-B loop buttons, for any player that can tell its current time.
export function ControlesPractica({
  velocidades,
  velocidad,
  onVelocidad,
  bucle,
  onBucle,
  tiempoActual,
  onIrA,
}: {
  velocidades: string[];
  velocidad: string;
  onVelocidad: (velocidad: string) => void;
  bucle: Bucle;
  onBucle: (bucle: Bucle) => void;
  tiempoActual: () => number;
  onIrA: (segundos: number) => void;
}) {
  const { a, b } = bucle;
  return (
    <View style={styles.controles}>
      <View style={styles.fila}>
        <Text style={styles.etiqueta}>Velocidad</Text>
        <Opciones
          chico
          opciones={velocidades.map((v) => ({
            value: v,
            label: `${Math.round(Number(v) * 100)} %`,
          }))}
          valor={velocidad}
          onChange={onVelocidad}
        />
      </View>
      <View style={styles.fila}>
        <Text style={styles.etiqueta}>Repetir</Text>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => {
            const t = tiempoActual();
            onBucle({ a: t, b: b !== null && b > t ? b : null });
          }}
        >
          {a === null ? "Inicio (A)" : `A ${minutosYSegundos(a)}`}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={a === null}
          onPress={() => {
            const t = tiempoActual();
            if (a !== null && t > a + 0.3) {
              onBucle({ a, b: t });
              onIrA(a);
            }
          }}
        >
          {b === null ? "Fin (B)" : `B ${minutosYSegundos(b)}`}
        </Button>
        {a !== null ? (
          <Button
            variant="secondary"
            size="sm"
            accessibilityLabel="Quitar la repetición"
            onPress={() => onBucle({ a: null, b: null })}
          >
            <X size={14} color={buttonForeground("secondary")} />
          </Button>
        ) : null}
      </View>
      {a !== null && b !== null ? (
        <View style={styles.fila}>
          <Repeat size={14} color={colors.primary} />
          <Text style={styles.ayuda}>
            Repitiendo de {minutosYSegundos(a)} a {minutosYSegundos(b)}
          </Text>
        </View>
      ) : a !== null ? (
        <Text style={styles.ayuda}>Reproduce hasta donde termina el pasaje y toca Fin (B).</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  controles: {
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  etiqueta: {
    minWidth: 64,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  marcas: {
    gap: 6,
  },
  marca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  marcaBoton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  marcaTiempo: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    color: colors.primary,
  },
  marcaTexto: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.foreground,
  },
  quitar: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  comentar: {
    alignSelf: "flex-start",
  },
  nueva: {
    gap: 8,
  },
});
