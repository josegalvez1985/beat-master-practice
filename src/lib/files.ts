import { useEffect, useState } from "react";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
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
};

// Keep in sync with the size limit in storage.rules.
export const MAX_BYTES = 200 * 1024 * 1024;

export const ACCEPT_MATERIAL = "audio/*,video/*,image/*,application/pdf,.musicxml,.mxl,.xml";
export const ACCEPT_ENTREGA = "audio/*,video/*";

const PARTITURA = /\.(musicxml|mxl|xml)$/i;

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
  if (PARTITURA.test(file.name)) return "application/vnd.recordare.musicxml+xml";
  return "application/octet-stream";
}

export function formatearTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Opens the browser file picker; resolves with the chosen files (empty if cancelled).
export function elegirArchivos({
  accept,
  multiple = true,
}: {
  accept: string;
  multiple?: boolean;
}) {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
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

export function borrarArchivo(ruta: string) {
  return deleteObject(ref(storage, ruta)).catch(() => {});
}

// Download URL of a stored file, or null until it resolves (or if it fails).
export function useDownloadUrl(ruta: string | null) {
  const [url, setUrl] = useState<{ ruta: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!ruta) return;
    let activo = true;
    getDownloadURL(ref(storage, ruta)).then(
      (value) => activo && setUrl({ ruta, url: value }),
      () => activo && setUrl({ ruta, url: null }),
    );
    return () => {
      activo = false;
    };
  }, [ruta]);

  return url && url.ruta === ruta ? url.url : null;
}
