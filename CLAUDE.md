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
- Al agregar una colección, documenta su fila en _Relaciones actuales_ de `docs/backend.md` y su
  modelo en `docs/arquitectura.md`.

## Datos del proyecto

- La base de Firestore se llama **`default`** (sin paréntesis): `getFirestore(app, "default")`,
  `"database": "default"` en `firebase.json`, `/databases/default/...` en `storage.rules`.
- Los cambios en `firestore.rules` / `storage.rules` se publican a mano: `npm run deploy:reglas`.
- `index.html` define `global = globalThis` (lo necesita `Animated` de react-native-web).

## Comandos

`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run format`

En Windows con `core.autocrlf=true`, `npm run lint` marca `Delete ␍` en todos los archivos: es el fin
de línea, no el código. Para comprobar formato: `npx prettier --check <archivos> --end-of-line auto`.
