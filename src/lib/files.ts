import { useEffect, useState } from "react";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
  type StorageError,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

export type MaterialTipo = "audio" | "video" | "pdf" | "partitura" | "imagen" | "otro";

// A file stored in Firebase Storage, as saved in Firestore.
export type Material = {
  id: string;
  nombre: string;
  tipo: MaterialTipo;
  ruta: string;
  tamano: number;
  contentType: string;
  // Recordings made in the app: what the browser measured before sending (src/lib/analisis.ts).
  analisis?: { afinacion?: number; desvioMs?: number; bpm?: number; notas?: number };
};

// Keep in sync with the size limit in storage.rules.
export const MAX_BYTES = 200 * 1024 * 1024;

export const ACCEPT_MATERIAL =
  "audio/*,video/*,image/*,application/pdf,.musicxml,.mxl,.xml,.gp,.gp3,.gp4,.gp5,.gpx";
// Deliveries: recordings, and photos or PDFs of written work (theory, a copied score).
export const ACCEPT_ENTREGA = "audio/*,video/*,image/*,application/pdf";
// Keep in sync with storage.rules: photos and PDFs of a delivery up to 20 MB.
export const MAX_BYTES_DOCUMENTO = 20 * 1024 * 1024;
export const limiteDeEntrega = (file: File) =>
  file.type.startsWith("audio/") || file.type.startsWith("video/")
    ? MAX_BYTES
    : MAX_BYTES_DOCUMENTO;

// Sheet music alphaTab can draw: MusicXML and Guitar Pro.
const PARTITURA = /\.(musicxml|mxl|xml|gp|gp3|gp4|gp5|gpx)$/i;

export function tipoDeArchivo(nombre: string, contentType: string): MaterialTipo {
  if (PARTITURA.test(nombre)) return "partitura";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) return "imagen";
  return "otro";
}

function contentTypeDe(file: File) {
  if (file.type) return file.type;
  if (/\.mxl$/i.test(file.name)) return "application/vnd.recordare.musicxml";
  if (/\.(musicxml|xml)$/i.test(file.name)) return "application/vnd.recordare.musicxml+xml";
  return "application/octet-stream";
}

// Phones and tablets: a touch screen as the main pointer. Only there "Sacar foto" opens a camera.
export const conCamara = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

// Takes a photo with the camera app. Cameras name every shot alike ("image.jpg"), so it gets the
// date and time instead: "Foto 2026-11-02 11.30.jpg".
export async function sacarFoto() {
  const [file] = await elegirArchivos({
    accept: "image/*",
    multiple: false,
    capture: "environment",
  });
  if (!file) return null;
  const ahora = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  const extension = file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg";
  const nombre = `Foto ${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())} ${dos(ahora.getHours())}.${dos(ahora.getMinutes())}${extension}`;
  return new File([file], nombre, { type: file.type || "image/jpeg" });
}

export function formatearTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Opens the browser file picker; resolves with the chosen files (empty if cancelled).
// `capture` opens the camera instead on phones and tablets (desktop browsers ignore it).
export function elegirArchivos({
  accept,
  multiple = true,
  capture,
}: {
  accept: string;
  multiple?: boolean;
  capture?: "environment" | "user";
}) {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    if (capture) input.setAttribute("capture", capture);
    input.onchange = () => resolve([...(input.files ?? [])]);
    input.oncancel = () => resolve([]);
    input.click();
  });
}

// Uploads to `carpeta/<timestamp>-<name>` reporting 0–100 progress.
export function subirArchivo(
  carpeta: string,
  file: File,
  onProgress: (porcentaje: number) => void,
) {
  const contentType = contentTypeDe(file);
  const nombreSeguro = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const id = `${Date.now()}-${nombreSeguro}`;
  const ruta = `${carpeta}/${id}`;
  const task = uploadBytesResumable(ref(storage, ruta), file, { contentType });

  return new Promise<Material>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () =>
        resolve({
          id,
          nombre: file.name,
          tipo: tipoDeArchivo(file.name, contentType),
          ruta,
          tamano: file.size,
          contentType,
        }),
    );
  });
}

