import { Editor } from "@/components/plan/Editor";
import { Practica } from "@/components/plan/Practica";
import type { Clase } from "@/lib/data";
import { fichaInicial } from "@/lib/plan";

// Lesson plan of a class: the profesor builds it (autosaved), the alumno practices it.
export function PlanClase({
  clase,
  esDueno,
  alumnoId,
}: {
  clase: Clase;
  esDueno: boolean;
  alumnoId: string;
}) {
  if (esDueno) return <Editor key={clase.id} clase={clase} />;
  if (!clase.bloques?.length) return null;
  return (
    <Practica
      clase={clase}
      plan={{ ficha: clase.ficha ?? fichaInicial(clase.instrumento), bloques: clase.bloques }}
      alumnoId={alumnoId}
    />
  );
}
