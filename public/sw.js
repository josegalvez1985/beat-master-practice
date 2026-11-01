// Offline use: the app and every file it already used (build files, fonts, sounds) stay in the
// browser's cache, so the tools open without internet. Only GET requests to this site; Firebase,
// Google Fonts and other sites always go to the network. Registered in src/main.tsx.
const CACHE = "pulso-v1";
const BASE = new URL("./", self.location).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(BASE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const guardar = (clave, respuesta) =>
  caches
    .open(CACHE)
    .then((cache) => cache.put(clave, respuesta))
    .catch(() => {});

// Push notices from the Cloud Functions (functions/src/avisos.ts): data-only messages, shown
// here. Tapping one opens its page (or focuses the open app and takes it there).
self.addEventListener("push", (event) => {
  let mensaje = {};
  try {
    mensaje = event.data ? event.data.json() : {};
  } catch {
    // Not JSON: show the generic notice.
  }
  const datos = mensaje.data || mensaje;
  event.waitUntil(
    self.registration.showNotification(datos.titulo || "Pulso", {
      body: datos.cuerpo || "",
      icon: BASE + "icons/icon-192.png",
      badge: BASE + "icons/icon-192.png",
      tag: datos.tag || undefined,
      data: { url: datos.url || BASE },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || BASE, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => v.url.startsWith(self.location.origin));
      if (abierta) return abierta.navigate(url).then((v) => (v || abierta).focus());
      return self.clients.openWindow(url);
    }),
  );
});

// While developing (localhost) nothing is cached: Vite serves fresh modules.
const DESARROLLO = ["localhost", "127.0.0.1"].includes(self.location.hostname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (DESARROLLO) return;
  const url = new URL(request.url);
  // Audio and video are requested in ranges (206), which the cache cannot store.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("range")
  )
    return;

  // Pages: the network first (it may be a new version), the saved app without internet.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          if (respuesta.ok) guardar(BASE, respuesta.clone());
          return respuesta;
        })
        .catch(() => caches.match(BASE)),
    );
    return;
  }

  // Build files have a hash in their name: once saved, they never change.
  event.respondWith(
    caches.match(request).then(
      (guardada) =>
        guardada ??
        fetch(request).then((respuesta) => {
          if (respuesta.ok && respuesta.status === 200 && respuesta.type === "basic")
            guardar(request, respuesta.clone());
          return respuesta;
        }),
    ),
  );
});
