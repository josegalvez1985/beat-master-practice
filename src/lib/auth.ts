import { useSyncExternalStore } from "react";
import { FirebaseError } from "firebase/app";
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  indexedDBLocalPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { terminosDeBusqueda } from "@/lib/documento";
import type { InstrumentId } from "@/lib/instruments";

export type Role = "alumno" | "profesor";

export type Perfil = {
  uid: string;
  rol: Role;
  nombre: string;
  nro_documento: string;
  instrumentos: InstrumentId[];
  // Profile photo in Storage (always usuarios/{uid}/foto.jpg); absent without photo.
  foto?: { ruta: string; actualizadoEn: Timestamp | null };
};

export type Session =
  | { status: "loading" }
  | { status: "guest" }
  // Signed in to Firebase Auth but without a profile document (sign-up did not finish).
  | { status: "incomplete"; user: User }
  | { status: "ready"; user: User; perfil: Perfil };

// Firebase Auth keeps the session in IndexedDB, shared by every tab and window of the site,
// and notifies the other tabs on sign-in and sign-out.
let session: Session = { status: "loading" };
const listeners = new Set<() => void>();
let stopPerfil: Unsubscribe | null = null;
// True after "Salir" in this tab: the next login starts at the home instead of the last page.
let salidaVoluntaria = false;

export const fueSalidaVoluntaria = () => salidaVoluntaria;

function setSession(next: Session) {
  session = next;
  listeners.forEach((listener) => listener());
}

onAuthStateChanged(auth, (user) => {
  stopPerfil?.();
  stopPerfil = null;
  if (!user) {
    setSession({ status: "guest" });
    return;
  }
  salidaVoluntaria = false;
  stopPerfil = onSnapshot(
    doc(db, "usuarios", user.uid),
    (snap) => {
      if (snap.exists()) {
        setSession({ status: "ready", user, perfil: { uid: user.uid, ...snap.data() } as Perfil });
      } else {
        setSession({ status: "incomplete", user });
      }
    },
    () => setSession({ status: "incomplete", user }),
  );
});

export function useSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => session,
  );
}

// For screens inside RequireAuth, where the profile always exists.
export function usePerfil() {
  const current = useSession();
  if (current.status !== "ready") throw new Error("usePerfil fuera de una ruta con sesión");
  return current.perfil;
}

// The login is by document number: `documentos/{nro_documento}` maps it to the account email.
async function emailDeDocumento(nroDocumento: string) {
  const snap = await getDoc(doc(db, "documentos", nroDocumento));
  return snap.exists() ? (snap.data().email as string) : null;
}

// "Recordarme": the session survives closing the browser (shared by every tab) and the document
// number is prefilled next time. Without it, the session lasts while the tab is open and nothing
// is kept. The app never stores the password: the browser's password manager does, if the person
// accepts.
const DOCUMENTO_KEY = "pulso-documento";

export function documentoRecordado() {
  try {
    return localStorage.getItem(DOCUMENTO_KEY) ?? "";
  } catch {
    return "";
  }
}

export async function signIn(nroDocumento: string, password: string, recordar = true) {
  // Saying which part failed reveals nothing new: documentos/{nro} is readable one by one.
  const email = await emailDeDocumento(nroDocumento);
  if (!email) throw new AuthError("sin-cuenta");
  await setPersistence(auth, recordar ? indexedDBLocalPersistence : browserSessionPersistence);
  await signInWithEmailAndPassword(auth, email, password);
  try {
    if (recordar) localStorage.setItem(DOCUMENTO_KEY, nroDocumento);
    else localStorage.removeItem(DOCUMENTO_KEY);
  } catch {
    // Blocked storage: the session works anyway, the number is just not prefilled.
  }
  if (recordar) ofrecerGuardarContrasena(nroDocumento, password);
}

type PasswordCredentialConstructor = new (data: { id: string; password: string }) => Credential;

// Asks the browser's password manager to save the login (Chrome, Edge). A single-page app has no
// real form submission, so without this the browser does not always offer it; elsewhere the
// username / current-password autocomplete fields still let it offer.
function ofrecerGuardarContrasena(nroDocumento: string, password: string) {
  const Credential = (window as { PasswordCredential?: PasswordCredentialConstructor })
    .PasswordCredential;
  if (!Credential || !navigator.credentials) return;
  navigator.credentials.store(new Credential({ id: nroDocumento, password })).catch(() => {});
}

export async function register(datos: {
  rol: Role;
  nombre: string;
  nro_documento: string;
  email: string;
  password: string;
  instrumentos: InstrumentId[];
}) {
  if (await emailDeDocumento(datos.nro_documento)) throw new AuthError("documento-en-uso");
  const { user } = await createUserWithEmailAndPassword(auth, datos.email, datos.password);
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "documentos", datos.nro_documento), { uid: user.uid, email: user.email });
    batch.set(doc(db, "usuarios", user.uid), {
      rol: datos.rol,
      nombre: datos.nombre,
      nro_documento: datos.nro_documento,
      instrumentos: datos.instrumentos,
      terminos: terminosDeBusqueda(datos.nombre),
      creadoEn: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    // Do not leave an account without profile behind.
    await user.delete().catch(() => {});
    throw error;
  }
}

// Both must match the same account: the document number and its email.
export async function resetPassword(nroDocumento: string, email: string) {
  const emailCuenta = await emailDeDocumento(nroDocumento);
  if (!emailCuenta) throw new AuthError("sin-cuenta");
  if (emailCuenta.toLowerCase() !== email.trim().toLowerCase())
    throw new AuthError("correo-no-coincide");
  await sendPasswordResetEmail(auth, emailCuenta);
}

export function signOut() {
  salidaVoluntaria = true;
  return firebaseSignOut(auth);
}

// An account whose sign-up failed halfway (Auth account without profile): delete it so the
// person can register again with the same email. Checks the server first, so a read error
// never deletes an account that does have its profile.
export async function descartarCuentaIncompleta() {
  const user = auth.currentUser;
  try {
    if (user && !(await getDocFromServer(doc(db, "usuarios", user.uid))).exists()) {
      await user.delete();
    }
  } finally {
    await signOut();
  }
}

class AuthError extends Error {}

// User-facing message for any error thrown by the functions above.
export function mensajeDeError(error: unknown) {
  const code = error instanceof AuthError ? error.message : (error as FirebaseError)?.code;
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Contraseña incorrecta.";
    case "auth/user-not-found":
      return "La cuenta de ese número de documento ya no existe. Vuelve a registrarte.";
    case "documento-en-uso":
      return "Ya existe una cuenta con ese número de documento.";
    case "sin-cuenta":
      return "No hay ninguna cuenta con ese número de documento.";
    case "correo-no-coincide":
      return "El correo no coincide con el de la cuenta de ese número de documento.";
    case "auth/email-already-in-use":
      return "Ese correo ya está registrado en otra cuenta.";
    case "auth/invalid-email":
      return "Revisa el correo.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
    case "auth/network-request-failed":
    case "unavailable":
      return "Sin conexión. Revisa tu internet y vuelve a probar.";
    default:
      return "Algo salió mal. Vuelve a probar.";
  }
}
