import type { ModoGrabacion } from "@/lib/grabadora";

// A recording not sent yet, kept in this browser (IndexedDB): closing the tab or losing the
// connection does not lose it. One per folder of a delivery, deleted when sent or discarded and on
// "Salir" (a shared computer). If the browser cannot store it, everything still works, without it.

export type Borrador = { file: File; modo: ModoGrabacion; segundos: number; bpm?: number };

const BASE = "pulso-borradores";
const ALMACEN = "tomas";

function abrir() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function usar<T>(modo: IDBTransactionMode, accion: (almacen: IDBObjectStore) => IDBRequest) {
  const base = await abrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaccion = base.transaction(ALMACEN, modo);
      const pedido = accion(transaccion.objectStore(ALMACEN));
      transaccion.oncomplete = () => resolve(pedido.result as T);
      transaccion.onerror = () => reject(transaccion.error);
      transaccion.onabort = () => reject(transaccion.error);
    });
  } finally {
    base.close();
  }
}

export async function guardarBorrador(clave: string, borrador: Borrador) {
  try {
    await usar("readwrite", (almacen) => almacen.put(borrador, clave));
  } catch {
    // Private window or no room: the take lasts until the page closes.
  }
}

export async function leerBorrador(clave: string) {
  try {
    return (await usar<Borrador | undefined>("readonly", (almacen) => almacen.get(clave))) ?? null;
  } catch {
    return null;
  }
}

export async function borrarBorrador(clave: string) {
  try {
    await usar("readwrite", (almacen) => almacen.delete(clave));
  } catch {
    // Nothing was kept.
  }
}

// On "Salir": the takes of this account do not stay on a shared computer.
export function borrarTodosLosBorradores() {
  try {
    indexedDB.deleteDatabase(BASE);
  } catch {
    // Nothing was kept.
  }
}
