import { useEffect, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Perfil } from "@/lib/auth";
import { hoy } from "@/lib/dates";
import { normalizarDocumento, normalizarTexto } from "@/lib/documento";
import type { InstrumentId } from "@/lib/instruments";
import { archivosDelPlan, type Bloque, type Ficha, type Plan } from "@/lib/plan";
import { borrarArchivo, fotoRuta, prepararFoto, subirFoto, type Material } from "@/lib/files";

// --- Types (one per Firestore collection; see docs/arquitectura.md) ---

export type Inscripcion = {
  id: string;
  profesorId: string;
  profesorNombre: string;
  alumnoId: string;
  alumnoNombre: string;
  alumnoDocumento: string;
  instrumento: InstrumentId;
};

export type Clase = {
  id: string;
  profesorId: string;
  profesorNombre: string;
  instrumento: InstrumentId;
  titulo: string;
  descripcion: string;
  fecha: string; // YYYY-MM-DD
  materiales: Material[];
  // Lesson plan (see src/lib/plan.ts); absent until the profesor builds one.
  ficha?: Ficha;
  bloques?: Bloque[];
  // Time (HH:MM, Paraguay), in person or online (with its link).
  hora?: string;
  modalidad?: "presencial" | "virtual";
  enlace?: string;
  // Attendance by alumnoId, marked by the profesor.
  asistencia?: Record<string, Asistencia>;
  // A recital instead of a regular class: where, and who plays what (free text).
  evento?: { tipo: "recital"; lugar: string; programa: { interprete: string; obra: string }[] };
};

export type Asistencia = "presente" | "tarde" | "ausente";

export type Entrega = {
  id: string;
  claseId: string;
  profesorId: string;
  alumnoId: string;
  alumnoNombre: string;
  instrumento: InstrumentId;
  archivos: Material[];
  comentario: string;
  actualizadoEn?: Timestamp;
  // The profesor's comments at a point of a file ("0:42 rushes the fill"), inside the delivery
  // so they go away with it.
  devoluciones?: Devolucion[];
  // The profesor's rubric (1-5 per criterion of the instrument, see src/lib/rubrica.ts).
  evaluacion?: Evaluacion;
  // The alumno's answer to each devolución (by its id): "got it" or "fixed it".
  respuestas?: Record<string, RespuestaDevolucion>;
};

export type RespuestaDevolucion = "entendido" | "corregido";

// The alumno's repertoire in one profesor's list, with how far each piece is.
export type EstadoObra = "aprendiendo" | "entera" | "memoria" | "lista";
export type Obra = {
  id: string;
  profesorId: string;
  alumnoId: string;
  instrumento: InstrumentId;
  obra: string;
  estado: EstadoObra;
  // Last review (YYYY-MM-DD); the daily routine brings back the one reviewed longest ago.
  repasadoEn?: string;
  creadoEn?: Timestamp;
};

// A goal of one week (`semana` = its Monday) agreed with the profesor.
export type Meta = {
  id: string;
  profesorId: string;
  alumnoId: string;
  instrumento: InstrumentId;
  texto: string;
  semana: string;
  cumplida: boolean;
  creadoEn?: Timestamp;
};

export type Evaluacion = { criterios: Record<string, number>; comentario: string; fecha: number };

// A block the profesor saved to reuse in any class (never a files block: its files belong to
// one class).
export type BloqueGuardado = {
  id: string;
  profesorId: string;
  instrumento: InstrumentId;
  titulo: string;
  bloque: Bloque;
};

// Learning path of an alumno in one instrument: level and objectives reached. Same id as the
// enrollment ({profesorId}_{alumnoId}_{instrumento}), deleted with it.
export type Logros = {
  id: string;
  profesorId: string;
  alumnoId: string;
  instrumento: InstrumentId;
  nivel: string;
  cumplidos: string[];
  actualizadoEn?: Timestamp;
};

// A message between a profesor and one alumno about one class.
export type MensajeClase = {
  id: string;
  claseId: string;
  profesorId: string;
  alumnoId: string;
  autorId: string;
  texto: string;
  // "ausencia": the alumno lets the profesor know they cannot come (the text is the reason).
  tipo?: "ausencia";
  creadoEn?: Timestamp;
};

export type Devolucion = {
  id: string;
  archivoId: string; // Material.id of a file in this delivery
  segundo: number;
  texto: string;
  fecha: number; // ms (server timestamps are not allowed inside arrays)
};

