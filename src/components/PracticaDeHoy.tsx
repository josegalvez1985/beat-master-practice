import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight, CalendarCheck, Check, Play, Target } from "lucide-react";
import { Link } from "@/components/Link";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { avisar } from "@/components/ui/toast";
import { diasPracticados, minutosEntre } from "@/lib/avance";
import {
  cambiarObra,
  useDiarioAlumno,
  type Clase,
  type Entrega,
  type Meta,
  type Obra,
} from "@/lib/data";
import { formatoLargo, hoy, inicioDeSemana, rango } from "@/lib/dates";
import { instrumento } from "@/lib/instruments";
import { minutosTotales } from "@/lib/plan";
import { cuandoEs, proximaClase } from "@/lib/practica";
import type { InstrumentId } from "@/lib/instruments";
import { metasPendientes, rutinaDeHoy } from "@/lib/rutina";
import { colors, fonts, radius } from "@/lib/theme";

const TIEMPOS = [
  { value: "10", label: "10 min" },
  { value: "20", label: "20 min" },
  { value: "40", label: "40 min" },
] as const;

// "Tu práctica de hoy", the one place that says what to do: the class to practice, one tap away,
// and the routine for the time they have (see src/lib/rutina.ts). `clases`: without the ones from
// before they joined (desdeSuIngreso). The days and minutes come from the diary, so they are the
// same on every device. The chosen time is remembered in this browser.
export function PracticaDeHoy({
  alumnoId,
  instrumentos,
  clases,
  entregas,
  obras,
  metas,
}: {
  alumnoId: string;
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

  const diario = useDiarioAlumno(alumnoId);
  const [lunes, domingo] = rango("semana", hoy());
  const dias = diasPracticados(diario.data, lunes, domingo);
  const minutos = minutosEntre(diario.data, lunes, domingo);

  const clase = proximaClase(clases, entregas);
  const cuando = clase ? cuandoEs(clase.fecha) : null;
  const pasos = rutinaDeHoy({ minutos: Number(tiempo), instrumentos, clases, entregas, obras });
  const pendientes = metasPendientes(metas, inicioDeSemana(hoy()));
  if (!pasos.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>Tu práctica de hoy</Text>
        <Opciones chico opciones={TIEMPOS} valor={tiempo} onChange={elegir} />
      </View>

      {clase ? (
        <View style={styles.proxima}>
          <View style={styles.flex}>
            <Text style={styles.proximaTitulo} numberOfLines={2}>
              {clase.titulo}
            </Text>
            <Text style={styles.detalle}>
              {cuando ? (
                <Text
                  style={[styles.cuando, cuando === "Atrasada" && { color: colors.destructive }]}
                >
                  {cuando} ·{" "}
                </Text>
              ) : null}
              {formatoLargo(clase.fecha)} · {instrumento(clase.instrumento).name} · Prof.{" "}
              {clase.profesorNombre}
              {clase.bloques?.length
                ? ` · ${clase.bloques.length} bloques, ${minutosTotales(clase.bloques)} min`
                : ""}
            </Text>
          </View>
          <Link href={`/clases/${clase.id}${clase.bloques?.length ? "?practicar=1" : ""}`}>
            <Button size="lg">
              <Play size={18} color={buttonForeground()} />
              {clase.bloques?.length ? "Practicar ahora" : "Ver la clase"}
            </Button>
          </Link>
        </View>
      ) : (
        <View style={styles.alDia}>
          <CalendarCheck size={20} color={colors.success} />
          <Text style={styles.detalle}>¡Estás al día con tus clases! Repasa cuando quieras.</Text>
        </View>
      )}

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

      <Text style={styles.semana}>
        Esta semana: {dias} de 7 días · {minutos} min
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
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
  proxima: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  proximaTitulo: {
    fontFamily: fonts.headingBold,
    fontSize: 24,
    lineHeight: 29,
    color: colors.foreground,
  },
  cuando: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  alDia: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
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
    minWidth: 200,
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
  semana: {
    paddingTop: 4,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    color: colors.mutedForeground,
  },
});
