// Contact form: it opens a WhatsApp chat with Pulso with the message already written (the site has
// no server of its own). Nothing is saved in Firebase; the person sends it from WhatsApp.

// WhatsApp number with country code: 0986 103 839.
export const WHATSAPP_CONTACTO = "595986103839";

export const MOTIVOS = [
  { value: "consulta", label: "Consulta" },
  { value: "cuenta", label: "Problema con mi cuenta" },
  { value: "tecnico", label: "Algo no funciona" },
  { value: "sugerencia", label: "Sugerencia" },
] as const;
export type Motivo = (typeof MOTIVOS)[number]["value"];

export type MensajeContacto = {
  nombre: string;
  documento: string;
  rol: "alumno" | "profesor" | "sin cuenta";
  motivo: Motivo;
  mensaje: string;
};

// wa.me link without a number: WhatsApp asks who to send the written message to.
export const enlaceWhatsApp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

// A profesor invites someone who has no account yet. The link opens "Crear cuenta" as alumno.
export function invitacionAlumno(profesorNombre: string) {
  const enlace = `${window.location.origin}${import.meta.env.BASE_URL}?modal=registro&rol=alumno`;
  return enlaceWhatsApp(
    [
      `Hola, soy ${profesorNombre}. Voy a compartir las clases y las prácticas por Pulso.`,
      `Crea tu cuenta gratis aquí: ${enlace}`,
      "Cuando la tengas, pásame tu número de documento y te agrego a mi lista.",
    ].join("\n\n"),
  );
}

// wa.me link with the message ready to send.
export function enlaceContacto(datos: MensajeContacto) {
  const motivo = MOTIVOS.find((m) => m.value === datos.motivo)?.label ?? "Consulta";
  const texto = [
    `Hola, soy ${datos.nombre.trim()}. ${motivo} sobre Pulso:`,
    "",
    datos.mensaje.trim(),
    "",
    `Nro. de documento: ${datos.documento || "No indicado"}`,
    `Rol: ${datos.rol}`,
    `Página: ${window.location.href}`,
  ].join("\n");
  return `https://wa.me/${WHATSAPP_CONTACTO}?text=${encodeURIComponent(texto)}`;
}
