import { useEffect } from "react";

// Keeps the screen on while `activa`: with the hands on the instrument nobody can touch it. The
// browser drops the lock when the tab is hidden, so it is asked again on coming back. Where the
// browser cannot do it, nothing changes.
export function usePantallaEncendida(activa: boolean) {
  useEffect(() => {
    if (!activa || !("wakeLock" in navigator)) return;
    let bloqueo: WakeLockSentinel | null = null;
    let vivo = true;
    const pedir = async () => {
      try {
        const nuevo = await navigator.wakeLock.request("screen");
        if (vivo) bloqueo = nuevo;
        else void nuevo.release();
      } catch {
        // Low battery or not allowed: the screen just follows its usual timer.
      }
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") void pedir();
    };
    void pedir();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", alVolver);
      void bloqueo?.release();
    };
  }, [activa]);
}
