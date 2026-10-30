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
  correr `npm run iconos`.

## Plan de clase (bloques)

- Modelo en `src/lib/plan.ts`, componentes en `src/components/plan/`. Tablaturas y partituras con
  alphaTab (`@coderline/alphatab`, versión exacta, sin workers, carga diferida).
- Los archivos de los bloques viven en `clases/{claseId}/`: subirlos guarda el plan al instante y
  sobre el plan más reciente (`ultimo` en `PlanClase`), y `archivosDelPlan` entra en la cascada de
  `eliminarClase`.

## Datos del proyecto

- La base de Firestore se llama **`default`** (sin paréntesis): `getFirestore(app, "default")`,
  `"database": "default"` en `firebase.json`, `/databases/default/...` en `storage.rules`.
- Los cambios en `firestore.rules` / `storage.rules` se publican a mano: `npm run deploy:reglas`.
- `index.html` define `global = globalThis` (lo necesita `Animated` de react-native-web).

## Comandos

`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run format`

En Windows con `core.autocrlf=true`, `npm run lint` marca `Delete ␍` en todos los archivos: es el fin
de línea, no el código. Para comprobar formato: `npx prettier --check <archivos> --end-of-line auto`.
