// Dates are stored as "YYYY-MM-DD" strings (local calendar days, no time zone).

export type Periodo = "semana" | "mes" | "anio";

const pad = (n: number) => String(n).padStart(2, "0");

export function aFecha(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function deFecha(fecha: string) {
  const [y = 0, m = 1, d = 1] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const hoy = () => aFecha(new Date());

export function sumarDias(fecha: string, dias: number) {
  const date = deFecha(fecha);
  date.setDate(date.getDate() + dias);
  return aFecha(date);
}

// Weeks start on Monday.
export function inicioDeSemana(fecha: string) {
  const date = deFecha(fecha);
  return sumarDias(fecha, -((date.getDay() + 6) % 7));
}

// First and last day of the period that contains `fecha`.
export function rango(periodo: Periodo, fecha: string): [string, string] {
  const date = deFecha(fecha);
  if (periodo === "semana") {
    const inicio = inicioDeSemana(fecha);
    return [inicio, sumarDias(inicio, 6)];
  }
  if (periodo === "mes") {
    return [
      aFecha(new Date(date.getFullYear(), date.getMonth(), 1)),
      aFecha(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
    ];
  }
  return [`${date.getFullYear()}-01-01`, `${date.getFullYear()}-12-31`];
}

// Same day in the previous (-1) or next (+1) period.
export function moverPeriodo(periodo: Periodo, fecha: string, paso: number) {
  const date = deFecha(fecha);
  if (periodo === "semana") return sumarDias(fecha, 7 * paso);
  if (periodo === "mes") return aFecha(new Date(date.getFullYear(), date.getMonth() + paso, 1));
  return aFecha(new Date(date.getFullYear() + paso, 0, 1));
}

// Every `cadaDias` days from `desde` until `hasta` (inclusive), at most `max` dates.
export function repetir(desde: string, hasta: string, cadaDias = 7, max = 60) {
  const fechas: string[] = [];
  for (let f = desde; f <= hasta && fechas.length < max; f = sumarDias(f, cadaDias)) fechas.push(f);
  return fechas;
}

const formato = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es", options);
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export const formatoDia = (fecha: string) =>
  capitalizar(formato({ weekday: "short", day: "numeric", month: "short" }).format(deFecha(fecha)));
export const formatoLargo = (fecha: string) =>
  capitalizar(
    formato({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
      deFecha(fecha),
    ),
  );
export const mesCorto = (fecha: string) =>
  formato({ month: "short" }).format(deFecha(fecha)).replace(".", "");
export const formatoMes = (fecha: string) =>
  capitalizar(formato({ month: "long", year: "numeric" }).format(deFecha(fecha)));

export function etiquetaPeriodo(periodo: Periodo, fecha: string) {
  const [inicio, fin] = rango(periodo, fecha);
  if (periodo === "anio") return inicio.slice(0, 4);
  if (periodo === "mes") return formatoMes(inicio);
  return `${formatoDia(inicio)} – ${formatoDia(fin)}`;
}
