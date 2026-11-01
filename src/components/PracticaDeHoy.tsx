import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight, Check, Target } from "lucide-react";
import { Link } from "@/components/Link";
import { Opciones } from "@/components/plan/comunes";
import { avisar } from "@/components/ui/toast";
import { cambiarObra, type Clase, type Entrega, type Meta, type Obra } from "@/lib/data";
import { hoy, inicioDeSemana } from "@/lib/dates";
import type { InstrumentId } from "@/lib/instruments";
import { metasPendientes, rutinaDeHoy } from "@/lib/rutina";
import { colors, fonts, radius } from "@/lib/theme";

const TIEMPOS = [
  { value: "10", label: "10 min" },
  { value: "20", label: "20 min" },
  { value: "40", label: "40 min" },
] as const;

// "Tu práctica de hoy": tell it how much time you have and it builds the routine (see
// src/lib/rutina.ts). The chosen time is remembered in this browser.
export function PracticaDeHoy({
  instrumentos,
  clases,
  entregas,
  obras,
  metas,
}: {
  instrumentos: InstrumentId[];
  clases: Clase[];
  entregas: Entrega[];
  obras: Obra[];
  metas: Meta[];
}) {
  const [tiempo, setTiempo] = useState<(typeof TIEMPOS)[number]["value"]>(() => {
    try {
      const guardado = localStorage.getItem("pulso-tiempo-practica");
      return guardado === "10" || guardado === "40" ? guardado : "20";
    } catch {
      return "20";
    }
  });
  const elegir = (valor: (typeof TIEMPOS)[number]["value"]) => {
    setTiempo(valor);
    try {
      localStorage.setItem("pulso-tiempo-practica", valor);
    } catch {
      // Blocked storage: it only is not remembered.
    }
  };

  const pasos = rutinaDeHoy({ minutos: Number(tiempo), instrumentos, clases, entregas, obras });
  const pendientes = metasPendientes(metas, inicioDeSemana(hoy()));
  if (!pasos.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>Tu práctica de hoy</Text>
        <Opciones chico opciones={TIEMPOS} valor={tiempo} onChange={elegir} />
      </View>
      {pasos.map((paso, i) => {
        const contenido = (
          <>
            <Text style={styles.numero}>{i + 1}</Text>
            <View style={styles.flex}>
              <Text style={styles.pasoTitulo} numberOfLines={1}>
                {paso.titulo}
              </Text>
              <Text style={styles.detalle}>{paso.detalle}</Text>
            </View>
            <Text style={styles.minutos}>{paso.minutos} min</Text>
          </>
        );
        if (paso.href)
          return (
            <Link key={paso.id} href={paso.href}>
              <Pressable style={styles.paso}>
                {contenido}
                <ArrowRight size={16} color={colors.mutedForeground} />
              </Pressable>
            </Link>
          );
        return (
          <View key={paso.id} style={styles.paso}>
            {contenido}
            {paso.obra ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Repasé ${paso.obra.obra}`}
                onPress={() =>
                  void cambiarObra(paso.obra!.id, { repasadoEn: hoy() }).catch(() =>
                    avisar({ texto: "No se pudo guardar.", tipo: "error" }),
                  )
                }
                style={styles.repasado}
              >
                <Check size={14} color={colors.foreground} />
                <Text style={styles.repasadoTexto}>Hecho</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {pendientes.length ? (
        <View style={styles.metas}>
          <Target size={14} color={colors.mutedForeground} />
          <Text style={styles.detalle}>
            Metas de esta semana: {pendientes.map((m) => m.texto).join(" · ")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cabecera: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.foreground,
  },
  paso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  numero: {
    width: 22,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.mutedForeground,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  pasoTitulo: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  detalle: {
    flexShrink: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
  minutos: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  repasado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repasadoTexto: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.foreground,
  },
  metas: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
});