// Uploads and then saves the reference in Firestore (`anotar`). If saving fails, the file is
// deleted so it is not left orphaned in Storage.
export async function subirYAnotar(
  carpeta: string,
  file: File,
  onProgress: (porcentaje: number) => void,
  anotar: (material: Material) => Promise<void>,
) {
  const material = await subirArchivo(carpeta, file, onProgress);
  try {
    await anotar(material);
  } catch (error) {
    await borrarArchivo(material.ruta).catch(() => {});
    throw error;
  }
  return material;
}

// Why an upload failed, with Firebase's code so it can be looked up in docs/firebase.md
// (Problemas comunes). The full error goes to the console.
export function motivoDeSubida(error: unknown) {
  console.error("subida", error);
  const codigo = (error as { code?: string } | null)?.code;
  if (codigo === "permission-denied" || codigo === "storage/unauthorized")
    return `Firebase no lo permitió (${codigo})`;
  if (codigo === "unavailable" || codigo === "storage/retry-limit-exceeded")
    return "Sin conexión: vuelve a intentar";
  return codigo ? `No se pudo subir (${codigo})` : "No se pudo subir";
}

// Already gone counts as deleted; any other failure is thrown, so callers can keep the
// Firestore reference instead of leaving the file orphaned in Storage.
export async function borrarArchivo(ruta: string) {
  try {
    await deleteObject(ref(storage, ruta));
  } catch (error) {
    if ((error as StorageError)?.code !== "storage/object-not-found") throw error;
  }
}

// Download URL of a stored file, or null until it resolves (or if it fails).
// `version` changes when a file is replaced at the same path, so the browser skips its cached copy.
export function useDownloadUrl(ruta: string | null, version?: number) {
  const key = ruta && `${ruta}#${version ?? ""}`;
  const [url, setUrl] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!ruta || !key) return;
    let activo = true;
    getDownloadURL(ref(storage, ruta)).then(
      (value) => activo && setUrl({ key, url: version ? `${value}&v=${version}` : value }),
      () => activo && setUrl({ key, url: null }),
    );
    return () => {
      activo = false;
    };
  }, [ruta, key, version]);

  return url && url.key === key ? url.url : null;
}

// --- Profile photo ---

export const ACCEPT_FOTO = "image/jpeg,image/png,image/webp";
// One fixed path per user: a new photo overwrites the previous one, which is never orphaned.
export const fotoRuta = (uid: string) => `usuarios/${uid}/foto.jpg`;
const FOTO_LADO = 512;

// Crops the center square and scales it down to at most 512 px JPEG in the browser (about
// 50–120 KB), whatever the size of the original; smaller photos are never enlarged.
// It shrinks by halves: one big jump (4000 → 512 px) blurs or aliases in some browsers.
export async function prepararFoto(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const lado = Math.min(bitmap.width, bitmap.height);
  // First step: crop to the largest 512 × 2^n that fits, then halve down to 512.
  let size = lado <= FOTO_LADO ? lado : FOTO_LADO * 2 ** Math.floor(Math.log2(lado / FOTO_LADO));
  let canvas = dibujar(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, size);
  bitmap.close();
  while (size > FOTO_LADO) {
    size /= 2;
    canvas = dibujar(canvas, 0, 0, size * 2, size);
  }
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Sin imagen"))),
      "image/jpeg",
      0.9,
    ),
  );
}

// Draws the square (x, y, lado) of `source` into a new size × size canvas.
function dibujar(source: CanvasImageSource, x: number, y: number, lado: number, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Sin canvas");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, x, y, lado, lado, 0, 0, size, size);
  return canvas;
}

export async function subirFoto(uid: string, foto: Blob) {
  await uploadBytes(ref(storage, fotoRuta(uid)), foto, { contentType: "image/jpeg" });
}
