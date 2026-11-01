# Pulso (beat-master-practice)

Plataforma web para enseñar y practicar instrumentos. React 19 + react-native-web + Vite + React
Router; backend solo **Firebase** (Auth, Firestore, Storage), sin servidor propio. Guías en
[`docs/`](docs/) y resumen en [README.md](README.md). Documentación y textos de la app en español.

## Backend: leer antes de tocar datos

**Firestore es NoSQL**: no hay claves foráneas, `JOIN` ni borrado en cascada. Antes de crear o
cambiar una colección, un campo, una regla o un flujo que cree o borre registros, lee
[docs/backend.md](docs/backend.md).

- **Regla del proyecto: no pueden quedar registros huérfanos** (documentos de Firestore ni
  archivos de Storage). Toda colección se relaciona con otra.
- Siempre las tres: **`writeBatch`** para lo que depende entre sí, **reglas** que comprueban la
  relación (`exists`/`get`, o `existsAfter`/`getAfter` si nacen juntos) y **borrado en cascada**
  (archivos de Storage primero, después un batch con los documentos).
- Datos duplicados (`alumnoNombre`, `profesorNombre`…): si cambia el original, se actualizan las
  copias en el mismo batch.
- Borrar con "Deshacer" (`avisar` en `src/components/ui/toast.tsx`): durante el plazo solo se
  oculta; el borrado real (archivos primero) ocurre al vencer. Nunca quitar la referencia antes que
  el archivo.
- Al agregar una colección, documenta su fila en _Relaciones actuales_ de `docs/backend.md` y su
  modelo en `docs/arquitectura.md`.

## Interfaz

- Tema claro y oscuro con variables CSS: los colores salen **solo** de `colors` en
  `src/lib/theme.ts`; un color nuevo se agrega como token en las dos paletas (`dark` y `light`).
  Nada de hex o rgba sueltos en las pantallas, salvo los tintes ámbar translúcidos.
- Ámbar sólido solo para la acción principal, el progreso y lo que suena; una opción seleccionada usa
  `colors.selected` + borde `colors.primary` (ver `docs/diseno.md`).
- Títulos con `fonts.heading` / `fonts.headingBold` en minúsculas; `fonts.display` (Bebas, solo
  mayúsculas) únicamente para la marca y números grandes.
- El logo (`src/components/ui/logo.tsx`) copia el dibujo de `public/favicon.svg`; al cambiarlo,
  correr `npm run iconos` y subir el `?v=` de los íconos y de `og-image.png` en `index.html`.
- Ilustraciones: SVG en el código + animaciones CSS de `transform`/`opacity`, nunca imágenes,
  videos ni librerías de animación; reutilizar `EscenaMusical` (`src/components/ui/escena-musical.tsx`)
  y respetar `prefers-reduced-motion` (ver `docs/diseno.md`, _Ilustraciones y animación_).
- Al agregar algo visible para alumnos o profesores, actualizar _Primeros pasos_
  (`src/components/PrimerosPasosDialog.tsx`) y las guías.
- Textos para Google: `SITE_TITLE` / `SITE_DESCRIPTION` en `src/lib/site.ts` e iguales en
  `index.html`. Dicen exactamente qué es Pulso (exclusiva para profesores de música y sus alumnos),
  nunca "clases de … en …": no es un directorio de profesores (ver `docs/despliegue.md`).

## Plan de clase (bloques)

- Modelo en `src/lib/plan.ts`, componentes en `src/components/plan/`. Tablaturas y partituras con
  alphaTab (`@coderline/alphatab`, versión exacta, sin workers, carga diferida).
- Los archivos de los bloques viven en `clases/{claseId}/`: subirlos guarda el plan al instante y
  sobre el plan más reciente (`ultimo` en `PlanClase`), y `archivosDelPlan` entra en la cascada de
  `eliminarClase`.

## Seguimiento, mensajes y sin conexión

- Colecciones nuevas: `biblioteca` (bloques del profesor, nunca de archivos), `logros` (mismo id que
  la inscripción; `quitarInscripcion` la borra en el mismo batch) y `mensajes` (cuelgan de la clase;
  `eliminarClase` los borra en batches antes que la clase). Hora, modalidad, enlace, asistencia y
  recital van dentro de `clases`; la rúbrica (`evaluacion`, solo la escribe el profesor), dentro de
  la entrega; el análisis de la grabación, dentro del `Material`.
- Ids que se guardan y por eso solo se agregan: criterios de `src/lib/rubrica.ts` y objetivos de
  `src/lib/ruta.ts`. Las insignias (`src/lib/insignias.ts`) se calculan, no se guardan.
- Sin conexión: `public/sw.js` (solo GET del propio sitio, nunca Firebase) y `persistentLocalCache`
  en `src/lib/firebase.ts`; `signOut` borra esa copia y recarga en la portada.
- `repertorio` y `metas` cuelgan de la inscripción (`quitarInscripcion(inscripcion)` los borra
  antes que ella); `dispositivos/{token}` (avisos FCM) se borra al salir y cuando el token muere.
  Las respuestas a devoluciones (`entregas.respuestas`) se quitan con su devolución.
- Avisos: `functions/src/avisos.ts` en `us-central1` (la base está en `nam5`); clave pública
  `VITE_FIREBASE_VAPID_KEY` en `.env`.
- Polca, guarania y galopa son formas por grados (`src/lib/progresiones.ts`): sin canciones ni letras.

## Herramientas y batería

- Instrumentos (17): la lista vive en `src/lib/instruments.ts` y está copiada en `firestore.rules`
  (`instrumentosValidos`), `functions/src/herramientas.ts` (`INSTRUMENTOS`) e `index.html`; sumar uno
  es tocar los cuatro y publicar las reglas.
- Cada herramienta se habilita **por instrumento** en `src/lib/herramientas.ts` (`para`); nunca para
  todos. `/herramientas` es para alumnos y profesores (el diario, solo alumnos).
- Los grooves se guardan como un texto por pieza del kit (Firestore no admite listas de listas).
- Los ids de `RUDIMENTOS` (`src/lib/bateria.ts`) solo se agregan, nunca se quitan ni se renombran:
  los `records` los nombran y la lista está copiada en `firestore.rules`.
- Afinador, grabadora y medidor de tiempo usan el micrófono: exigen HTTPS (o `localhost`). Todo el
  sonido sale de un solo `AudioContext` (`src/lib/audio.ts`).

## Datos del proyecto

- La base de Firestore se llama **`default`** (sin paréntesis): `getFirestore(app, "default")`,
  `"database": "default"` en `firebase.json`, `/databases/default/...` en `storage.rules`.
- Los cambios en `firestore.rules` / `storage.rules` se publican a mano: `npm run deploy:reglas`.
- Asistente con IA: Cloud Function `preguntarAsistente` (`functions/`), clave en Secret Manager
  (`ANTHROPIC_API_KEY`, nunca en archivos). Solo lectura y solo los datos de quien pregunta: cada
  búsqueda nueva en `functions/src/herramientas.ts` filtra por su uid (el Admin SDK no pasa por las
  reglas). Publicar con `npm run deploy:funciones`.
- Contacto: correo por Web3Forms (`src/lib/contacto.ts`, clave pública `VITE_WEB3FORMS_KEY` en
  `.env`); no guarda nada en Firebase.
- `index.html` define `global = globalThis` (lo necesita `Animated` de react-native-web).

## Comandos

`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run format`

En Windows con `core.autocrlf=true`, `npm run lint` marca `Delete ␍` en todos los archivos: es el fin
de línea, no el código. Para comprobar formato: `npx prettier --check <archivos> --end-of-line auto`.
