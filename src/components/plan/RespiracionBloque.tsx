import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pause, Play } from "lucide-react";
import { Fila } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Stepper } from "@/components/ui/stepper";
import { contextoDeAudio, sostenerNota } from "@/lib/audio";
import { frecuenciaDe, nota } from "@/lib/notas";
import type { Bloque } from "@/lib/plan";
import { colors, fonts } from "@/lib/theme";

type Respiracion = Extract<Bloque, { tipo: "respiracion" }>;
type Fase = "inhalar" | "sostener" | "exhalar";

const TEXTO: Record<Fase, string> = { inhalar: "Inhala", sostener: "Sostén", exhalar: "Exhala" };

// Breathing guide for voice and winds: a circle that grows while inhaling and shrinks while
// exhaling, with the count. With a note, it sounds while exhaling (sing it or play a long note).
export function RespiracionBloque({
  bloque,
  editable,
  onChange,
}: {
  bloque: Respiracion;
  editable: boolean;
  onChange: (bloque: Respiracion) => void;
}) {
  const [activo, setActivo] = useState(false);
  const [paso, setPaso] = useState({
    fase: "inhalar" as Fase,
    restante: bloque.inhalar,
    vuelta: 1,
  });

  // One tick per second through inhale → hold → exhale, `repeticiones` times.
  useEffect(() => {
    if (!activo) return;
    const timer = window.setInterval(() => {
      setPaso((p) => {
        if (p.restante > 1) return { ...p, restante: p.restante - 1 };
        const siguiente: Fase =
          p.fase === "inhalar"
            ? bloque.sostener
              ? "sostener"
              : "exhalar"
            : p.fase === "sostener"
              ? "exhalar"
              : "inhalar";
        if (siguiente === "inhalar" && p.vuelta >= bloque.repeticiones) {
          setActivo(false);
          return { fase: "inhalar", restante: bloque.inhalar, vuelta: 1 };
        }
        return {
          fase: siguiente,
          restante: bloque[siguiente],
          vuelta: siguiente === "inhalar" ? p.vuelta + 1 : p.vuelta,
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activo, bloque]);

  // The reference note, only while exhaling.
  const conNota = activo && paso.fase === "exhalar" && bloque.nota !== null;
  useEffect(() => {
    if (!conNota || bloque.nota === null) return;
    return sostenerNota(frecuenciaDe(bloque.nota));
  }, [conNota, bloque.nota]);

  const grande = activo && (paso.fase === "inhalar" || paso.fase === "sostener");
  const duracion = paso.fase === "inhalar" ? bloque.inhalar : bloque.exhalar;

  return (
    <View style={styles.wrap}>
      {editable ? (
        <View style={styles.opciones}>
          <View style={styles.fila}>
            {(["inhalar", "sostener", "exhalar"] as const).map((fase) => (
              <Fila key={fase} label={`${TEXTO[fase]} (s)`}>
                <Stepper
                  label={`segundos para ${fase}`}
                  value={bloque[fase]}
                  min={fase === "sostener" ? 0 : 1}
                  max={30}
                  onChange={(v) => onChange({ ...bloque, [fase]: v })}
                />
              </Fila>
            ))}
            <Fila label="Veces">
              <Stepper
                label="repeticiones"
                value={bloque.repeticiones}
                min={1}
                max={30}
                onChange={(repeticiones) => onChange({ ...bloque, repeticiones })}
              />
            </Fila>
          </View>
          <View style={styles.fila}>
            <Checkbox
              checked={bloque.nota !== null}
              onCheckedChange={(v) => onChange({ ...bloque, nota: v ? 60 : null })}
              accessibilityLabel="Con nota de referencia"
            />
            <Text style={styles.texto}>Con nota al exhalar (vocalización o nota larga)</Text>
            {bloque.nota !== null ? (
              <Stepper
                label="nota"
                value={bloque.nota}
                min={36}
                max={84}
                suffix={`${nota(bloque.nota).nombre} ${nota(bloque.nota).cifrado}`}
                onChange={(v) => onChange({ ...bloque, nota: v })}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.escena} accessibilityLiveRegion="polite">
        <div
          aria-hidden="true"
          style={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: colors.selected,
            border: `3px solid ${colors.primary}`,
            transform: `scale(${grande ? 1 : 0.55})`,
            transition: `transform ${activo ? duracion : 0.3}s ease-in-out`,
          }}
        />
        <View style={styles.centro}>
          <Text style={styles.fase}>{activo ? TEXTO[paso.fase] : "Listo"}</Text>
          <Text style={styles.cuenta}>{activo ? paso.restante : ""}</Text>
        </View>
      </View>
      <Text style={styles.detalle}>
        {bloque.inhalar} s inhalar · {bloque.sostener} s sostener · {bloque.exhalar} s exhalar ·{" "}
        {bloque.repeticiones} veces
        {bloque.nota !== null
          ? ` · al exhalar suena ${nota(bloque.nota).nombre} (${nota(bloque.nota).cifrado})`
          : ""}
        {activo ? ` · vuelta ${paso.vuelta} de ${bloque.repeticiones}` : ""}
      </Text>
      <Button
        style={styles.play}
        onPress={() => {
          contextoDeAudio();
          setPaso({ fase: "inhalar", restante: bloque.inhalar, vuelta: 1 });
          setActivo(!activo);
        }}
      >
        {activo ? (
          <Pause size={16} color={buttonForeground()} />
        ) : (
          <Play size={16} color={buttonForeground()} />
        )}
        {activo ? "Detener" : "Empezar"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  opciones: {
    gap: 10,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.foreground,
  },
  escena: {
    height: 170,
    alignItems: "center",
    justifyContent: "center",
  },
  centro: {
    position: "absolute",
    alignItems: "center",
  },
  fase: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: colors.foreground,
  },
  cuenta: {
    fontFamily: fonts.display,
    fontSize: 36,
    fontVariant: ["tabular-nums"],
    color: colors.primary,
  },
  detalle: {
    textAlign: "center",
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  play: {
    alignSelf: "center",
  },
});
