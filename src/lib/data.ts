import { useEffect, useState } from "react";
import {
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
};

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
};

// Deterministic ids let the security rules check a link with a single exists().
export const inscripcionId = (profesorId: string, alumnoId: string, instrumento: string) =>
  `${profesorId}_${alumnoId}_${instrumento}`;
export const entregaId = (claseId: string, alumnoId: string) => `${claseId}_${alumnoId}`;

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

export function quitarInscripcion(id: string) {
  return deleteDoc(doc(db, "inscripciones", id));
}

// --- Profesor: planning ---

export type ClaseNueva = Pick<Clase, "instrumento" | "titulo" | "descripcion">;

// One class per date (several when the class repeats every week).
export async function crearClases(profesor: Perfil, datos: ClaseNueva, fechas: string[]) {
  const batch = writeBatch(db);
  const ids: string[] = [];
  for (const fecha of fechas) {
    const ref = doc(collection(db, "clases"));
    ids.push(ref.id);
    batch.set(ref, {
      ...datos,
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
  cambios: Partial<Pick<Clase, "titulo" | "descripcion" | "fecha">>,
) {
  return updateDoc(doc(db, "clases", claseId), cambios);
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
  const batch = writeBatch(db);
  entregas.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "clases", clase.id));
  await batch.commit();
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
export function quitarArchivoEntrega(entrega: Entrega, material: Material) {
  const ref = doc(db, "entregas", entrega.id);
  if (entrega.archivos.length <= 1) return deleteDoc(ref);
  return updateDoc(ref, { archivos: arrayRemove(material), actualizadoEn: serverTimestamp() });
}

export function guardarComentario(entrega: Entrega, comentario: string) {
  return updateDoc(doc(db, "entregas", entrega.id), {
    comentario,
    actualizadoEn: serverTimestamp(),
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
