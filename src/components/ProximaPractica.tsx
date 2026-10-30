import { StyleSheet, Text, View } from "react-native";
import { CalendarCheck, Flame, Play, Timer } from "lucide-react";
import { Link } from "@/components/Link";
import { Button, buttonForeground } from "@/components/ui/button";
import type { Clase, Entrega } from "@/lib/data";
import { formatoLargo } from "@/lib/dates";
import { instrumento } from "@/lib/instruments";
import { minutosTotales } from "@/lib/plan";
import { cuandoEs, minutosDeLaSemana, proximaClase, racha, usePractica } from "@/lib/practica";
import { colors, fonts, radius } from "@/lib/theme";

// Alumno home hero: the next class to practice, one tap away, plus streak and weekly minutes.
export function ProximaPractica({
  alumnoId,
  clases,
  entregas,
}: {
  alumnoId: string;
  clases: Clase[];
  entregas: Entrega[];
}) {
  const registros = usePractica(alumnoId);
  const clase = proximaClase(clases, entregas);
  const dias = racha(registros);
  const minutos = minutosDeLaSemana(registros);
  const cuando = clase ? cuandoEs(clase.fecha) : null;

  return (
    <View style={styles.card}>
      <View style={styles.principal}>
        <Text style={styles.etiqueta}>Tu próxima práctica</Text>
        {clase ? (
          <>
            <Text style={styles.titulo} numberOfLines={2}>
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
            </Text>
            {clase.bloques?.length ? (
              <Text style={styles.detalle}>
                {clase.bloques.length} bloques · {minutosTotales(clase.bloques)} min
              </Text>
            ) : null}
            <View style={styles.acciones}>
              <Link href={`/clases/${clase.id}${clase.bloques?.length ? "?practicar=1" : ""}`}>
                <Button size="lg">
                  <Play size={18} color={buttonForeground()} />
                  {clase.bloques?.length ? "Practicar ahora" : "Ver la clase"}
                </Button>
              </Link>
            </View>
          </>
        ) : (
          <View style={styles.alDia}>
            <CalendarCheck size={22} color={colors.success} />
            <Text style={styles.titulo}>¡Estás al día!</Text>
            <Text style={styles.detalle}>Entregaste todas tus clases. Repasa cuando quieras.</Text>
          </View>
        )}
      </View>
      <View style={styles.stats}>
        <Dato icono={Flame} valor={dias} texto={dias === 1 ? "día seguido" : "días seguidos"} />
        <Dato icono={Timer} valor={minutos} texto="min esta semana" />
      </View>
    </View>
  );
}

function Dato({
  icono: Icono,
  valor,
  texto,
}: {
  icono: typeof Flame;
  valor: number;
  texto: string;
}) {
  return (
    <View style={styles.dato}>
      <Icono size={20} color={valor ? colors.primary : colors.mutedForeground} />
      <Text style={styles.datoValor}>{valor}</Text>
      <Text style={styles.datoTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    padding: 22,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  principal: {
    flex: 1,
    minWidth: 260,
    gap: 6,
  },
  etiqueta: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primary,
  },
  titulo: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.foreground,
  },
  detalle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  cuando: {
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  acciones: {
    marginTop: 10,
    flexDirection: "row",
  },
  alDia: {
    gap: 6,
  },
  stats: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "center",
  },
  dato: {
    width: 120,
    alignItems: "center",
    gap: 2,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  datoValor: {
    fontFamily: fonts.display,
    fontSize: 34,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  datoTexto: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
  },
});
