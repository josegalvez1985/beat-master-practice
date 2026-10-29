import { useSyncExternalStore } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
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

export async function signIn(nroDocumento: string, password: string) {
  const email = await emailDeDocumento(nroDocumento);
  if (!email) throw new AuthError("credenciales");
  await signInWithEmailAndPassword(auth, email, password);
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

class AuthError extends Error {}

// User-facing message for any error thrown by the functions above.
export function mensajeDeError(error: unknown) {
  const code = error instanceof AuthError ? error.message : (error as FirebaseError)?.code;
  switch (code) {
    case "credenciales":
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Número de documento o contraseña incorrectos.";
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
