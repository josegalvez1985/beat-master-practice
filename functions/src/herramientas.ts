import type Anthropic from "@anthropic-ai/sdk";
import { getFirestore, type DocumentData, type Query } from "firebase-admin/firestore";

// What the assistant can read: fixed, read-only searches, always scoped to the person asking.
// The Admin SDK skips the security rules, so every search filters by the user's own id here:
// an alumno reads their lists, classes, deliveries, diary and records; a profesor, their
// students and classes. The model never writes and never sees collections or other users.

export type Rol = "alumno" | "profesor";

// A search that cannot run (missing or someone else's data): the message goes back to the model.
export class ErrorHerramienta extends Error {}

const db = () => getFirestore();

const MAX_CLASES = 40;
const INSTRUMENTOS: Record<string, string> = {
  guitarra: "Guitarra",
  arpa: "Arpa paraguaya",
  piano: "Piano",
  bateria: "Batería",
  voz: "Voz",
  bajo: "Bajo",
  violin: "Violín",
  acordeon: "Acordeón",
  ukelele: "Ukelele",
  saxofon: "Saxofón",
  flauta: "Flauta",
  requinto: "Requinto",
  teclado: "Teclado",
  trompeta: "Trompeta",
  violonchelo: "Violonchelo",
  contrabajo: "Contrabajo",
  percusion: "Percusión",
};
const nombreInstrumento = (id: string) => INSTRUMENTOS[id] ?? id;

// --- Dates in Paraguay (classes are stored as YYYY-MM-DD local days) ---

export const fechaParaguay = (fecha = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion" }).format(fecha);

const sumarDias = (fecha: string, dias: number) => {
  const [y = 0, m = 1, d = 1] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + dias));
  return date.toISOString().slice(0, 10);
};

const inicioDeSemana = (fecha: string) => {
  const [y = 0, m = 1, d = 1] = fecha.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return sumarDias(fecha, -((dia + 6) % 7));
};

// --- Reads ---

type Clase = DocumentData & { id: string };

const leer = async (consulta: Query): Promise<Clase[]> =>
  (await consulta.get()).docs.map((d) => ({ id: d.id, ...d.data() }));

const inscripcionesDeAlumno = (uid: string) =>
  leer(db().collection("inscripciones").where("alumnoId", "==", uid));
const inscripcionesDeProfesor = (uid: string) =>
  leer(db().collection("inscripciones").where("profesorId", "==", uid));
const clasesDe = (profesorId: string, instrumento?: string) => {
  let consulta = db().collection("clases").where("profesorId", "==", profesorId);
  if (instrumento) consulta = consulta.where("instrumento", "==", instrumento);
  return leer(consulta);
};
const entregasDeAlumno = (uid: string) =>
  leer(db().collection("entregas").where("alumnoId", "==", uid));
const entregasDeProfesor = (uid: string) =>
  leer(db().collection("entregas").where("profesorId", "==", uid));

// The class is for this alumno (without `alumnos`, for the whole list). As esParaAlumno in the app.
const esParaAlumno = (c: DocumentData, alumnoId: string) =>
  !Array.isArray(c.alumnos) || c.alumnos.includes(alumnoId);

const ingresoDe = (i: DocumentData) =>
  i.creadoEn?.toDate ? fechaParaguay(i.creadoEn.toDate()) : "";

// Same formula as the app (src/lib/data.ts, progreso): of the classes due since the alumno joined,
// how many they delivered. Future classes do not count.
function progreso(clases: Clase[], entregas: DocumentData[], inscripcion: DocumentData) {
  const hoy = fechaParaguay();
  const desde = ingresoDe(inscripcion);
  const entregadas = new Set(
    entregas.filter((e) => e.alumnoId === inscripcion.alumnoId).map((e) => e.claseId as string),
  );
  const cuentan = clases.filter(
    (c) =>
      c.instrumento === inscripcion.instrumento &&
      c.profesorId === inscripcion.profesorId &&
      esParaAlumno(c, inscripcion.alumnoId) &&
      (entregadas.has(c.id) || (c.fecha >= desde && c.fecha <= hoy)),
  );
  const hechas = cuentan.filter((c) => entregadas.has(c.id)).length;
  return {
    clasesEntregadas: hechas,
    clasesQueYaCorrespondian: cuentan.length,
    porcentaje: cuentan.length ? Math.round((hechas / cuentan.length) * 100) : 0,
  };
}

