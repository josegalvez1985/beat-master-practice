import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { ClaseFormDialog } from "@/components/ClaseFormDialog";
import { ClaseItem } from "@/components/ClaseItem";
import { PageMeta } from "@/components/PageMeta";
import { Button, buttonForeground } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { usePerfil } from "@/lib/auth";
import { useClasesProfesor, type Clase } from "@/lib/data";
import {
  etiquetaPeriodo,
  formatoDia,
  formatoMes,
  hoy,
  moverPeriodo,
  rango,
  sumarDias,
  type Periodo,
} from "@/lib/dates";
import { instrumento, type InstrumentId } from "@/lib/instruments";
import { colors, fonts, radius, shared } from "@/lib/theme";

const periodos = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "anio", label: "Año" },
] as const;

type Grupo = { clave: string; titulo: string; fecha: string; clases: Clase[]; hoy?: boolean };

// Week: every day. Month: only days with classes. Year: every month.
function agrupar(periodo: Periodo, inicio: string, fin: string, clases: Clase[]): Grupo[] {
  const fechaHoy = hoy();
  if (periodo === "semana") {
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = sumarDias(inicio, i);
      return {
        clave: fecha,
        titulo: formatoDia(fecha),
        fecha,
        clases: clases.filter((c) => c.fecha === fecha),
        hoy: fecha === fechaHoy,
      };
    });
  }
  if (periodo === "mes") {
    const dias = [...new Set(clases.map((c) => c.fecha))];
    return dias.map((fecha) => ({
      clave: fecha,
      titulo: formatoDia(fecha),
      fecha,
      clases: clases.filter((c) => c.fecha === fecha),
      hoy: fecha === fechaHoy,
    }));
  }
  const anio = inicio.slice(0, 4);
  return Array.from({ length: 12 }, (_, i) => {
    const mes = `${anio}-${String(i + 1).padStart(2, "0")}`;
    return {
      clave: mes,
      titulo: formatoMes(`${mes}-01`),
      fecha: `${mes}-01`,
      clases: clases.filter((c) => c.fecha.startsWith(mes) && c.fecha <= fin),
      hoy: fechaHoy.startsWith(mes),
    };
  });
}

export default function Planificacion() {
  const perfil = usePerfil();
  const clases = useClasesProfesor(perfil.uid);
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [ancla, setAncla] = useState(hoy());
  const [filtro, setFiltro] = useState<InstrumentId | null>(null);
  const [nueva, setNueva] = useState<string | null>(null);

  const [inicio, fin] = rango(periodo, ancla);
  const visibles = clases.data.filter(
    (c) => c.fecha >= inicio && c.fecha <= fin && (!filtro || c.instrumento === filtro),
  );
  const grupos = agrupar(periodo, inicio, fin, visibles);

  return (
    <>
      <PageMeta
        title="Planificación — Pulso"
        description="Planifica tus clases por semana, mes o año."
      />
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={shellStyles.pageTitle}>Planificación</Text>
          <Text style={shellStyles.pageSubtitle}>
            Arma tus clases por semana, mes o año. Tus alumnos las ven al instante.
          </Text>
        </View>
        <Button size="lg" onPress={() => setNueva(periodo === "semana" ? ancla : inicio)}>
          <Plus size={16} color={buttonForeground()} />
          Nueva clase
        </Button>
      </View>

      <View style={[shared.panel, styles.toolbar]}>
        <Segmented value={periodo} options={periodos} onChange={setPeriodo} />
        <View style={styles.periodNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Anterior"
            onPress={() => setAncla(moverPeriodo(periodo, ancla, -1))}
            style={styles.navButton}
          >
            <ChevronLeft size={18} color={colors.foreground} />
          </Pressable>
          <Text style={styles.periodLabel}>{etiquetaPeriodo(periodo, ancla)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Siguiente"
            onPress={() => setAncla(moverPeriodo(periodo, ancla, 1))}
            style={styles.navButton}
          >
            <ChevronRight size={18} color={colors.foreground} />
          </Pressable>
          <Button variant="secondary" size="sm" onPress={() => setAncla(hoy())}>
            Hoy
          </Button>
        </View>
        {perfil.instrumentos.length > 1 ? (
          <View style={styles.chips}>
            <Chip label="Todos" selected={!filtro} onPress={() => setFiltro(null)} />
            {perfil.instrumentos.map((id) => (
              <Chip
                key={id}
                label={instrumento(id).name}
                selected={filtro === id}
                onPress={() => setFiltro(id)}
              />
            ))}
          </View>
        ) : null}
      </View>

      {clases.loading ? <ActivityIndicator color={colors.primary} /> : null}

      {!clases.loading && periodo === "mes" && grupos.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No hay clases este mes"
          description="Crea la primera y, si quieres, repítela cada semana."
          action={
            <Button onPress={() => setNueva(inicio)}>
              <Plus size={16} color={buttonForeground()} />
              Nueva clase
            </Button>
          }
        />
      ) : null}

      <View style={styles.groups}>
        {grupos.map((grupo) => (
          <View key={grupo.clave} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={[styles.groupTitle, grupo.hoy && styles.groupToday]}>
                {grupo.titulo}
                {grupo.hoy && periodo !== "anio" ? " · Hoy" : ""}
              </Text>
              <Text style={styles.groupCount}>
                {grupo.clases.length} {grupo.clases.length === 1 ? "clase" : "clases"}
              </Text>
              {periodo === "semana" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Nueva clase el ${grupo.titulo}`}
                  onPress={() => setNueva(grupo.fecha)}
                  style={styles.addDay}
                >
                  <Plus size={14} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
            {grupo.clases.map((clase) => (
              <ClaseItem key={clase.id} clase={clase} />
            ))}
          </View>
        ))}
      </View>

      <ClaseFormDialog
        visible={nueva !== null}
        onClose={() => setNueva(null)}
        perfil={perfil}
        fechaInicial={nueva ?? ancla}
        instrumentoInicial={filtro}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  flex: {
    flexShrink: 1,
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
    padding: 12,
    borderRadius: radius["2xl"],
  },
  periodNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  periodLabel: {
    minWidth: 150,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  groups: {
    gap: 20,
  },
  group: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  groupToday: {
    color: colors.primary,
  },
  groupCount: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  addDay: {
    marginLeft: "auto",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
});
