// Contact form: the message goes by email to Pulso through Web3Forms (the site has no server of
// its own). Nothing is saved in Firebase. The access key is public by design: it only lets
// someone send to the address it was created for. Get it at web3forms.com and set
// VITE_WEB3FORMS_KEY in .env.

export const CORREO_CONTACTO = "jose.jgalvez@gmail.com";

export const MOTIVOS = [
  { value: "consulta", label: "Consulta" },
  { value: "cuenta", label: "Problema con mi cuenta" },
  { value: "tecnico", label: "Algo no funciona" },
  { value: "sugerencia", label: "Sugerencia" },
] as const;
export type Motivo = (typeof MOTIVOS)[number]["value"];

export type MensajeContacto = {
  nombre: string;
  correo: string;
  documento: string;
  rol: "alumno" | "profesor" | "sin cuenta";
  motivo: Motivo;
  mensaje: string;
};

export const correoValido = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim());

export async function enviarContacto(datos: MensajeContacto) {
  const clave = import.meta.env.VITE_WEB3FORMS_KEY;
  if (!clave) throw new Error("El formulario de contacto todavía no está configurado.");
  const motivo = MOTIVOS.find((m) => m.value === datos.motivo)?.label ?? "Consulta";
  const respuesta = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: clave,
      subject: `Pulso · ${motivo} de ${datos.nombre || "un visitante"}`,
      from_name: "Pulso (www.pypulso.online)",
      // Web3Forms answers to this address when replying from the inbox.
      email: datos.correo.trim(),
      name: datos.nombre.trim() || "Sin nombre",
      "Nro. de documento": datos.documento || "No indicado",
      Rol: datos.rol,
      Motivo: motivo,
      Página: window.location.href,
      message: datos.mensaje.trim(),
    }),
  }).catch(() => null);
  if (!respuesta) throw new Error("No hay conexión. Revisa tu internet y vuelve a intentar.");
  const resultado = (await respuesta.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
  } | null;
  if (!respuesta.ok || !resultado?.success)
    throw new Error("No se pudo enviar el mensaje. Vuelve a intentar en unos minutos.");
}