// A block of the lesson plan, in words (no alphaTex, no file paths).
function bloqueEnPalabras(b: DocumentData) {
  const base = { tipo: b.tipo, etapa: b.etapa, titulo: b.titulo, minutos: b.minutos };
  const notas = typeof b.notas === "string" && b.notas ? { notas: b.notas.slice(0, 400) } : {};
  switch (b.tipo) {
    case "acordes":
      return { ...base, ...notas, acordes: b.acordes };
    case "rasgueo":
      return {
        ...base,
        ...notas,
        compas: b.compas,
        bpm: b.bpm,
        golpes: (b.golpes ?? []).join(" "),
      };
    case "tempo":
      return { ...base, ...notas, bpmInicio: b.inicio, bpmObjetivo: b.objetivo, subirDeA: b.paso };
    case "rudimento":
      return {
        ...base,
        ...notas,
        rudimento: b.rudimento,
        bpmInicio: b.inicio,
        bpmObjetivo: b.objetivo,
      };
    case "groove":
      return { ...base, ...notas, compas: b.compas, bpm: b.bpm, compases: b.compases };
    case "youtube":
      return { ...base, ...notas, video: b.url };
    case "partitura":
      return { ...base, ...notas, contenido: "partitura escrita con sonido" };
    case "escala":
      return {
        ...base,
        ...notas,
        tonica: ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"][
          b.tonica
        ],
        escala: b.escala,
        octavas: b.octavas,
        bpm: b.bpm,
      };
    case "respiracion":
      return {
        ...base,
        ...notas,
        segundos: { inhalar: b.inhalar, sostener: b.sostener, exhalar: b.exhalar },
        repeticiones: b.repeticiones,
        conNotaLarga: b.nota !== null,
      };
    case "archivos":
      return { ...base, ...notas, archivos: (b.archivos ?? []).map((a: DocumentData) => a.nombre) };
    default:
      return { ...base, ...notas };
  }
}

const claseEnLista = (c: Clase, entregada?: boolean) => ({
  claseId: c.id,
  fecha: c.fecha,
  titulo: c.titulo,
  instrumento: nombreInstrumento(c.instrumento),
  profesor: c.profesorNombre,
  bloques: (c.bloques ?? []).length,
  minutos: (c.bloques ?? []).reduce((t: number, b: DocumentData) => t + (b.minutos || 0), 0),
  ...(entregada === undefined ? {} : { entregada }),
});

const claseEnDetalle = (c: Clase) => ({
  fecha: c.fecha,
  titulo: c.titulo,
  instrumento: nombreInstrumento(c.instrumento),
  profesor: c.profesorNombre,
  objetivosYTarea: c.descripcion || null,
  ficha: c.ficha ?? null,
  plan: (c.bloques ?? []).map(bloqueEnPalabras),
  materiales: (c.materiales ?? []).map((m: DocumentData) => m.nombre),
});

const entregaEnPalabras = (e: DocumentData) => ({
  archivos: (e.archivos ?? []).map((a: DocumentData) => a.nombre),
  comentarioDelAlumno: e.comentario || null,
  comentariosDelProfesor: (e.devoluciones ?? []).map((d: DocumentData) => ({
    enElSegundo: d.segundo,
    texto: d.texto || "(respuesta grabada en audio o video)",
  })),
  actualizada: e.actualizadoEn?.toDate?.().toISOString().slice(0, 10) ?? null,
});

function enRango(c: Clase, desde?: string, hasta?: string) {
  return (!desde || c.fecha >= desde) && (!hasta || c.fecha <= hasta);
}

// --- Tool definitions ---

const fecha = { type: "string", description: "Fecha AAAA-MM-DD (opcional)" } as const;
const instrumento = {
  type: "string",
  description: "Id del instrumento (opcional): " + Object.keys(INSTRUMENTOS).join(", "),
} as const;
const objeto = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object" as const,
  properties,
  required,
  additionalProperties: false,
});

const COMUNES: Anthropic.Beta.BetaTool[] = [
  {
    name: "mi_resumen",
    description:
      "Resumen de la persona: sus instrumentos, su avance y lo próximo. Úsalo primero para preguntas generales sobre su situación.",
    input_schema: objeto({}),
  },
  {
    name: "mis_clases",
    description:
      "Clases de la persona en un rango de fechas (máximo 40, ordenadas por fecha). Sin fechas: desde hace 2 semanas hasta dentro de 4.",
    input_schema: objeto({
      desde: fecha,
      hasta: fecha,
      instrumento,
      solo_pendientes: { type: "boolean", description: "Alumno: solo las clases sin entrega" },
    }),
  },
  {
    name: "ver_clase",
    description:
      "Detalle de una clase (objetivos, ficha, plan bloque por bloque, materiales) y su entrega o entregas. Necesita el claseId que devuelven las otras búsquedas.",
    input_schema: objeto({ clase_id: { type: "string" } }, ["clase_id"]),
  },
];

