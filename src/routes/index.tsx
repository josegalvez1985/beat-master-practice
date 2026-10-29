import { usePerfil } from "@/lib/auth";
import AlumnoInicio from "@/routes/alumno/inicio";
import ProfesorInicio from "@/routes/profesor/inicio";

// "/" shows each role its own home.
export default function Inicio() {
  const perfil = usePerfil();
  return perfil.rol === "profesor" ? <ProfesorInicio /> : <AlumnoInicio />;
}
