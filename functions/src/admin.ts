import { getAuth } from "firebase-admin/auth";
import {
  DocumentReference,
  FieldPath,
  GeoPoint,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// Admin panel (/admin): a read-only view of the whole backend (every Firestore collection, the
// Authentication accounts and the Storage files) for one person only. The Admin SDK skips the
// security rules, so the check lives here: documentos/{nro} is created with its account and the
// rules never let it change, so its uid is the admin. Keep ADMIN_DOCUMENTO in sync with
// src/lib/admin.ts. Nothing is written or deleted from here.

const ADMIN_DOCUMENTO = "4169298";
const POR_PAGINA = 50;
const CUENTAS_POR_PAGINA = 100;
const ARCHIVOS_POR_PAGINA = 100;

const db = () => getFirestore("default");

type Entrada = { que?: unknown; coleccion?: unknown; despues?: unknown; pagina?: unknown };

async function exigirAdmin(uid: string | undefined) {
  if (!uid) throw new HttpsError("unauthenticated", "Entra a tu cuenta.");
  const admin = (await db().doc(`documentos/${ADMIN_DOCUMENTO}`).get()).data();
  if (admin?.uid !== uid)
    throw new HttpsError("permission-denied", "Solo el administrador puede ver esta página.");
}

// Firestore values as plain JSON: dates as ISO text, references as their path.
function plano(valor: unknown): unknown {
  if (valor instanceof Timestamp) return valor.toDate().toISOString();
  if (valor instanceof DocumentReference) return valor.path;
  if (valor instanceof GeoPoint) return { lat: valor.latitude, lng: valor.longitude };
  if (valor instanceof Uint8Array) return `(${valor.length} bytes)`;
  if (Array.isArray(valor)) return valor.map(plano);
  if (valor && typeof valor === "object")
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, plano(v)]));
  return valor;
}

const texto = (v: unknown) => (typeof v === "string" && v ? v : undefined);

// Every root collection with its size (the project has no subcollections).
async function resumen() {
  const colecciones = await db().listCollections();
  const conteos = await Promise.all(
    colecciones.map(async (c) => ({
      nombre: c.id,
      total: (await c.count().get()).data().count,
    })),
  );
  return { colecciones: conteos.sort((a, b) => a.nombre.localeCompare(b.nombre)) };
}

// One page of a collection, by document id.
async function coleccion(nombre: string | undefined, despues: string | undefined) {
  if (!nombre || nombre.includes("/"))
    throw new HttpsError("invalid-argument", "Elige una colección.");
  let consulta = db()
    .collection(nombre)
    .orderBy(FieldPath.documentId())
    .limit(POR_PAGINA + 1);
  if (despues) consulta = consulta.startAfter(despues);
  const snap = await consulta.get();
  const docs = snap.docs.slice(0, POR_PAGINA);
  return {
    documentos: docs.map((d) => ({
      id: d.id,
      datos: plano(d.data()),
      creado: d.createTime.toDate().toISOString(),
      actualizado: d.updateTime.toDate().toISOString(),
    })),
    siguiente: snap.docs.length > POR_PAGINA ? docs.at(-1)!.id : null,
  };
}

// Authentication accounts, each with whether it has its profile (usuarios/{uid}): an account
// without one is a sign-up that did not finish.
async function cuentas(pagina: string | undefined) {
  const lista = await getAuth().listUsers(CUENTAS_POR_PAGINA, pagina);
  const perfiles = lista.users.length
    ? await db().getAll(...lista.users.map((u) => db().doc(`usuarios/${u.uid}`)))
    : [];
  return {
    cuentas: lista.users.map((u, i) => ({
      uid: u.uid,
      email: u.email ?? null,
      deshabilitada: u.disabled,
      creada: u.metadata.creationTime,
      ultimoIngreso: u.metadata.lastSignInTime ?? null,
      conPerfil: perfiles[i]?.exists ?? false,
    })),
    siguiente: lista.pageToken ?? null,
  };
}

// Storage files, by path.
async function archivos(pagina: string | undefined) {
  const [lista, siguiente] = await getStorage()
    .bucket()
    .getFiles({ maxResults: ARCHIVOS_POR_PAGINA, pageToken: pagina, autoPaginate: false });
  return {
    archivos: lista.map((f) => ({
      ruta: f.name,
      tamano: Number(f.metadata.size ?? 0),
      tipo: f.metadata.contentType ?? null,
      actualizado: f.metadata.updated ?? null,
    })),
    siguiente: (siguiente as { pageToken?: string } | null)?.pageToken ?? null,
  };
}

export const verBackend = onCall(
  { region: "southamerica-east1", timeoutSeconds: 60, memory: "512MiB", maxInstances: 2 },
  async (request) => {
    await exigirAdmin(request.auth?.uid);
    const datos = (request.data ?? {}) as Entrada;
    switch (datos.que) {
      case "resumen":
        return resumen();
      case "coleccion":
        return coleccion(texto(datos.coleccion), texto(datos.despues));
      case "cuentas":
        return cuentas(texto(datos.pagina));
      case "archivos":
        return archivos(texto(datos.pagina));
      default:
        throw new HttpsError("invalid-argument", "Pedido desconocido.");
    }
  },
);
