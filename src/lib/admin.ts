import { httpsCallable } from "firebase/functions";
import type { Perfil } from "@/lib/auth";
import { functions } from "@/lib/firebase";

// The admin panel (/admin) is for the owner of this document number only. This check just
// shows or hides the page: the real one is in the Cloud Function (functions/src/admin.ts, same
// number), which reads documentos/{nro} on every call. Read-only.
export const ADMIN_DOCUMENTO = "4169298";

export const esAdmin = (perfil: Perfil) => perfil.nro_documento === ADMIN_DOCUMENTO;

export type ColeccionResumen = { nombre: string; total: number };
export type DocumentoBackend = {
  id: string;
  datos: Record<string, unknown>;
  creado: string;
  actualizado: string;
};
export type CuentaBackend = {
  uid: string;
  email: string | null;
  deshabilitada: boolean;
  creada: string;
  ultimoIngreso: string | null;
  conPerfil: boolean;
};
export type ArchivoBackend = {
  ruta: string;
  tamano: number;
  tipo: string | null;
  actualizado: string | null;
};

type Pagina<K extends string, T> = Record<K, T[]> & { siguiente: string | null };

const llamar = httpsCallable<Record<string, string | undefined>, unknown>(functions, "verBackend", {
  timeout: 70_000,
});

const pedir = async <T>(datos: Record<string, string | undefined>) =>
  (await llamar(datos)).data as T;

export const verResumen = () => pedir<{ colecciones: ColeccionResumen[] }>({ que: "resumen" });

export const verColeccion = (coleccion: string, despues?: string) =>
  pedir<Pagina<"documentos", DocumentoBackend>>({ que: "coleccion", coleccion, despues });

export const verCuentas = (pagina?: string) =>
  pedir<Pagina<"cuentas", CuentaBackend>>({ que: "cuentas", pagina });

export const verArchivos = (pagina?: string) =>
  pedir<Pagina<"archivos", ArchivoBackend>>({ que: "archivos", pagina });
