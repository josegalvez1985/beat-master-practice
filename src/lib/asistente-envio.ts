import { httpsCallable } from "firebase/functions";
import arquitectura from "../../docs/arquitectura.md?raw";
import diseno from "../../docs/diseno.md?raw";
import { functions } from "@/lib/firebase";

// Loaded on the first question (dynamic import from asistente.ts): the usage guide and the
// Cloud Functions client do not weigh on the first page load.

// A section of a guide, from its heading to the next one of the same or a higher level.
function seccion(md: string, titulo: string) {
  const texto = md.replace(/\r\n/g, "\n");
  const inicio = texto.indexOf("\n" + titulo + "\n");
  if (inicio < 0) return "";
  const nivel = titulo.indexOf(" ");
  const resto = texto.slice(inicio + 1);
  const fin = resto.slice(titulo.length).search(new RegExp(`\\n#{1,${nivel}} `));
  return fin < 0 ? resto : resto.slice(0, titulo.length + fin);
}

// What the assistant knows about using Pulso: every screen, how progress is counted and the
// practice tools. It changes with each deploy of the site, without touching the function. Link
// targets (file paths) are dropped: the assistant must not talk about files.
const GUIA = [
  seccion(diseno, "## Pantallas"),
  seccion(arquitectura, "## Progreso"),
  seccion(arquitectura, "## Herramientas de práctica"),
]
  .join("\n\n")
  .replace(/\]\([^)]*\)/g, "]");

type Respuesta = { respuesta: string; usadasHoy: number; limite: number };

const llamar = httpsCallable<
  {
    pregunta: string;
    historial: { rol: "usuario" | "asistente"; texto: string }[];
    guia: string;
    pantalla: string;
  },
  Respuesta
>(functions, "preguntarAsistente", { timeout: 130_000 });

export async function enviarPregunta(datos: {
  pregunta: string;
  historial: { rol: "usuario" | "asistente"; texto: string }[];
  pantalla: string;
}) {
  return (await llamar({ ...datos, guia: GUIA })).data;
}