const DE_ALUMNO: Anthropic.Beta.BetaTool[] = [
  {
    name: "mi_diario",
    description:
      "Lo que el alumno anotó en su diario de práctica (fecha, instrumento, minutos, comentario), su meta semanal y sus récords de rudimentos.",
    input_schema: objeto({
      dias: { type: "integer", description: "Cuántos días hacia atrás (1-60)" },
    }),
  },
];

const DE_PROFESOR: Anthropic.Beta.BetaTool[] = [
  {
    name: "mis_alumnos",
    description:
      "Alumnos del profesor con su avance por instrumento. Se puede filtrar por instrumento o por nombre.",
    input_schema: objeto({
      instrumento,
      buscar: { type: "string", description: "Parte del nombre" },
    }),
  },
  {
    name: "ver_alumno",
    description:
      "Detalle de un alumno del profesor: avance, entregas recientes, minutos de práctica de esta semana en los instrumentos que le enseña, meta semanal y récords de batería. Necesita el alumnoId de mis_alumnos.",
    input_schema: objeto({ alumno_id: { type: "string" } }, ["alumno_id"]),
  },
];

export const herramientasPara = (rol: Rol): Anthropic.Beta.BetaTool[] =>
  rol === "profesor" ? [...COMUNES, ...DE_PROFESOR] : [...COMUNES, ...DE_ALUMNO];

// --- Running a tool ---

type Entrada = Record<string, unknown>;
const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export async function ejecutar(rol: Rol, uid: string, nombre: string, entrada: Entrada) {
  const hoy = fechaParaguay();
  if (rol === "alumno") {
    switch (nombre) {
      case "mi_resumen":
        return resumenAlumno(uid, hoy);
      case "mis_clases":
        return clasesAlumno(uid, hoy, entrada);
      case "ver_clase":
        return claseAlumno(uid, texto(entrada.clase_id));
      case "mi_diario":
        return diarioAlumno(uid, hoy, Number(entrada.dias) || 14);
    }
  } else {
    switch (nombre) {
      case "mi_resumen":
        return resumenProfesor(uid, hoy);
      case "mis_clases":
        return clasesProfesor(uid, hoy, entrada);
      case "ver_clase":
        return claseProfesor(uid, texto(entrada.clase_id));
      case "mis_alumnos":
        return alumnosProfesor(uid, texto(entrada.instrumento), texto(entrada.buscar));
      case "ver_alumno":
        return alumnoProfesor(uid, hoy, texto(entrada.alumno_id));
    }
  }
  throw new ErrorHerramienta(`La búsqueda ${nombre} no existe para este rol.`);
}

// --- Alumno ---

async function clasesDeAlumno(uid: string) {
  const inscripciones = await inscripcionesDeAlumno(uid);
  const listas = await Promise.all(inscripciones.map((i) => clasesDe(i.profesorId, i.instrumento)));
  // Only the ones for them, as the rules let them see.
  return { inscripciones, clases: listas.flat().filter((c) => esParaAlumno(c, uid)) };
}

// Classes from before the alumno joined are not pending for them.
function vigentes(clases: Clase[], inscripciones: DocumentData[]) {
  const desde = new Map(
    inscripciones.map((i) => [`${i.profesorId}_${i.instrumento}`, ingresoDe(i)]),
  );
  return clases.filter((c) => c.fecha >= (desde.get(`${c.profesorId}_${c.instrumento}`) ?? ""));
}

