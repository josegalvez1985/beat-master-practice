// Cédula / document number helpers.

// Keeps only digits, so "1.234.567" and "1234567" are the same document.
export function normalizarDocumento(value: string) {
  return value.replace(/\D/g, "");
}

export function documentoValido(nroDocumento: string) {
  return /^[0-9]{5,10}$/.test(nroDocumento);
}

// "1234567" -> "1.234.567"
export function formatearDocumento(nroDocumento: string) {
  return nroDocumento.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Lowercase, no accents: "José Pérez" -> "jose perez".
export function normalizarTexto(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

// Every prefix (2+ letters) of every word of the name, so profesores can find
// an alumno by typing the start of any of their names with `array-contains`.
export function terminosDeBusqueda(nombre: string) {
  const terminos = new Set<string>();
  for (const palabra of normalizarTexto(nombre).split(" ")) {
    for (let i = 2; i <= Math.min(palabra.length, 20); i++) terminos.add(palabra.slice(0, i));
  }
  return [...terminos].slice(0, 100);
}
