import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { planHabilitado } from "./planes.js";

// The profesor's files to reuse (bibliotecaArchivos, under biblioteca/{uid}/ in Storage). Using one
// in a class copies it to clases/{claseId}/ here, on the server: the class owns its copy like any
// other material and deletes it with itself (eliminarClase), and deleting it from the library never
// touches a class. The Admin SDK skips the rules, so every check is here.

const REGION = "southamerica-east1";
const MAX_MATERIALES = 30; // archivosValidos in firestore.rules.

const db = () => getFirestore();

export const usarArchivoBiblioteca = onCall(
  { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 5 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Entra a tu cuenta.");
    const { claseId, archivoId } = (request.data ?? {}) as Record<string, unknown>;
    if (typeof claseId !== "string" || !/^[A-Za-z0-9]{10,64}$/.test(claseId))
      throw new HttpsError("invalid-argument", "Clase no válida.");
    if (typeof archivoId !== "string" || !/^[A-Za-z0-9]{10,64}$/.test(archivoId))
      throw new HttpsError("invalid-argument", "Archivo no válido.");

    const [guardado, claseSnap] = await Promise.all([
      db().doc(`bibliotecaArchivos/${archivoId}`).get(),
      db().doc(`clases/${claseId}`).get(),
    ]);
    if (guardado.get("profesorId") !== uid)
      throw new HttpsError("not-found", "Ese archivo no está en tu biblioteca.");
    if (claseSnap.get("profesorId") !== uid)
      throw new HttpsError("permission-denied", "Esa clase no es tuya.");
    if (!(await planHabilitado(uid)))
      throw new HttpsError(
        "failed-precondition",
        "Tu plan venció: renuévalo en Mi plan para agregar archivos.",
      );

    const material = guardado.get("material") as { ruta: string; nombre: string };
    const nombreSeguro = String(material.nombre)
      .replace(/[^\w.-]+/g, "_")
      .slice(-80);
    const id = `${Date.now()}-${nombreSeguro}`;
    const ruta = `clases/${claseId}/${id}`;
    const bucket = getStorage().bucket();
    await bucket.file(material.ruta).copy(bucket.file(ruta));

    // Noted in a transaction, so the limit of materials holds. If it fails, the copy is deleted:
    // no file without its reference.
    const claseRef = db().doc(`clases/${claseId}`);
    try {
      await db().runTransaction(async (tx) => {
        const clase = await tx.get(claseRef);
        const materiales = (clase.get("materiales") as unknown[] | undefined) ?? [];
        if (materiales.length >= MAX_MATERIALES)
          throw new HttpsError(
            "resource-exhausted",
            `Una clase admite hasta ${MAX_MATERIALES} materiales.`,
          );
        tx.update(claseRef, { materiales: FieldValue.arrayUnion({ ...material, id, ruta }) });
      });
    } catch (error) {
      await bucket
        .file(ruta)
        .delete({ ignoreNotFound: true })
        .catch(() => {});
      throw error;
    }
    return { nombre: material.nombre };
  },
);
