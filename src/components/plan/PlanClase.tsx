import { Editor } from "@/components/plan/Editor";
import { Practica } from "@/components/plan/Practica";
import type { Clase } from "@/lib/data";
import { fichaInicial } from "@/lib/plan";

// Lesson plan of a class: the profesor builds it (autosaved), the alumno practices it.
// `soloLectura`: the profesor whose plan is blocked sees it like the student view, without
// editing or marking anything (alumnoId null).
export function PlanClase({
  clase,
  esDueno,
  soloLectura = false,
  alumnoId,
}: {
  clase: Clase;
  esDueno: boolean;
  soloLectura?: boolean;
  alumnoId: string;
}) {
  if (esDueno && !soloLectura) return <Editor key={clase.id} clase={clase} />;
  if (!clase.bloques?.length) return null;
  return (
    <Practica
      clase={clase}
      plan={{ ficha: clase.ficha ?? fichaInicial(clase.instrumento), bloques: clase.bloques }}
      alumnoId={esDueno ? null : alumnoId}
    />
  );
}
