import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Circle, Download, Headphones, RotateCcw, Send, Sparkles, Square } from "lucide-react";
import { Opciones } from "@/components/plan/comunes";
import { Reproductor, minutosYSegundos } from "@/components/Reproductor";
import { Button, buttonForeground } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Stepper } from "@/components/ui/stepper";
import { avisar } from "@/components/ui/toast";
import {
  MAX_SEGUNDOS_ANALISIS,
  analizarToma,
  resumenAnalisis,
  type Analisis,
} from "@/lib/analisis";
import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/borrador";
import {
  MAX_BYTES,
  formatearTamano,
  motivoDeSubida,
  subirYAnotar,
  type Material,
} from "@/lib/files";
import { MAX_SEGUNDOS, useGrabadora, type ModoGrabacion } from "@/lib/grabadora";
import type { InstrumentId } from "@/lib/instruments";
import { useMetronomo } from "@/lib/metronomo";
import { usePantallaEncendida } from "@/lib/pantalla";
import { colors, fonts, radius } from "@/lib/theme";

const modos = [
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
] as const;

// Record → listen (slower, in a loop) → send as a delivery, record again or download.
// Without `envio` it is a practice mirror: record and listen to yourself, nothing is uploaded.
// With `instrumento`, the take is analyzed (tuning and time, src/lib/analisis.ts) and the
// numbers travel with the file. The click sounds only while recording: with headphones it is
// not recorded. Before recording there is a count-in: 3 seconds, or a bar of the click. With
// `envio`, a take not sent yet stays in this browser (src/lib/borrador.ts) and, without
// connection, goes on its own when it comes back.
export function Grabadora({
  envio,
  principal = false,
  instrumento,
  etiquetaEnvio = "Enviar a mi profesor",
  avisoEnvio = "Grabación enviada a tu profesor.",
  conClick = true,
}: {
  envio?: { carpeta: string; anotar: (material: Material) => Promise<void> };
  principal?: boolean;
  instrumento?: InstrumentId;
  etiquetaEnvio?: string;
  avisoEnvio?: string;
  conClick?: boolean;
}) {
  const [modo, setModo] = useState<ModoGrabacion>("audio");
  const { estado, error, segundos, vista, toma, grabar, detener, descartar, cancelar, restaurar } =
    useGrabadora();
  const [subida, setSubida] = useState<number | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [esperandoRed, setEsperandoRed] = useState(false);
  const [recuperada, setRecuperada] = useState(false);
  const [click, setClick] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [cuenta, setCuenta] = useState<number | null>(null);
  const finDeCuenta = useRef<(() => void) | null>(null);
  // The click the current take was recorded with (the analysis compares against it).
  const [bpmDeToma, setBpmDeToma] = useState<number | undefined>(undefined);
  const carpeta = envio?.carpeta;
  const contando = estado === "contando";
  usePantallaEncendida(contando || estado === "grabando");
  const pulso = useMetronomo({
    activo: click && (contando || estado === "grabando"),
    bpm,
    slots: 4,
    sonidoDe: (slot) => (slot === 0 ? "acento" : "pulso"),
  });
  const [analisis, setAnalisis] = useState<{ url: string; valor: Analisis | null } | null>(null);
  const analizable = !!instrumento && !!toma && toma.segundos <= MAX_SEGUNDOS_ANALISIS;
  const analizando = analizable && analisis?.url !== toma?.url;

  useEffect(() => {
    if (!instrumento || !toma || toma.segundos > MAX_SEGUNDOS_ANALISIS) return;
    let activo = true;
    void analizarToma(toma.file, instrumento, bpmDeToma).then(
      (valor) => activo && setAnalisis({ url: toma.url, valor }),
      () => activo && setAnalisis({ url: toma.url, valor: null }),
    );
    return () => {
      activo = false;
    };
  }, [toma, instrumento, bpmDeToma]);

  const resultado = analisis && toma && analisis.url === toma.url ? analisis.valor : null;

  // A take left unsent in this browser comes back when the screen opens.
  useEffect(() => {
    if (!carpeta) return;
    let activo = true;
    void leerBorrador(carpeta).then((borrador) => {
      if (!activo || !borrador) return;
      setBpmDeToma(borrador.bpm);
      setRecuperada(true);
      restaurar(borrador.file, borrador.modo, borrador.segundos);
    });
    return () => {
      activo = false;
    };
    // Only when opening; `restaurar` is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carpeta]);

  useEffect(() => {
    if (!carpeta || !toma) return;
    void guardarBorrador(carpeta, {
      file: toma.file,
      modo: toma.modo,
      segundos: toma.segundos,
      ...(bpmDeToma ? { bpm: bpmDeToma } : {}),
    });
    // The take is what changes; its click was set before recording.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carpeta, toma]);

  const terminarCuenta = () => {
    finDeCuenta.current?.();
    finDeCuenta.current = null;
    setCuenta(null);
  };
  useEffect(() => () => finDeCuenta.current?.(), []);

  // 3 seconds to go back to the instrument, or one bar of the click.
  const prepararCuenta = () =>
    new Promise<void>((resolve) => {
      let restante = click ? 4 : 3;
      setCuenta(restante);
      const timer = window.setInterval(
        () => {
          restante -= 1;
          if (restante > 0) setCuenta(restante);
          else terminarCuenta();
        },
        click ? 60_000 / bpm : 1000,
      );
      finDeCuenta.current = () => {
        window.clearInterval(timer);
        resolve();
      };
    });

  const empezar = () => {
    setBpmDeToma(click ? bpm : undefined);
    setRecuperada(false);
    void grabar(modo, prepararCuenta);
  };

  const cancelarCuenta = () => {
    cancelar();
    terminarCuenta();
  };

  const descartarToma = () => {
    if (carpeta) void borrarBorrador(carpeta);
    setRecuperada(false);
    setEsperandoRed(false);
    descartar();
  };

  const enviar = async () => {
    if (!envio || !toma) return;
    if (toma.file.size > MAX_BYTES) {
      setErrorEnvio(`La grabación supera ${formatearTamano(MAX_BYTES)}.`);
      return;
    }
    setErrorEnvio(null);
    if (!navigator.onLine) {
      setEsperandoRed(true);
      return;
    }
    setEsperandoRed(false);
    setSubida(0);
    try {
      await subirYAnotar(envio.carpeta, toma.file, setSubida, (material) =>
        envio.anotar(resultado ? { ...material, analisis: resultado } : material),
      );
      avisar({ texto: avisoEnvio });
      descartarToma();
    } catch (error) {
      if (!navigator.onLine) setEsperandoRed(true);
      else setErrorEnvio(`${motivoDeSubida(error)}. Vuelve a intentar.`);
    } finally {
      setSubida(null);
    }
  };

  // Waiting for the connection: it goes on its own as soon as it comes back.
  const enviarAlVolver = useRef(enviar);
  useEffect(() => {
    enviarAlVolver.current = enviar;
  });
  useEffect(() => {
    if (!esperandoRed) return;
    const alVolver = () => void enviarAlVolver.current();
    window.addEventListener("online", alVolver);
    return () => window.removeEventListener("online", alVolver);
  }, [esperandoRed]);

  if (estado === "lista" && toma) {
    return (
      <View style={styles.wrap}>
        {recuperada ? (
          <Text style={styles.info}>Tenías esta grabación sin enviar: la guardamos para ti.</Text>
        ) : null}
        <Text style={styles.info}>
          Tu grabación · {minutosYSegundos(toma.segundos)} · {formatearTamano(toma.file.size)}
        </Text>
        <Reproductor url={toma.url} tipo={toma.modo} />
        {analizando ? (
          <Text style={styles.analisis}>Analizando tu grabación…</Text>
        ) : resultado ? (
          <View style={styles.analisisCaja}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={styles.analisis}>
              {resumenAnalisis(resultado)}
              {envio ? ". Se envía junto con la grabación." : "."}
            </Text>
          </View>
        ) : null}
        {subida !== null ? <Progress value={subida} /> : null}
        <View style={styles.acciones}>
          {envio ? (
            <Button disabled={subida !== null || analizando || esperandoRed} onPress={enviar}>
              <Send size={16} color={buttonForeground()} />
              {subida !== null ? `Enviando… ${subida}%` : etiquetaEnvio}
            </Button>
          ) : null}
          <Button variant="secondary" disabled={subida !== null} onPress={descartarToma}>
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
        {esperandoRed ? (
          <Text accessibilityLiveRegion="polite" style={styles.info}>
            Sin conexión: se enviará sola cuando vuelva internet. Tu grabación está guardada en este
            dispositivo.
          </Text>
        ) : null}
        {errorEnvio ? <Text style={styles.error}>{errorEnvio}</Text> : null}
      </View>
    );
  }

  if (contando) {
    return (
      <View style={styles.wrap}>
        {vista ? <VistaPrevia stream={vista} /> : null}
        <View style={styles.cuenta} accessibilityLiveRegion="assertive">
          <Text style={styles.ayuda}>Prepárate: empieza a grabar en</Text>
          <Text style={styles.cuentaNumero}>{cuenta ?? ""}</Text>
        </View>
        <Button variant="secondary" onPress={cancelarCuenta}>
          Cancelar
        </Button>
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
          {click && estado === "grabando" ? (
            <View style={styles.pulsos} aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.pulsoPunto, i === pulso && styles.pulsoActual]} />
              ))}
            </View>
          ) : null}
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
        <Button variant={principal ? "default" : "secondary"} onPress={empezar}>
          <Circle
            size={14}
            color={buttonForeground(principal ? "default" : "secondary")}
            fill={buttonForeground(principal ? "default" : "secondary")}
          />
          {modo === "video" ? "Grabar video" : "Grabar audio"}
        </Button>
      </View>
      {conClick ? (
        <View style={styles.acciones}>
          <Opciones
            chico
            opciones={[
              { value: "no", label: "Sin click" },
              { value: "si", label: "Con click" },
            ]}
            valor={click ? "si" : "no"}
            onChange={(v) => setClick(v === "si")}
          />
          {click ? (
            <>
              <Stepper
                label="tempo"
                value={bpm}
                onChange={setBpm}
                min={40}
                max={240}
                step={2}
                suffix="BPM"
              />
              <View style={styles.auriculares}>
                <Headphones size={14} color={colors.mutedForeground} />
                <Text style={styles.ayuda}>Usa auriculares: así el click no queda grabado.</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}
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
  cuenta: {
    alignItems: "center",
    gap: 4,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  cuentaNumero: {
    minHeight: 64,
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 64,
    fontVariant: ["tabular-nums"],
    color: colors.primary,
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
  analisisCaja: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  analisis: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  pulsos: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
  },
  pulsoPunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  // What sounds: solid amber.
  pulsoActual: {
    backgroundColor: colors.primary,
  },
  auriculares: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