async function resumenAlumno(uid: string, hoy: string) {
  const [{ inscripciones, clases }, entregas, perfil, diario] = await Promise.all([
    clasesDeAlumno(uid),
    entregasDeAlumno(uid),
    db().doc(`usuarios/${uid}`).get(),
    leer(db().collection("diario").where("alumnoId", "==", uid)),
  ]);
  const entregadas = new Set(entregas.map((e) => e.claseId));
  const pendientes = vigentes(clases, inscripciones)
    .filter((c) => !entregadas.has(c.id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const semana = inicioDeSemana(hoy);
  return {
    hoy,
    instrumentos: (perfil.data()?.instrumentos ?? []).map(nombreInstrumento),
    listas: inscripciones.map((i) => ({
      profesor: i.profesorNombre,
      instrumento: nombreInstrumento(i.instrumento),
      avance: progreso(clases, entregas, i),
    })),
    proximaPendiente: pendientes.find((c) => c.fecha >= hoy)
      ? claseEnLista(
          pendientes.find((c) => c.fecha >= hoy)!,
          false,
        )
      : null,
    clasesAtrasadasSinEntregar: pendientes.filter((c) => c.fecha < hoy).length,
    metaSemanalMinutos: perfil.data()?.metaSemanal ?? null,
    minutosAnotadosEstaSemana: diario
      .filter((e) => e.fecha >= semana)
      .reduce((t, e) => t + (e.minutos || 0), 0),
  };
}

async function clasesAlumno(uid: string, hoy: string, entrada: Entrada) {
  const [{ clases }, entregas] = await Promise.all([clasesDeAlumno(uid), entregasDeAlumno(uid)]);
  const entregadas = new Set(entregas.map((e) => e.claseId));
  const desde = texto(entrada.desde) ?? sumarDias(hoy, -14);
  const hasta = texto(entrada.hasta) ?? sumarDias(hoy, 28);
  const inst = texto(entrada.instrumento);
  const lista = clases
    .filter((c) => enRango(c, desde, hasta) && (!inst || c.instrumento === inst))
    .filter((c) => !entrada.solo_pendientes || !entregadas.has(c.id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return {
    desde,
    hasta,
    total: lista.length,
    clases: lista.slice(0, MAX_CLASES).map((c) => claseEnLista(c, entregadas.has(c.id))),
  };
}

async function claseAlumno(uid: string, claseId?: string) {
  if (!claseId) throw new ErrorHerramienta("Falta clase_id.");
  const snap = await db().doc(`clases/${claseId}`).get();
  const c = snap.exists ? ({ id: snap.id, ...snap.data() } as Clase) : null;
  // Only the classes of a profesor list the alumno is in, and made for them (same check as the
  // rules).
  const inscripto =
    c && (await db().doc(`inscripciones/${c.profesorId}_${uid}_${c.instrumento}`).get()).exists;
  if (!c || !inscripto || !esParaAlumno(c, uid))
    throw new ErrorHerramienta("Esa clase no existe o no es de tus listas.");
  const entrega = await db().doc(`entregas/${claseId}_${uid}`).get();
  return {
    ...claseEnDetalle(c),
    tuEntrega: entrega.exists ? entregaEnPalabras(entrega.data()!) : "Todavía no entregaste.",
  };
}

async function diarioAlumno(uid: string, hoy: string, dias: number) {
  const desde = sumarDias(hoy, -Math.min(60, Math.max(1, dias)));
  const [entradas, perfil, records] = await Promise.all([
    leer(db().collection("diario").where("alumnoId", "==", uid)),
    db().doc(`usuarios/${uid}`).get(),
    leer(db().collection("records").where("alumnoId", "==", uid)),
  ]);
  return {
    metaSemanalMinutos: perfil.data()?.metaSemanal ?? null,
    anotaciones: entradas
      .filter((e) => e.fecha >= desde)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 60)
      .map((e) => ({
        fecha: e.fecha,
        instrumento: nombreInstrumento(e.instrumento),
        minutos: e.minutos,
        comentario: e.comentario || null,
      })),
    recordsDeRudimentos: records.map((r) => ({
      rudimento: r.rudimento,
      bpm: r.bpm,
      fecha: r.fecha,
    })),
  };
}

// --- Profesor ---

async function resumenProfesor(uid: string, hoy: string) {
  const [inscripciones, clases, entregas, perfil] = await Promise.all([
    inscripcionesDeProfesor(uid),
    clasesDe(uid),
    entregasDeProfesor(uid),
    db().doc(`usuarios/${uid}`).get(),
  ]);
  const semana = inicioDeSemana(hoy);
  const instrumentos: string[] = perfil.data()?.instrumentos ?? [];
  return {
    hoy,
    instrumentos: instrumentos.map((id) => ({
      instrumento: nombreInstrumento(id),
      alumnos: inscripciones.filter((i) => i.instrumento === id).length,
    })),
    alumnosDistintos: new Set(inscripciones.map((i) => i.alumnoId)).size,
    clasesEsteMes: clases.filter((c) => c.fecha.slice(0, 7) === hoy.slice(0, 7)).length,
    entregasEstaSemana: entregas.filter(
      (e) => (e.actualizadoEn?.toDate?.().toISOString().slice(0, 10) ?? "") >= semana,
    ).length,
    proximasClases: clases
      .filter((c) => c.fecha >= hoy && c.fecha <= sumarDias(hoy, 7))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 15)
      .map((c) => claseEnLista(c)),
  };
}

async function clasesProfesor(uid: string, hoy: string, entrada: Entrada) {
  const inst = texto(entrada.instrumento);
  const [clases, entregas, inscripciones] = await Promise.all([
    clasesDe(uid, inst),
    entregasDeProfesor(uid),
    inscripcionesDeProfesor(uid),
  ]);
  const desde = texto(entrada.desde) ?? sumarDias(hoy, -14);
  const hasta = texto(entrada.hasta) ?? sumarDias(hoy, 28);
  const lista = clases
    .filter((c) => enRango(c, desde, hasta))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return {
    desde,
    hasta,
    total: lista.length,
    clases: lista.slice(0, MAX_CLASES).map((c) => ({
      ...claseEnLista(c),
      entregas: entregas.filter((e) => e.claseId === c.id).length,
      alumnosDeLaClase: inscripciones.filter(
        (i) => i.instrumento === c.instrumento && esParaAlumno(c, i.alumnoId),
      ).length,
    })),
  };
}

async function claseProfesor(uid: string, claseId?: string) {
  if (!claseId) throw new ErrorHerramienta("Falta clase_id.");
  const snap = await db().doc(`clases/${claseId}`).get();
  const c = snap.exists ? ({ id: snap.id, ...snap.data() } as Clase) : null;
  if (!c || c.profesorId !== uid) throw new ErrorHerramienta("Esa clase no existe o no es tuya.");
  const entregas = await leer(
    db().collection("entregas").where("profesorId", "==", uid).where("claseId", "==", claseId),
  );
  return {
    ...claseEnDetalle(c),
    entregas: entregas.map((e) => ({ alumno: e.alumnoNombre, ...entregaEnPalabras(e) })),
  };
}

async function alumnosProfesor(uid: string, instrumentoId?: string, buscar?: string) {
  const [inscripciones, clases, entregas] = await Promise.all([
    inscripcionesDeProfesor(uid),
    clasesDe(uid),
    entregasDeProfesor(uid),
  ]);
  const filtro = buscar?.toLowerCase();
  return inscripciones
    .filter((i) => !instrumentoId || i.instrumento === instrumentoId)
    .filter((i) => !filtro || String(i.alumnoNombre).toLowerCase().includes(filtro))
    .sort((a, b) => String(a.alumnoNombre).localeCompare(String(b.alumnoNombre)))
    .slice(0, 100)
    .map((i) => ({
      alumnoId: i.alumnoId,
      nombre: i.alumnoNombre,
      instrumento: nombreInstrumento(i.instrumento),
      avance: progreso(clases, entregas, i),
    }));
}

async function alumnoProfesor(uid: string, hoy: string, alumnoId?: string) {
  if (!alumnoId) throw new ErrorHerramienta("Falta alumno_id.");
  const inscripciones = (await inscripcionesDeProfesor(uid)).filter((i) => i.alumnoId === alumnoId);
  if (!inscripciones.length) throw new ErrorHerramienta("Ese alumno no está en tus listas.");
  const instrumentos = inscripciones.map((i) => i.instrumento as string);
  const [clases, entregas, perfil, diario, records] = await Promise.all([
    clasesDe(uid),
    entregasDeProfesor(uid),
    db().doc(`usuarios/${alumnoId}`).get(),
    leer(db().collection("diario").where("alumnoId", "==", alumnoId)),
    instrumentos.includes("bateria")
      ? leer(db().collection("records").where("alumnoId", "==", alumnoId))
      : Promise.resolve([]),
  ]);
  const semana = inicioDeSemana(hoy);
  const titulos = new Map(clases.map((c) => [c.id, `${c.titulo} (${c.fecha})`]));
  return {
    nombre: inscripciones[0]?.alumnoNombre,
    porInstrumento: inscripciones.map((i) => ({
      instrumento: nombreInstrumento(i.instrumento),
      avance: progreso(clases, entregas, i),
      // Only the instruments this profesor teaches them (as in the app).
      minutosAnotadosEstaSemana: diario
        .filter((e) => e.instrumento === i.instrumento && e.fecha >= semana)
        .reduce((t, e) => t + (e.minutos || 0), 0),
    })),
    metaSemanalTotalMinutos: perfil.data()?.metaSemanal ?? null,
    entregasRecientes: entregas
      .filter((e) => e.alumnoId === alumnoId)
      .sort((a, b) => (b.actualizadoEn?.toMillis?.() ?? 0) - (a.actualizadoEn?.toMillis?.() ?? 0))
      .slice(0, 10)
      .map((e) => ({ clase: titulos.get(e.claseId) ?? null, ...entregaEnPalabras(e) })),
    recordsDeRudimentos: records.map((r) => ({
      rudimento: r.rudimento,
      bpm: r.bpm,
      fecha: r.fecha,
    })),
  };
}
