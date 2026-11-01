import type { Clase } from "@/lib/data";
import { instrumento } from "@/lib/instruments";
import { SITE_URL } from "@/lib/site";

// "Add to calendar" for a class with a time: a Google Calendar link and an .ics file (Apple,
// Outlook), both with a reminder one hour before. Nothing is stored: the reminder lives in the
// person's own calendar.

const ZONA = "America/Asuncion";

const compacta = (fecha: string, hora: string) =>
  `${fecha.replaceAll("-", "")}T${hora.replace(":", "")}00`;

function fin(fecha: string, hora: string, minutos: number) {
  const [h, m] = hora.split(":").map(Number);
  const inicio = new Date(`${fecha}T00:00:00`);
  inicio.setHours(h!, m! + minutos);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${inicio.getFullYear()}${pad(inicio.getMonth() + 1)}${pad(inicio.getDate())}T${pad(inicio.getHours())}${pad(inicio.getMinutes())}00`;
}

function datos(clase: Clase) {
  const minutos = clase.ficha?.duracion ?? 60;
  const titulo = clase.evento
    ? `Recital: ${clase.titulo}`
    : `Clase de ${instrumento(clase.instrumento).name.toLowerCase()}: ${clase.titulo}`;
  const lugar =
    clase.evento?.lugar || (clase.modalidad === "virtual" ? (clase.enlace ?? "Virtual") : "");
  const detalle = [
    `Prof. ${clase.profesorNombre}`,
    clase.enlace ? `Enlace: ${clase.enlace}` : "",
    `${SITE_URL}/clases/${clase.id}`,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    titulo,
    lugar,
    detalle,
    inicio: compacta(clase.fecha, clase.hora!),
    fin: fin(clase.fecha, clase.hora!, minutos),
  };
}

export function enlaceGoogle(clase: Clase) {
  const d = datos(clase);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: d.titulo,
    dates: `${d.inicio}/${d.fin}`,
    ctz: ZONA,
    details: d.detalle,
    location: d.lugar,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const escapar = (texto: string) => texto.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

export function archivoIcs(clase: Clase) {
  const d = datos(clase);
  const texto = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pulso//Clases//ES",
    "BEGIN:VEVENT",
    `UID:${clase.id}@pypulso.online`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=${ZONA}:${d.inicio}`,
    `DTEND;TZID=${ZONA}:${d.fin}`,
    `SUMMARY:${escapar(d.titulo)}`,
    `DESCRIPTION:${escapar(d.detalle)}`,
    ...(d.lugar ? [`LOCATION:${escapar(d.lugar)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(d.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return {
    url: `data:text/calendar;charset=utf-8,${encodeURIComponent(texto)}`,
    nombre: `pulso-${clase.fecha}.ics`,
  };
}