// Best clean tempo of an alumno for a rudiment: one document per alumno and rudiment.
export type RecordRudimento = {
  id: string;
  alumnoId: string;
  rudimento: string;
  bpm: number;
  fecha: string; // YYYY-MM-DD
  actualizadoEn?: Timestamp;
};

// Practice diary: what the alumno practiced, by day and instrument. Their profesores of that
// instrument can read it.
export type EntradaDiario = {
  id: string;
  alumnoId: string;
  instrumento: InstrumentId;
  fecha: string; // YYYY-MM-DD
  minutos: number;
  comentario: string;
  creadoEn?: Timestamp;
};

// Deterministic ids let the security rules check a link with a single exists().
export const inscripcionId = (profesorId: string, alumnoId: string, instrumento: string) =>
  `${profesorId}_${alumnoId}_${instrumento}`;
export const entregaId = (claseId: string, alumnoId: string) => `${claseId}_${alumnoId}`;
export const recordId = (alumnoId: string, rudimento: string) => `${alumnoId}_${rudimento}`;

// --- Live reads ---

type Live<T> = { data: T; loading: boolean; error: Error | null };

// Subscribes while `key` stays the same; `key` must identify the query or document.
function useLive<T>(
  key: string | null,
  subscribe: (set: (data: T) => void, fail: (e: Error) => void) => () => void,
  empty: T,
): Live<T> {
  const [state, setState] = useState<{ key: string | null; data: T; error: Error | null }>({
    key: null,
    data: empty,
    error: null,
  });

  useEffect(() => {
    if (!key) return;
    return subscribe(
      (data) => setState({ key, data, error: null }),
      (error) => setState({ key, data: empty, error }),
    );
    // `key` identifies the subscription; `subscribe` and `empty` are recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state.key === key;
  return {
    data: current ? state.data : empty,
    loading: !!key && !current,
    error: current ? state.error : null,
  };
}

const NONE: never[] = [];

function useLiveQuery<T>(key: string | null, build: () => Query): Live<T[]> {
  return useLive<T[]>(
    key,
    (set, fail) =>
      onSnapshot(
        build(),
        (snap) => set(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
        fail,
      ),
    NONE,
  );
}

function useLiveDoc<T>(key: string | null, build: () => DocumentReference): Live<T | null> {
  return useLive<T | null>(
    key,
    (set, fail) =>
      onSnapshot(
        build(),
        (snap) => set(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null),
        fail,
      ),
    null,
  );
}

const byFecha = (a: Clase, b: Clase) =>
  a.fecha.localeCompare(b.fecha) || a.titulo.localeCompare(b.titulo);

export function useInscripcionesProfesor(profesorId: string) {
  const live = useLiveQuery<Inscripcion>(`insc-p:${profesorId}`, () =>
    query(collection(db, "inscripciones"), where("profesorId", "==", profesorId)),
  );
  return {
    ...live,
    data: [...live.data].sort((a, b) => a.alumnoNombre.localeCompare(b.alumnoNombre)),
  };
}

export function useInscripcionesAlumno(alumnoId: string) {
  return useLiveQuery<Inscripcion>(`insc-a:${alumnoId}`, () =>
    query(collection(db, "inscripciones"), where("alumnoId", "==", alumnoId)),
  );
}

export function useClasesProfesor(profesorId: string) {
  const live = useLiveQuery<Clase>(`clases-p:${profesorId}`, () =>
    query(collection(db, "clases"), where("profesorId", "==", profesorId)),
  );
  return { ...live, data: [...live.data].sort(byFecha) };
}

// Classes an enrolled alumno can see: one profesor, one instrument.
export function useClasesDe(profesorId: string, instrumento: string) {
  const live = useLiveQuery<Clase>(`clases:${profesorId}:${instrumento}`, () =>
    query(
      collection(db, "clases"),
      where("profesorId", "==", profesorId),
      where("instrumento", "==", instrumento),
    ),
  );
  return { ...live, data: [...live.data].sort(byFecha) };
}

// Classes of every profesor + instrument the alumno is enrolled in, live (one listener per
// enrollment, merged).
export function useClasesDeInscripciones(inscripciones: Inscripcion[]) {
  const key = inscripciones
    .map((i) => i.id)
    .sort()
    .join(",");
  const [estado, setEstado] = useState<{ key: string; data: Clase[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    const porInscripcion = new Map<string, Clase[]>();
    const unsubs = inscripciones.map((inscripcion) =>
      onSnapshot(
        query(
          collection(db, "clases"),
          where("profesorId", "==", inscripcion.profesorId),
          where("instrumento", "==", inscripcion.instrumento),
        ),
        (snap) => {
          porInscripcion.set(
            inscripcion.id,
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Clase),
          );
          if (porInscripcion.size === inscripciones.length)
            setEstado({ key, data: [...porInscripcion.values()].flat() });
        },
        () => porInscripcion.set(inscripcion.id, []),
      ),
    );
    return () => unsubs.forEach((unsub) => unsub());
    // `key` identifies the enrollments; the array itself is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const actual = estado?.key === key;
  return { data: actual ? estado.data : NONE, loading: !!key && !actual };
}

export function useClase(claseId: string) {
  return useLiveDoc<Clase>(`clase:${claseId}`, () => doc(db, "clases", claseId));
}

export function useEntregasProfesor(profesorId: string) {
  return useLiveQuery<Entrega>(`ent-p:${profesorId}`, () =>
    query(collection(db, "entregas"), where("profesorId", "==", profesorId)),
  );
}

export function useEntregasAlumno(alumnoId: string) {
  return useLiveQuery<Entrega>(`ent-a:${alumnoId}`, () =>
    query(collection(db, "entregas"), where("alumnoId", "==", alumnoId)),
  );
}

export function useEntregasDeClase(claseId: string, profesorId: string) {
  return useLiveQuery<Entrega>(`ent-c:${claseId}`, () =>
    query(
      collection(db, "entregas"),
      where("profesorId", "==", profesorId),
      where("claseId", "==", claseId),
    ),
  );
}

export function useEntrega(claseId: string, alumnoId: string) {
  return useLiveDoc<Entrega>(`ent:${claseId}:${alumnoId}`, () =>
    doc(db, "entregas", entregaId(claseId, alumnoId)),
  );
}

export function useUsuario(uid: string) {
  return useLiveDoc<Perfil>(`usuario:${uid}`, () => doc(db, "usuarios", uid));
}

const recientesPrimero = (a: EntradaDiario, b: EntradaDiario) =>
  b.fecha.localeCompare(a.fecha) || (b.creadoEn?.toMillis() ?? 0) - (a.creadoEn?.toMillis() ?? 0);

export function useDiarioAlumno(alumnoId: string) {
  const live = useLiveQuery<EntradaDiario>(`diario-a:${alumnoId}`, () =>
    query(collection(db, "diario"), where("alumnoId", "==", alumnoId)),
  );
  return { ...live, data: [...live.data].sort(recientesPrimero) };
}

// Profesor: one alumno, one instrument (the rules check that the profesor teaches it to them).
export function useDiarioDe(alumnoId: string, instrumento: string) {
  const live = useLiveQuery<EntradaDiario>(`diario:${alumnoId}:${instrumento}`, () =>
    query(
      collection(db, "diario"),
      where("alumnoId", "==", alumnoId),
      where("instrumento", "==", instrumento),
    ),
  );
  return { ...live, data: [...live.data].sort(recientesPrimero) };
}

// Records of one alumno (the alumno, or a profesor who teaches them drums: see the rules).
// null = do not listen (e.g. a profesor previewing a class).
export function useRecordsAlumno(alumnoId: string | null) {
  return useLiveQuery<RecordRudimento>(alumnoId && `records:${alumnoId}`, () =>
    query(collection(db, "records"), where("alumnoId", "==", alumnoId)),
  );
}

export function useBiblioteca(profesorId: string) {
  return useLiveQuery<BloqueGuardado>(`biblioteca:${profesorId}`, () =>
    query(collection(db, "biblioteca"), where("profesorId", "==", profesorId)),
  );
}

export function useLogrosAlumno(alumnoId: string) {
  return useLiveQuery<Logros>(`logros-a:${alumnoId}`, () =>
    query(collection(db, "logros"), where("alumnoId", "==", alumnoId)),
  );
}

export function useLogrosProfesor(profesorId: string) {
  return useLiveQuery<Logros>(`logros-p:${profesorId}`, () =>
    query(collection(db, "logros"), where("profesorId", "==", profesorId)),
  );
}

// Profesor: every message of a class (to show who said they cannot come).
export function useMensajesDeClase(clase: Clase) {
  return useLiveQuery<MensajeClase>(`mensajes-c:${clase.id}`, () =>
    query(
      collection(db, "mensajes"),
      where("profesorId", "==", clase.profesorId),
      where("claseId", "==", clase.id),
    ),
  );
}

export function useRepertorioAlumno(alumnoId: string) {
  return useLiveQuery<Obra>(`rep-a:${alumnoId}`, () =>
    query(collection(db, "repertorio"), where("alumnoId", "==", alumnoId)),
  );
}

export function useRepertorioDe(profesorId: string, alumnoId: string) {
  return useLiveQuery<Obra>(`rep-p:${profesorId}:${alumnoId}`, () =>
    query(
      collection(db, "repertorio"),
      where("profesorId", "==", profesorId),
      where("alumnoId", "==", alumnoId),
    ),
  );
}

export function useMetasAlumno(alumnoId: string) {
  return useLiveQuery<Meta>(`metas-a:${alumnoId}`, () =>
    query(collection(db, "metas"), where("alumnoId", "==", alumnoId)),
  );
}

export function useMetasDe(profesorId: string, alumnoId: string) {
  return useLiveQuery<Meta>(`metas-p:${profesorId}:${alumnoId}`, () =>
    query(
      collection(db, "metas"),
      where("profesorId", "==", profesorId),
      where("alumnoId", "==", alumnoId),
    ),
  );
}

// A message still on its way (no server time yet) goes last.
const enviado = (m: MensajeClase) => m.creadoEn?.toMillis() ?? Number.MAX_SAFE_INTEGER;

// One conversation: a class, its profesor and one alumno (the rules check both ids).
export function useMensajes(clase: Clase, alumnoId: string) {
  const live = useLiveQuery<MensajeClase>(`mensajes:${clase.id}:${alumnoId}`, () =>
    query(
      collection(db, "mensajes"),
      where("claseId", "==", clase.id),
      where("profesorId", "==", clase.profesorId),
      where("alumnoId", "==", alumnoId),
    ),
  );
  return {
    ...live,
    data: [...live.data].sort((a, b) => enviado(a) - enviado(b)),
  };
}

// --- Progress ---

// Share of a profesor's classes for one instrument that the alumno has delivered.
export function progreso(
  clases: Clase[],
  entregas: Entrega[],
  alumnoId: string,
  instrumento: string,
) {
  const ids = new Set(clases.filter((c) => c.instrumento === instrumento).map((c) => c.id));
  const hechas = entregas.filter((e) => e.alumnoId === alumnoId && ids.has(e.claseId)).length;
  return {
    hechas,
    total: ids.size,
    porcentaje: ids.size ? Math.round((hechas / ids.size) * 100) : 0,
  };
}

// --- Profesor: students ---

// Search by document number (digits) or by any name prefix.
export async function buscarAlumnos(texto: string): Promise<Perfil[]> {
  const nroDocumento = normalizarDocumento(texto);
  const usuarios = collection(db, "usuarios");
  let resultados: Perfil[];

  if (nroDocumento && nroDocumento.length === texto.replace(/[\s.-]/g, "").length) {
    const snap = await getDocs(
      query(usuarios, where("nro_documento", "==", nroDocumento), limit(5)),
    );
    resultados = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as Perfil);
  } else {
    const palabras = normalizarTexto(texto)
      .split(" ")
      .filter((p) => p.length >= 2);
    const [primera] = palabras;
    if (!primera) return [];
    const snap = await getDocs(
      query(usuarios, where("terminos", "array-contains", primera.slice(0, 20)), limit(30)),
    );
    resultados = snap.docs
      .map((d) => ({ uid: d.id, ...d.data() }) as Perfil & { terminos: string[] })
      .filter((p) => palabras.every((palabra) => p.terminos.includes(palabra.slice(0, 20))));
  }
  return resultados.filter((p) => p.rol === "alumno");
}

export function agregarAlumno(profesor: Perfil, alumno: Perfil, instrumento: InstrumentId) {
  return setDoc(doc(db, "inscripciones", inscripcionId(profesor.uid, alumno.uid, instrumento)), {
    profesorId: profesor.uid,
    profesorNombre: profesor.nombre,
    alumnoId: alumno.uid,
    alumnoNombre: alumno.nombre,
    alumnoDocumento: alumno.nro_documento,
    instrumento,
    creadoEn: serverTimestamp(),
  });
}

// What hangs from that list goes with it: the learning path (same id), the repertoire and the
// weekly goals. Those two can be many: extra batches first, the enrollment in the last one.
export async function quitarInscripcion(inscripcion: Inscripcion) {
  const deLaLista = (coleccion: string) =>
    getDocs(
      query(
        collection(db, coleccion),
        where("profesorId", "==", inscripcion.profesorId),
        where("alumnoId", "==", inscripcion.alumnoId),
        where("instrumento", "==", inscripcion.instrumento),
      ),
    );
  const [obras, metas] = await Promise.all([deLaLista("repertorio"), deLaLista("metas")]);
  const refs = [...obras.docs, ...metas.docs].map((d) => d.ref);
  while (refs.length > 450) {
    const parte = writeBatch(db);
    refs.splice(0, 450).forEach((ref) => parte.delete(ref));
    await parte.commit();
  }
  const batch = writeBatch(db);
  refs.forEach((ref) => batch.delete(ref));
  batch.delete(doc(db, "logros", inscripcion.id));
  batch.delete(doc(db, "inscripciones", inscripcion.id));
  return batch.commit();
}

// --- Profesor: planning ---

export type ClaseNueva = Pick<Clase, "instrumento" | "titulo" | "descripcion"> &
  Partial<Pick<Clase, "hora" | "modalidad" | "enlace" | "evento">>;

// One class per date (several when the class repeats every week).
export async function crearClases(profesor: Perfil, datos: ClaseNueva, fechas: string[]) {
  const batch = writeBatch(db);
  const ids: string[] = [];
  for (const fecha of fechas) {
    const ref = doc(collection(db, "clases"));
    ids.push(ref.id);
    batch.set(ref, {
      ...soloConValor(datos),
      fecha,
      profesorId: profesor.uid,
      profesorNombre: profesor.nombre,
      materiales: [],
      creadoEn: serverTimestamp(),
    });
  }
  await batch.commit();
  return ids;
}

export function actualizarClase(
  claseId: string,
  cambios: Partial<
    Pick<Clase, "titulo" | "descripcion" | "fecha" | "hora" | "modalidad" | "enlace" | "evento">
  >,
) {
  // An empty optional field (time, mode, link, recital) is removed, not saved as "".
  const datos = Object.fromEntries(
    Object.entries(cambios).map(([k, v]) =>
      OPCIONALES.includes(k) && (v === undefined || v === "") ? [k, deleteField()] : [k, v],
    ),
  );
  return updateDoc(doc(db, "clases", claseId), datos);
}

const OPCIONALES = ["hora", "modalidad", "enlace", "evento"];

function soloConValor<T extends object>(datos: T) {
  return Object.fromEntries(
    Object.entries(datos).filter(
      ([k, v]) => v !== undefined && !(OPCIONALES.includes(k) && v === ""),
    ),
  );
}

export function marcarAsistencia(claseId: string, alumnoId: string, estado: Asistencia | null) {
  return updateDoc(doc(db, "clases", claseId), {
    [`asistencia.${alumnoId}`]: estado ?? deleteField(),
  });
}

// Deletes the class with everything that hangs from it: its materials, the alumnos' deliveries
// and their files. Files go first (the Storage rules read the class to allow it); if one fails,
// nothing is deleted from Firestore and the class can be deleted again.
export async function eliminarClase(clase: Clase) {
  const entregas = await getDocs(
    query(
      collection(db, "entregas"),
      where("profesorId", "==", clase.profesorId),
      where("claseId", "==", clase.id),
    ),
  );
  const archivos = [
    ...clase.materiales,
    ...archivosDelPlan(clase.bloques),
    ...entregas.docs.flatMap((d) => (d.data() as Entrega).archivos),
  ];
  await Promise.all(archivos.map((m) => borrarArchivo(m.ruta)));
  const mensajes = await getDocs(
    query(
      collection(db, "mensajes"),
      where("profesorId", "==", clase.profesorId),
      where("claseId", "==", clase.id),
    ),
  );
  // Messages can be many (a batch takes 500 writes): they go first, in their own batches. If the
  // last batch fails, the class is still there and nothing points at a missing document.
  for (let i = 0; i < mensajes.docs.length; i += 450) {
    const parte = writeBatch(db);
    mensajes.docs.slice(i, i + 450).forEach((d) => parte.delete(d.ref));
    await parte.commit();
  }
  const batch = writeBatch(db);
  entregas.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "clases", clase.id));
  await batch.commit();
}

// A copy of the class on another date, with its plan. Files are not copied: they belong to the
// original class folder and are deleted with it, so the copy would point at missing files.
export async function duplicarClase(profesor: Perfil, clase: Clase, fecha: string) {
  const ref = doc(collection(db, "clases"));
  await setDoc(ref, {
    profesorId: profesor.uid,
    profesorNombre: profesor.nombre,
    instrumento: clase.instrumento,
    titulo: clase.titulo,
    descripcion: clase.descripcion,
    fecha,
    materiales: [],
    ...(clase.ficha ? { ficha: clase.ficha } : {}),
    // Same time and place; attendance and the recital belong to the original date.
    ...soloConValor({ hora: clase.hora, modalidad: clase.modalidad, enlace: clase.enlace }),
    ...(clase.bloques
      ? {
          bloques: clase.bloques.map((b) => (b.tipo === "archivos" ? { ...b, archivos: [] } : b)),
        }
      : {}),
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

export function guardarPlan(claseId: string, plan: Plan) {
  return updateDoc(doc(db, "clases", claseId), { ficha: plan.ficha, bloques: plan.bloques });
}

export function agregarMaterial(claseId: string, material: Material) {
  return updateDoc(doc(db, "clases", claseId), { materiales: arrayUnion(material) });
}

export function quitarMaterial(claseId: string, material: Material) {
  return updateDoc(doc(db, "clases", claseId), { materiales: arrayRemove(material) });
}

// --- Alumno: deliveries ---

// Atomic array updates, so several files uploaded at once never overwrite each other.
export function agregarArchivoEntrega(alumno: Perfil, clase: Clase, material: Material) {
  return setDoc(
    doc(db, "entregas", entregaId(clase.id, alumno.uid)),
    {
      claseId: clase.id,
      profesorId: clase.profesorId,
      alumnoId: alumno.uid,
      alumnoNombre: alumno.nombre,
      instrumento: clase.instrumento,
      archivos: arrayUnion(material),
      actualizadoEn: serverTimestamp(),
    },
    { merge: true },
  );
}

// Removing the last file removes the delivery (the class counts as pending again).
// The profesor's comments on that file go in the same write, so none points at a missing file.
export function quitarArchivoEntrega(entrega: Entrega, material: Material) {
  const ref = doc(db, "entregas", entrega.id);
  if (entrega.archivos.length <= 1) return deleteDoc(ref);
  const suyas = (entrega.devoluciones ?? []).filter((d) => d.archivoId === material.id);
  return updateDoc(ref, {
    archivos: arrayRemove(material),
    ...(suyas.length ? { devoluciones: arrayRemove(...suyas) } : {}),
    ...sinRespuestas(entrega, suyas),
    actualizadoEn: serverTimestamp(),
  });
}

// --- Profesor: comments at a point of a delivered file ---

export function agregarDevolucion(entrega: Entrega, devolucion: Devolucion) {
  return updateDoc(doc(db, "entregas", entrega.id), { devoluciones: arrayUnion(devolucion) });
}

export function guardarEvaluacion(entrega: Entrega, evaluacion: Omit<Evaluacion, "fecha">) {
  return updateDoc(doc(db, "entregas", entrega.id), {
    evaluacion: { ...evaluacion, fecha: Date.now() },
  });
}

export function quitarDevolucion(entrega: Entrega, devolucion: Devolucion) {
  return updateDoc(doc(db, "entregas", entrega.id), {
    devoluciones: arrayRemove(devolucion),
    ...sinRespuestas(entrega, [devolucion]),
  });
}

// The alumno's answers to these devoluciones, removed in the same write as them.
function sinRespuestas(entrega: Entrega, devoluciones: Devolucion[]) {
  return Object.fromEntries(
    devoluciones
      .filter((d) => entrega.respuestas?.[d.id])
      .map((d) => [`respuestas.${d.id}`, deleteField()]),
  );
}

// Alumno: "Entendido" / "Ya lo corregí" on a devolución (null takes it back).
export function responderDevolucion(
  entrega: Entrega,
  devolucionId: string,
  respuesta: RespuestaDevolucion | null,
) {
  return updateDoc(doc(db, "entregas", entrega.id), {
    [`respuestas.${devolucionId}`]: respuesta ?? deleteField(),
    actualizadoEn: serverTimestamp(),
  });
}

// Comments whose file is gone: possible if the profesor comments at the same moment the alumno
// removes that file. Whoever opens the delivery next removes them, so none keeps pointing at a
// missing file. The alumno's write is a delivery update (the rules want \`actualizadoEn\`); the
// profesor may only touch \`devoluciones\`.
export function devolucionesSinArchivo(entrega: Entrega) {
  const archivos = new Set(entrega.archivos.map((m) => m.id));
  return (entrega.devoluciones ?? []).filter((d) => !archivos.has(d.archivoId));
}

export function limpiarDevoluciones(entrega: Entrega, comoAlumno: boolean) {
  const sueltas = devolucionesSinArchivo(entrega);
  // Answers whose devolución is gone (the profesor deleted it while the alumno answered).
  const quedan = new Set(
    (entrega.devoluciones ?? []).filter((d) => !sueltas.includes(d)).map((d) => d.id),
  );
  const respuestasSueltas = Object.keys(entrega.respuestas ?? {}).filter((id) => !quedan.has(id));
  if (!sueltas.length && !respuestasSueltas.length) return Promise.resolve();
  return updateDoc(doc(db, "entregas", entrega.id), {
    ...(sueltas.length ? { devoluciones: arrayRemove(...sueltas) } : {}),
    ...Object.fromEntries(respuestasSueltas.map((id) => [`respuestas.${id}`, deleteField()])),
    ...(comoAlumno ? { actualizadoEn: serverTimestamp() } : {}),
  });
}

// --- Profesor: block library, learning path ---

export function guardarEnBiblioteca(profesorId: string, instrumento: InstrumentId, bloque: Bloque) {
  return addDoc(collection(db, "biblioteca"), {
    profesorId,
    instrumento,
    titulo: (bloque.titulo || "Bloque").slice(0, 120),
    bloque,
    creadoEn: serverTimestamp(),
  });
}

export function quitarDeBiblioteca(id: string) {
  return deleteDoc(doc(db, "biblioteca", id));
}

export function guardarLogros(inscripcion: Inscripcion, nivel: string, cumplidos: string[]) {
  return setDoc(doc(db, "logros", inscripcion.id), {
    profesorId: inscripcion.profesorId,
    alumnoId: inscripcion.alumnoId,
    instrumento: inscripcion.instrumento,
    nivel,
    cumplidos,
    actualizadoEn: serverTimestamp(),
  });
}

// --- Alumno: repertoire and weekly goals (both hang from the enrollment) ---

export function agregarObra(inscripcion: Inscripcion, obra: string, estado: EstadoObra) {
  return addDoc(collection(db, "repertorio"), {
    profesorId: inscripcion.profesorId,
    alumnoId: inscripcion.alumnoId,
    instrumento: inscripcion.instrumento,
    obra: obra.trim().slice(0, 120),
    estado,
    creadoEn: serverTimestamp(),
  });
}

export function cambiarObra(id: string, cambios: Partial<Pick<Obra, "estado" | "repasadoEn">>) {
  return updateDoc(doc(db, "repertorio", id), cambios);
}

export function quitarObra(id: string) {
  return deleteDoc(doc(db, "repertorio", id));
}

export function agregarMeta(inscripcion: Inscripcion, texto: string, semana: string) {
  return addDoc(collection(db, "metas"), {
    profesorId: inscripcion.profesorId,
    alumnoId: inscripcion.alumnoId,
    instrumento: inscripcion.instrumento,
    texto: texto.trim().slice(0, 200),
    semana,
    cumplida: false,
    creadoEn: serverTimestamp(),
  });
}

export function marcarMeta(id: string, cumplida: boolean) {
  return updateDoc(doc(db, "metas", id), { cumplida });
}

export function quitarMeta(id: string) {
  return deleteDoc(doc(db, "metas", id));
}

// --- Alumno: profile extras ---

export function guardarAutoevaluacion(uid: string, instrumento: InstrumentId, nivel: string) {
  return updateDoc(doc(db, "usuarios", uid), { [`autoevaluacion.${instrumento}`]: nivel });
}

export function guardarRecordatorio(uid: string, hora: number | null) {
  return updateDoc(doc(db, "usuarios", uid), { recordatorio: hora ?? deleteField() });
}

// --- Messages about a class ---

export function enviarMensaje(clase: Clase, alumnoId: string, autorId: string, texto: string) {
  return addDoc(collection(db, "mensajes"), {
    claseId: clase.id,
    profesorId: clase.profesorId,
    alumnoId,
    autorId,
    texto: texto.trim().slice(0, 1000),
    creadoEn: serverTimestamp(),
  });
}

// "I cannot come": a message of type ausencia, so the profesor sees it next to the attendance.
export function avisarAusencia(clase: Clase, alumnoId: string, motivo: string) {
  return addDoc(collection(db, "mensajes"), {
    claseId: clase.id,
    profesorId: clase.profesorId,
    alumnoId,
    autorId: alumnoId,
    texto: (motivo.trim() || "No puedo ir a esta clase.").slice(0, 1000),
    tipo: "ausencia",
    creadoEn: serverTimestamp(),
  });
}

export function borrarMensaje(id: string) {
  return deleteDoc(doc(db, "mensajes", id));
}

// --- Alumno: rudiment records ---

export function guardarRecord(alumnoId: string, rudimento: string, bpm: number) {
  return setDoc(doc(db, "records", recordId(alumnoId, rudimento)), {
    alumnoId,
    rudimento,
    bpm,
    fecha: hoy(),
    actualizadoEn: serverTimestamp(),
  });
}

export function borrarRecord(alumnoId: string, rudimento: string) {
  return deleteDoc(doc(db, "records", recordId(alumnoId, rudimento)));
}

export function guardarComentario(entrega: Entrega, comentario: string) {
  return updateDoc(doc(db, "entregas", entrega.id), {
    comentario,
    actualizadoEn: serverTimestamp(),
  });
}

// --- Alumno: practice diary and weekly goal ---

export function anotarPractica(
  alumnoId: string,
  entrada: Pick<EntradaDiario, "instrumento" | "fecha" | "minutos" | "comentario">,
) {
  return addDoc(collection(db, "diario"), {
    ...entrada,
    alumnoId,
    creadoEn: serverTimestamp(),
  });
}

// Finishing a class's practice mode logs its minutes once a day: the id is fixed
// ({alumnoId}_{claseId}_{fecha}) and the rules do not let an entry change, so finishing again
// that day keeps the first one. Returns false when it was already logged.
export async function anotarPracticaDeClase(alumnoId: string, clase: Clase, minutos: number) {
  const ref = doc(db, "diario", `${alumnoId}_${clase.id}_${hoy()}`);
  try {
    await setDoc(ref, {
      alumnoId,
      instrumento: clase.instrumento,
      fecha: hoy(),
      minutos: Math.min(600, Math.max(1, Math.round(minutos))),
      comentario: `Práctica de la clase: ${clase.titulo}`.slice(0, 500),
      creadoEn: serverTimestamp(),
    });
    return true;
  } catch (error) {
    // Writing over an existing entry is an update, which the rules reject.
    if ((error as { code?: string })?.code !== "permission-denied") throw error;
    const snap = await getDoc(ref).catch(() => null);
    if (snap?.exists()) return false;
    throw error;
  }
}

export function borrarDelDiario(id: string) {
  return deleteDoc(doc(db, "diario", id));
}

// Adds an instrument to teach or to learn. Instruments are only added from the app: removing one
// would leave classes, lists and diaries of it without their instrument in the profile.
export function agregarInstrumento(uid: string, instrumento: InstrumentId) {
  return updateDoc(doc(db, "usuarios", uid), { instrumentos: arrayUnion(instrumento) });
}

// 0 = no goal.
export function guardarMetaSemanal(uid: string, minutos: number) {
  return updateDoc(doc(db, "usuarios", uid), {
    metaSemanal: minutos > 0 ? minutos : deleteField(),
  });
}

export async function perfilDe(uid: string) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as Perfil) : null;
}

// --- Profile photo ---

// Uploads first, then points the profile at it. If the profile cannot be updated and there was no
// previous photo, the file is removed so it is not left orphaned in Storage.
export async function cambiarFoto(perfil: Perfil, file: File) {
  const foto = await prepararFoto(file);
  await subirFoto(perfil.uid, foto);
  try {
    await updateDoc(doc(db, "usuarios", perfil.uid), {
      foto: { ruta: fotoRuta(perfil.uid), actualizadoEn: serverTimestamp() },
    });
  } catch (error) {
    if (!perfil.foto) await borrarArchivo(fotoRuta(perfil.uid)).catch(() => {});
    throw error;
  }
}

// File first: if deleting it fails, the profile keeps pointing at it.
export async function quitarFoto(perfil: Perfil) {
  if (!perfil.foto) return;
  await borrarArchivo(perfil.foto.ruta);
  await updateDoc(doc(db, "usuarios", perfil.uid), { foto: deleteField() });
}
