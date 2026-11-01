import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { app, db } from "@/lib/firebase";

// Push notices (Firebase Cloud Messaging): this browser's token is saved in
// `dispositivos/{token}` with the user's uid; the Cloud Functions in functions/src/avisos.ts
// send to it. public/sw.js shows them. The VAPID key is public (Firebase console → Cloud
// Messaging → Web Push certificates) and goes in VITE_FIREBASE_VAPID_KEY.

const VAPID = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const CLAVE = "pulso-avisos-token";

export type EstadoAvisos = "sin-configurar" | "no-soportado" | "bloqueado" | "apagado" | "activo";

export function tokenGuardado() {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (!VAPID) return "sin-configurar";
  if (!("serviceWorker" in navigator) || !("Notification" in window) || !(await isSupported()))
    return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  return Notification.permission === "granted" && tokenGuardado() ? "activo" : "apagado";
}

export async function activarAvisos(uid: string) {
  if (!VAPID) throw new Error("sin-configurar");
  if ((await Notification.requestPermission()) !== "granted") throw new Error("bloqueado");
  const registro =
    (await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)) ??
    (await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`));
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID,
    serviceWorkerRegistration: registro,
  });
  await setDoc(doc(db, "dispositivos", token), { uid, creadoEn: serverTimestamp() });
  try {
    localStorage.setItem(CLAVE, token);
  } catch {
    // Without storage the device cannot be turned off from here; "Salir" still cannot find it,
    // and the Function deletes it when the token stops working.
  }
}

// Turning off (and on "Salir"): the device document first, then the browser token.
export async function desactivarAvisos() {
  const token = tokenGuardado();
  if (!token) return;
  await deleteDoc(doc(db, "dispositivos", token));
  await deleteToken(getMessaging(app)).catch(() => {});
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Nothing else to clean.
  }
}
