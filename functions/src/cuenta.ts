import { getAuth } from "firebase-admin/auth";
import {
  FieldPath,
  FieldValue,
  Timestamp,
  getFirestore,
  type DocumentReference,
} from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { refAdmin } from "./admin.js";
import { LANZAMIENTO } from "./planes.js";

// "Eliminar mi cuenta" (Mi perfil): deletes the account of whoever asks and everything that hangs
// from it, for alumnos and profesores. Only here, with the Admin SDK: part of what goes belongs to
// someone else under the rules (the attendance a profesor marked, the messages of the other
// person in a conversation, the alumnos' deliveries in a profesor's classes).
//
// Order, so nothing is left orphaned if it stops halfway (the person can simply try again):
// 1. Storage files, before the documents that name them.
// 2. The documents that hang from the account, in batches.
// 3. One last batch with usuarios/{uid} and documentos/{nro} (and, for a profesor, bajas/{nro}).
// 4. The Authentication account. If only this fails, the account is left without a profile and
//    the "Tu cuenta no terminó de crearse" screen deletes it on "Salir".
//
// Kept on purpose: a profesor's pagos and suscripciones/{uid} (accounting history). The plan is
// marked with `baja` (name and document, for the admin and invoices) and bajas/{nro} keeps the
// start of the trial, so registering again with the same document does not start a new one
// (firestore.rules, suscripciones). docs/backend.md explains each relation.

const REGION = "southamerica-east1";
// The password must have been typed a moment ago (reauthenticateWithCredential in the app).
const MAX_SEGUNDOS_DESDE_INGRESO = 5 * 60;
const POR_BATCH = 450;

const db = () => getFirestore();

async function refsDonde(coleccion: string, campo: string | FieldPath, valor: unknown) {
  const snap = await db().collection(coleccion).where(campo, "==", valor).select().get();
  return snap.docs.map((d) => d.ref);
}

async function borrarDocumentos(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += POR_BATCH) {
    const batch = db().batch();
    for (const ref of refs.slice(i, i + POR_BATCH)) batch.delete(ref);
    await batch.commit();
  }
}

async function borrarCarpeta(prefijo: string) {
  await getStorage().bucket().deleteFiles({ prefix: prefijo, force: true });
}

export const eliminarCuenta = onCall(
  { region: REGION, timeoutSeconds: 540, memory: "512MiB", maxInstances: 5 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Entra a tu cuenta.");
    const ingreso = Number(request.auth?.token.auth_time ?? 0);
    if (Date.now() / 1000 - ingreso > MAX_SEGUNDOS_DESDE_INGRESO)
      throw new HttpsError("failed-precondition", "Vuelve a escribir tu contraseña.");

    const [usuarioSnap, admin] = await Promise.all([
      db().doc(`usuarios/${uid}`).get(),
      refAdmin().get(),
    ]);
    const usuario = usuarioSnap.data();
    if (!usuario) throw new HttpsError("not-found", "Tu cuenta ya no tiene perfil.");
    if (admin.get("uid") === uid)
      throw new HttpsError(
        "permission-denied",
        "La cuenta del administrador no se puede eliminar desde aquí.",
      );
    const profesor = usuario.rol === "profesor";
    const nro = String(usuario.nro_documento);

    // 1. Files: the profile photo, and the deliveries (an alumno's) or the classes with every
    //    delivery made to them (a profesor's).
    await borrarCarpeta(`usuarios/${uid}/`);
    if (profesor) {
      const clases = await refsDonde("clases", "profesorId", uid);
      for (const clase of clases) {
        await borrarCarpeta(`clases/${clase.id}/`);
        await borrarCarpeta(`entregas/${clase.id}/`);
      }
    } else {
      const entregas = await db().collection("entregas").where("alumnoId", "==", uid).get();
      for (const entrega of entregas.docs)
        await borrarCarpeta(`entregas/${entrega.get("claseId")}/${uid}/`);
    }

    // 2. Documents that hang from the account (children before their parents).
    const campo = profesor ? "profesorId" : "alumnoId";
    const colecciones = profesor
      ? ["mensajes", "entregas", "logros", "repertorio", "metas", "inscripciones", "biblioteca"]
      : [
          "mensajes",
          "entregas",
          "logros",
          "repertorio",
          "metas",
          "inscripciones",
          "diario",
          "records",
        ];
    for (const coleccion of colecciones)
      await borrarDocumentos(await refsDonde(coleccion, campo, uid));
    if (profesor) await borrarDocumentos(await refsDonde("clases", "profesorId", uid));
    else {
      // The attendance profesores marked for this alumno lives inside their classes.
      const conAsistencia = await db()
        .collection("clases")
        .where(new FieldPath("asistencia", uid), "in", ["presente", "tarde", "ausente"])
        .select()
        .get();
      for (let i = 0; i < conAsistencia.docs.length; i += POR_BATCH) {
        const batch = db().batch();
        for (const d of conAsistencia.docs.slice(i, i + POR_BATCH))
          batch.update(d.ref, new FieldPath("asistencia", uid), FieldValue.delete());
        await batch.commit();
      }
    }
    await borrarDocumentos([
      ...(await refsDonde("dispositivos", "uid", uid)),
      ...(await refsDonde("asistenteConsultas", "uid", uid)),
      db().doc(`asistenteUso/${uid}`),
      ...(profesor ? [db().doc(`telefonos/${uid}`)] : []),
    ]);

    // 3. The account itself, in one batch.
    const final = db().batch();
    final.delete(db().doc(`usuarios/${uid}`));
    final.delete(db().doc(`documentos/${nro}`));
    if (profesor) {
      const suscripcionRef = db().doc(`suscripciones/${uid}`);
      const suscripcion = (await suscripcionRef.get()).data();
      // As planes.ts counts it: a profesor from before the plans has the trial from the launch.
      const creado =
        usuario.creadoEn instanceof Timestamp ? usuario.creadoEn.toDate() : LANZAMIENTO;
      const pruebaDesde =
        (suscripcion?.pruebaDesde as Timestamp | undefined) ??
        Timestamp.fromMillis(Math.max(creado.getTime(), LANZAMIENTO.getTime()));
      final.set(db().doc(`bajas/${nro}`), {
        rol: "profesor",
        pruebaDesde,
        eliminadaEn: FieldValue.serverTimestamp(),
      });
      const baja = {
        nombre: usuario.nombre,
        nro_documento: nro,
        eliminadaEn: FieldValue.serverTimestamp(),
      };
      // A profesor from before the plans may have no plan record: one is created to hold it.
      if (suscripcion) final.update(suscripcionRef, { baja });
      else final.set(suscripcionRef, { plan: "prueba", pruebaDesde, baja });
    }
    await final.commit();

    // 4. The Authentication account.
    await getAuth().deleteUser(uid);
    return { eliminada: true };
  },
);
