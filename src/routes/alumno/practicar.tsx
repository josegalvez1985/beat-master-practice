import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { UserPlus, Wrench } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { Afinador } from "@/components/Afinador";
import { Link } from "@/components/Link";
import { Metronome } from "@/components/Metronome";
import { PageMeta } from "@/components/PageMeta";
import { PracticaDeHoy } from "@/components/PracticaDeHoy";
import { Button, buttonForeground } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { afinable } from "@/lib/afinador";
import { usePerfil } from "@/lib/auth";
import {
  desdeSuIngreso,
  useClasesDeInscripciones,
  useEntregasAlumno,
  useInscripcionesAlumno,
  useMetasAlumno,
  useRepertorioAlumno,
} from "@/lib/data";
import { instrumentosDe } from "@/lib/herramientas";
import { colors } from "@/lib/theme";

// "Practicar" tab: what to do today and, at hand, what is used while doing it.
export default function PracticarAhora() {
  const perfil = usePerfil();
  const { width } = useWindowDimensions();
  const lg = width >= 1024;
  const inscripciones = useInscripcionesAlumno(perfil.uid);
  const clases = useClasesDeInscripciones(inscripciones.data);
  const entregas = useEntregasAlumno(perfil.uid);
  const obras = useRepertorioAlumno(perfil.uid);
  const metas = useMetasAlumno(perfil.uid);
  const instrumentos = instrumentosDe(perfil.instrumentos, inscripciones.data);
  const afinables = instrumentos.filter(afinable);

  return (
    <>
      <PageMeta title="Practicar — Pulso" description="Tu práctica de hoy." />
      <View>
        <Text style={shellStyles.pageTitle}>Practicar</Text>
      </View>
      {inscripciones.loading || clases.loading || entregas.loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : inscripciones.data.length ? (
        <PracticaDeHoy
          alumnoId={perfil.uid}
          instrumentos={instrumentos}
          clases={desdeSuIngreso(clases.data, inscripciones.data)}
          entregas={entregas.data}
          obras={obras.data}
          metas={metas.data}
        />
      ) : (
        <EmptyState
          icon={UserPlus}
          title="Todavía no estás en la lista de un profesor"
          description="Mientras tanto, ya puedes usar el metrónomo, el afinador y las demás herramientas."
        />
      )}
      <View style={[styles.herramientas, lg && styles.enFila]}>
        {afinables.length ? (
          <View style={lg ? styles.columna : null}>
            <Afinador instrumentos={afinables} />
          </View>
        ) : null}
        <View style={lg ? styles.columna : null}>
          <Metronome />
        </View>
      </View>
      <Link href="/herramientas">
        <Button variant="secondary">
          <Wrench size={16} color={buttonForeground("secondary")} />
          Más herramientas para practicar
        </Button>
      </Link>
    </>
  );
}

const styles = StyleSheet.create({
  herramientas: {
    gap: 24,
  },
  enFila: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  columna: {
    flexGrow: 1,
    flexBasis: 0,
  },
});
