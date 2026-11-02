// Profesor phone numbers: Paraguayan mobiles only, saved as +595 9XX XXX XXX ("+595981123456").
// Keep the pattern in sync with telefonoValido in firestore.rules.
export const PATRON_TELEFONO = /^\+5959\d{8}$/;

// "0981 123-456", "981123456", "+595 981 123 456" or "595981123456" → "+595981123456"; else null.
export function normalizarTelefono(texto: string) {
  const digitos = texto.replace(/\D/g, "");
  const nacional = digitos.startsWith("595")
    ? digitos.slice(3)
    : digitos.startsWith("0")
      ? digitos.slice(1)
      : digitos;
  const telefono = `+595${nacional}`;
  return PATRON_TELEFONO.test(telefono) ? telefono : null;
}

// "+595981123456" → "0981 123 456".
export const formatearTelefono = (telefono: string) => {
  const n = telefono.replace(/^\+595/, "0");
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
};

// For wa.me links: "+595981123456" → "595981123456".
export const telefonoWhatsApp = (telefono: string) => telefono.replace(/^\+/, "");
