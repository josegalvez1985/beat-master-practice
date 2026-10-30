import { ActivityIndicator } from "react-native";
import { Navigate } from "react-router";
import { CalendarCheck } from "lucide-react";
import { Link } from "@/components/Link";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePerfil } from "@/lib/auth";
import { useClasesDeInscripciones, useEntregasAlumno, useInscripcionesAlumno } from "@/lib/data";
import { proximaClase } from "@/lib/practica";
import { colors } from "@/lib/theme";

// "Practicar" tab: straight to the next class's practice mode.
export default function PracticarAhora() {
  const perfil = usePerfil();
  const inscripciones = useInscripcionesAlumno(perfil.uid);
  const clases = useClasesDeInscripciones(inscripciones.data);
  const entregas = useEntregasAlumno(perfil.uid);

  if (inscripciones.loading || clases.loading || entregas.loading)
    return <ActivityIndicator color={colors.primary} />;

  const clase = proximaClase(clases.data, entregas.data);
  if (clase)
    return (
      <Navigate to={`/clases/${clase.id}${clase.bloques?.length ? "?practicar=1" : ""}`} replace />
    );

  return (
    <>
      <PageMeta title="Practicar — Pulso" description="Tu próxima práctica." />
      <EmptyState
        icon={CalendarCheck}
        title="No tienes prácticas pendientes"
        description="Cuando tu profesor publique una clase nueva, la encontrarás aquí."
      />
      <Link href="/">
        <Button variant="secondary">Volver al inicio</Button>
      </Link>
    </>
  );
}
