import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, Inbox, SkipForward } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { EntregaRevision, MensajesPlegables } from "@/components/EntregaRevision";
import { Link } from "@/components/Link";
import { PageMeta } from "@/components/PageMeta";
import { usePlanProfesor } from "@/components/PlanAviso";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonForeground } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, Section } from "@/components/ui/section";
import { usePerfil } from "@/lib/auth";
import {
  mensajesSinLeer,
  sinRevisar,
  useClasesProfesor,
  useEntregasProfesor,
  useMensajesRecientes,
  usePracticasDeProfesor,
} from "@/lib/data";
import { formatoDia } from "@/lib/dates";
import { instrumento } from "@/lib/instruments";
import { colors, fonts, radius } from "@/lib/theme";

// Review tray: the deliveries not reviewed yet, the oldest first, one at a time.
export default function Revision() {
  const perfil = usePerfil();
  const entregas = useEntregasProfesor(perfil.uid);
  const clases = useClasesProfesor(perfil.uid);
  const practicas = usePracticasDeProfesor(perfil.uid);
  const mensajes = useMensajesRecientes("profesorId", perfil.uid);
  const plan = usePlanProfesor(perfil.uid);
  const [elegida, setElegida] = useState<string | null>(null);
  const [saltadas, setSaltadas] = useState<string[]>([]);

  const pendientes = entregas.data
    .filter(sinRevisar)
    .sort((a, b) => (a.actualizadoEn?.toMillis() ?? 0) - (b.actualizadoEn?.toMillis() ?? 0));
  // Skipped ones go to the end of the queue, not out of it.
  const cola = [
    ...pendientes.filter((e) => !saltadas.includes(e.id)),
    ...pendientes.filter((e) => saltadas.includes(e.id)),
  ];
  const actual = cola.find((e) => e.id === elegida) ?? cola[0];
  const clase = actual && clases.data.find((c) => c.id === actual.claseId);
  const cargando = entregas.loading || clases.loading;

  const saltar = () => {
    if (!actual) return;
    setSaltadas((lista) => [...lista.filter((id) => id !== actual.id), actual.id]);
    setElegida(null);
  };

  return (
    <>
      <PageMeta title="Por revisar — Pulso" description="Las entregas que faltan revisar." />
      <Link href="/">
        <Text style={styles.back}>
          <ChevronLeft size={14} color={colors.primary} /> Inicio
        </Text>
      </Link>
      <View>
        <Text style={shellStyles.pageTitle}>Por revisar</Text>
        <Text style={shellStyles.pageSubtitle}>
          {cargando
            ? "Buscando entregas…"
            : pendientes.length
              ? `${pendientes.length} ${pendientes.length === 1 ? "entrega" : "entregas"}, de la más antigua a la más nueva.`
              : "No tienes entregas pendientes."}
        </Text>
      </View>

      {cargando ? <ActivityIndicator color={colors.primary} /> : null}
      {!cargando && !actual ? (
        <EmptyState
          icon={Inbox}
          title="¡Todo revisado!"
          description="Cuando un alumno entregue algo nuevo, aparecerá aquí."
        />
      ) : null}

      {actual && clase ? (
        <Section
          title={actual.alumnoNombre}
          subtitle={`${clase.titulo} · ${formatoDia(clase.fecha)} · ${instrumento(clase.instrumento).name}`}
          actions={
            cola.length > 1 ? (
              <Button variant="secondary" onPress={saltar}>
                <SkipForward size={16} color={buttonForeground("secondary")} />
                Después
              </Button>
            ) : null
          }
        >
          <EntregaRevision
            key={actual.id}
            clase={clase}
            entrega={actual}
            practica={practicas.data.find(
              (p) => p.claseId === actual.claseId && p.alumnoId === actual.alumnoId,
            )}
            puedeSubir={!plan.bloqueado}
            alMarcar={() => setElegida(null)}
          />
          <MensajesPlegables
            key={`mensajes-${actual.id}`}
            clase={clase}
            alumnoId={actual.alumnoId}
            alumnoNombre={actual.alumnoNombre}
            perfil={perfil}
            sinLeer={
              mensajesSinLeer(mensajes.data, perfil.uid).filter(
                (m) => m.claseId === actual.claseId && m.alumnoId === actual.alumnoId,
              ).length
            }
          />
        </Section>
      ) : null}

      {cola.length > 1 ? (
        <Section title="En la cola">
          {cola.map((e) => {
            const suClase = clases.data.find((c) => c.id === e.claseId);
            return (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                aria-current={e.id === actual?.id ? "true" : undefined}
                onPress={() => setElegida(e.id)}
                style={[styles.fila, e.id === actual?.id && styles.filaActual]}
              >
                <Avatar nombre={e.alumnoNombre} size={32} />
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={styles.nombre}>
                    {e.alumnoNombre}
                  </Text>
                  <Text numberOfLines={1} style={styles.detalle}>
                    {suClase?.titulo ?? "Clase"}
                  </Text>
                </View>
                {e.id === actual?.id ? <Badge label="Ahora" tone="primary" /> : null}
              </Pressable>
            );
          })}
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  back: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.muted,
  },
  filaActual: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  detalle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
