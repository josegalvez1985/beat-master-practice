import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSearchParams } from "react-router";
import { Wrench } from "lucide-react";
import { Afinador } from "@/components/Afinador";
import { shellStyles } from "@/components/AppShell";
import { BibliotecaGrooves } from "@/components/bateria/BibliotecaGrooves";
import { EntrenadorRudimentos } from "@/components/bateria/EntrenadorRudimentos";
import { LecturaRitmica } from "@/components/bateria/LecturaRitmica";
import { MedidorTiempo } from "@/components/bateria/MedidorTiempo";
import { OidoRitmico } from "@/components/bateria/OidoRitmico";
import { Grabadora } from "@/components/Grabadora";
import { DiarioPractica } from "@/components/herramientas/Diario";
import { DiccionarioAcordes } from "@/components/herramientas/DiccionarioAcordes";
import { LecturaNotas } from "@/components/herramientas/LecturaNotas";
import { Oido } from "@/components/herramientas/Oido";
import { Metronome } from "@/components/Metronome";
import { PageMeta } from "@/components/PageMeta";
import { Opciones } from "@/components/plan/comunes";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { usePerfil, type Perfil } from "@/lib/auth";
import { useInscripcionesAlumno } from "@/lib/data";
import { herramientasPara, instrumentosDe, type HerramientaId } from "@/lib/herramientas";
import { instrumento as instrumentoDe, type InstrumentId } from "@/lib/instruments";
import { colors, fonts, radius } from "@/lib/theme";

// Practice tools for the instruments this person studies; each instrument shows only the tools
// that make sense for it (see src/lib/herramientas.ts). ?instrumento=…&h=… keep the choice in
// the URL.
export default function Herramientas() {
  const perfil = usePerfil();
  const inscripciones = useInscripcionesAlumno(perfil.uid);
  const [params, setParams] = useSearchParams();
  const alumno = perfil.rol === "alumno";
  const instrumentos = instrumentosDe(perfil.instrumentos, alumno ? inscripciones.data : []);

  if (alumno && inscripciones.loading) return <ActivityIndicator color={colors.primary} />;

  const pedido = params.get("instrumento") as InstrumentId | null;
  const instrumento = pedido && instrumentos.includes(pedido) ? pedido : instrumentos[0];
  if (!instrumento)
    return (
      <EmptyState
        icon={Wrench}
        title="No hay herramientas para mostrar"
        description="Agrega tus instrumentos en tu perfil para ver sus herramientas."
      />
    );

  // The diary is the alumno's (the rules only let alumnos write it).
  const disponibles = herramientasPara(instrumento).filter((h) => alumno || h.id !== "diario");
  const herramienta = disponibles.find((h) => h.id === params.get("h")) ?? disponibles[0]!;

  const elegir = (cambios: { instrumento?: InstrumentId; h?: HerramientaId }) =>
    setParams(
      { instrumento: cambios.instrumento ?? instrumento, h: cambios.h ?? herramienta.id },
      { replace: true },
    );

  return (
    <>
      <PageMeta
        title="Herramientas — Pulso"
        description="Afinador, metrónomo, grabadora y ejercicios para practicar tu instrumento."
      />
      <View>
        <Text style={shellStyles.pageTitle}>Herramientas</Text>
        <Text style={shellStyles.pageSubtitle}>
          {alumno ? "Para practicar" : "Para enseñar y practicar"}{" "}
          {instrumentoDe(instrumento).name.toLowerCase()}.
        </Text>
      </View>

      {instrumentos.length > 1 ? (
        <Opciones
          opciones={instrumentos.map((id) => ({ value: id, label: instrumentoDe(id).name }))}
          valor={instrumento}
          onChange={(valor) => elegir({ instrumento: valor })}
        />
      ) : null}

      <View accessibilityRole="tablist" style={styles.grilla}>
        {disponibles.map((h) => {
          const activa = h.id === herramienta.id;
          return (
            <Pressable
              key={h.id}
              accessibilityRole="tab"
              aria-selected={activa}
              onPress={() => elegir({ h: h.id })}
              style={[styles.tarjeta, activa && styles.tarjetaActiva]}
            >
              <h.icon size={20} color={activa ? colors.primary : colors.mutedForeground} />
              <View style={styles.flex}>
                <Text style={styles.tarjetaTitulo}>{h.label}</Text>
                <Text style={styles.tarjetaTexto} numberOfLines={2}>
                  {h.descripcion}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Section title={herramienta.label} subtitle={herramienta.descripcion}>
        <Contenido
          key={`${instrumento}-${herramienta.id}`}
          herramienta={herramienta.id}
          instrumento={instrumento}
          instrumentos={instrumentos}
          perfil={perfil}
        />
      </Section>
    </>
  );
}

function Contenido({
  herramienta,
  instrumento,
  instrumentos,
  perfil,
}: {
  herramienta: HerramientaId;
  instrumento: InstrumentId;
  instrumentos: InstrumentId[];
  perfil: Perfil;
}) {
  switch (herramienta) {
    case "afinador":
      return <Afinador instrumentos={[instrumento]} enPanel={false} />;
    case "metronomo":
      return <Metronome completo enPanel={false} />;
    case "tiempo":
      return <MedidorTiempo />;
    case "grooves":
      return <BibliotecaGrooves />;
    case "rudimentos":
      return <EntrenadorRudimentos />;
    case "ritmo":
      return <LecturaRitmica />;
    case "oidoRitmico":
      return <OidoRitmico />;
    case "grabadora":
      return (
        <View style={styles.grabadora}>
          <Grabadora principal />
          <Text style={styles.ayuda}>
            Grábate y escúchate más lento o en bucle; la grabación no se sube. Para enviarla a tu
            profesor, grábala desde la clase, en Tu entrega.
          </Text>
        </View>
      );
    case "acordes":
      return <DiccionarioAcordes instrumento={instrumento} />;
    case "oido":
      return <Oido instrumento={instrumento} />;
    case "lectura":
      return <LecturaNotas instrumento={instrumento} />;
    case "diario":
      return (
        <DiarioPractica
          perfil={perfil}
          instrumentos={instrumentos}
          instrumentoInicial={instrumento}
        />
      );
  }
}

const styles = StyleSheet.create({
  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tarjeta: {
    flexGrow: 1,
    flexBasis: 200,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  // Selected: amber edge + soft tint (solid amber is for the main action).
  tarjetaActiva: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  flex: {
    flex: 1,
  },
  tarjetaTitulo: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  tarjetaTexto: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  grabadora: {
    gap: 12,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
});
