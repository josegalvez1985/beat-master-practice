import { httpsCallable } from "firebase/functions";
import type { Perfil } from "@/lib/auth";
import { functions } from "@/lib/firebase";

// The admin panel (/admin) is for the owner of this document number only. This check just
// shows or hides the page: the real one is in the Cloud Function (functions/src/admin.ts, same
// number), which reads documentos/{nro} on every call. Read-only, except the plans below.
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

// --- Profesor plans (functions/src/planes.ts). These write: activarPlan records a payment and
// extends the plan (optionally with its own number of alumnos); habilitarDias grants days as an
// exception; crearPruebas gives the 30-day trial to profesores from before the plans.

export type PlanProfesorAdmin = {
  uid: string;
  nombre: string;
  documento: string;
  telefono: string | null;
  // The admin account: everything enabled, whatever its plan.
  admin: boolean;
  plan: "prueba" | "inicial" | "profesor" | "academia" | null;
  vence: string | null;
  bloqueo: string | null;
  alumnos: number;
  limite: number;
  // A number of alumnos set by hand instead of the plan's.
  aMedida: boolean;
};
export type PagoAdmin = {
  id: string;
  tipo: "pago" | "cortesia";
  motivo: string | null;
  alumnos: number | null;
  profesor: string;
  plan: string;
  meses: number;
  monto: number;
  referencia: string;
  hasta: string;
  registradoEn: string | null;
};

const planesAdmin = httpsCallable<{ que: "listar" | "crearPruebas" | "prepararDatos" }, unknown>(
  functions,
  "planesAdmin",
  { timeout: 70_000 },
);

export const verPlanes = async () =>
  (await planesAdmin({ que: "listar" })).data as {
    profesores: PlanProfesorAdmin[];
    pagos: PagoAdmin[];
    // Data from before classes had a destination and deliveries a review (functions/src/planes.ts).
    porPreparar: { clases: number; entregas: number };
  };

export const prepararDatos = async () =>
  (await planesAdmin({ que: "prepararDatos" })).data as { clases: number; entregas: number };

export const crearPruebasFaltantes = async () =>
  (await planesAdmin({ que: "crearPruebas" })).data as { creadas: number };

export const activarPlan = async (datos: {
  profesorId: string;
  plan: "inicial" | "profesor" | "academia";
  meses: number;
  monto: number;
  referencia: string;
  // Own number of alumnos; null = the plan's.
  alumnos: number | null;
}) =>
  (await httpsCallable(functions, "activarPlan", { timeout: 70_000 })(datos)).data as {
    desde: string;
    hasta: string;
  };

export const habilitarDias = async (
  datos: { profesorId: string; motivo: string } & ({ dias: number } | { hasta: string }),
) =>
  (await httpsCallable(functions, "habilitarDias", { timeout: 70_000 })(datos)).data as {
    hasta: string;
  };
