# Arquitectura

## Visión general

Pulso es una aplicación **solo web** para enseñar y practicar instrumentos musicales. Hay dos roles:

- **Profesor**: enseña uno o varios instrumentos, arma sus listas de alumnos, planifica clases por
  semana, mes o año, sube materiales y sigue el progreso de cada alumno.
- **Alumno**: estudia uno o varios instrumentos. Solo ve las clases de un profesor **después** de que
  ese profesor lo agrega a su lista. Sube sus prácticas en audio o video.

Toda cuenta se identifica por su **número de documento** (`nro_documento`): con él se registra, entra
y lo buscan los profesores.

| Capa     | Tecnología                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------- |
| Interfaz | React 19 con la API de React Native (`View`, `Text`, `Pressable`…) renderizada por **react-native-web** |
| Build    | **Vite** (`react-native` → `react-native-web` por alias en `vite.config.ts`)                            |
| Rutas    | **React Router** (`src/main.tsx`)                                                                       |
| Backend  | **Firebase**: Authentication, Cloud Firestore (base **`default`**), Cloud Storage ([guía](firebase.md)) |

> **`global` en el navegador.** El `Animated` de react-native-web (lo usa el metrónomo) llama a
> `global.cancelAnimationFrame`, que solo existe en Node. Un script en [`index.html`](../index.html)
> define `global = globalThis` antes de cargar la app. No se resuelve con `define` en
> `vite.config.ts`: en desarrollo, Vite no lo aplica a las dependencias preempaquetadas.
> | Publicación | GitHub Pages con GitHub Actions ([guía](despliegue.md)) |

## Rutas

| Ruta                 | Quién      | Pantalla                                                                                               |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `/login`             | sin sesión | Login con número de documento. Modales: `?modal=registro`, `?modal=recuperar`, `?modal=primeros-pasos` |
| `/registro`          | sin sesión | Redirige a `/login?modal=registro`                                                                     |
| `/`                  | con sesión | Inicio según el rol (profesor o alumno)                                                                |
| `/planificacion`     | profesor   | Clases por semana, mes o año                                                                           |
| `/alumnos/:alumnoId` | profesor   | Progreso de un alumno y estado de cada clase                                                           |
| `/clases/:claseId`   | ambos      | Detalle de la clase: materiales, entrega del alumno o entregas de todos                                |
| cualquier otra       | —          | 404                                                                                                    |

Los guardas están en [`RouteGuards.tsx`](../src/components/RouteGuards.tsx):

- `RequireAuth`: sin sesión manda a `/login` y, al entrar, vuelve a la pantalla que se quería abrir
  (salvo que la persona haya tocado **Salir**: entonces empieza en el inicio).
- `GuestOnly`: con sesión, el login redirige al inicio.
- `RequireRole`: pantallas solo de profesor.

## Sesión

Firebase Auth guarda la sesión en IndexedDB, que comparten **todas las pestañas y ventanas** del
dominio: abrir una pestaña nueva o recargar no pide entrar otra vez, y **Salir** en una pestaña
cierra la sesión en todas. [`src/lib/auth.ts`](../src/lib/auth.ts) combina la sesión con el perfil
de Firestore y lo expone con `useSession()` / `usePerfil()`.

### Login, registro y recuperación con número de documento

Firebase Auth trabaja con correo, así que el documento se traduce a correo con
`documentos/{nro_documento}`:

1. **Registro**: comprueba que el documento esté libre, crea la cuenta con correo y contraseña y, en
   una sola escritura, guarda `documentos/{nro}` y `usuarios/{uid}`. Si algo falla, borra la cuenta
   para no dejarla a medias. Si tampoco se pudo borrar, al entrar la sesión queda _incompleta_
   (cuenta sin perfil): la pantalla "Tu cuenta no terminó de crearse" la borra al tocar **Salir**,
   después de confirmar en el servidor que de verdad no tiene perfil.
2. **Login**: lee `documentos/{nro}` → correo → `signInWithEmailAndPassword`. Los errores dicen
   qué falló ("No hay ninguna cuenta con ese número de documento" o "Contraseña incorrecta"); no
   revela nada nuevo, porque `documentos/{nro}` ya se puede consultar de a uno.
3. **Recuperar contraseña**: pide **documento y correo**; solo si el correo coincide con el de esa
   cuenta, Firebase envía el enlace para crear una contraseña nueva.

> **Compromiso conocido.** Para que el login funcione sin backend propio, `documentos/{nro}` se puede
> leer de a uno sin sesión (nunca listar). Quien conozca un número de documento puede ver el correo
> asociado. Cuando se active un backend (Cloud Functions, ya necesario para los pagos), conviene
> mover el login y la recuperación a una función con App Check y quitar el correo de ese documento.

## Modelo de datos (Firestore)

Los ids compuestos son deterministas para que las reglas comprueben un vínculo con un solo
`exists()`.

### `documentos/{nro_documento}`

| Campo   | Tipo   |                     |
| ------- | ------ | ------------------- |
| `uid`   | string | Dueño de la cuenta  |
| `email` | string | Correo de la cuenta |

Hace único al número de documento. Se crea al registrarse y nunca cambia.

### `usuarios/{uid}`

| Campo           | Tipo                       |                                                         |
| --------------- | -------------------------- | ------------------------------------------------------- |
| `rol`           | `"alumno"` \| `"profesor"` | No cambia                                               |
| `nombre`        | string                     | Nombre y apellido                                       |
| `nro_documento` | string                     | Solo dígitos. No cambia                                 |
| `instrumentos`  | string[]                   | Ids de [`instruments.ts`](../src/lib/instruments.ts)    |
| `terminos`      | string[]                   | Prefijos del nombre sin acentos, para buscar por nombre |
| `creadoEn`      | timestamp                  |                                                         |

Lo leen el dueño y cualquier profesor (para buscar alumnos). No contiene el correo.

### `inscripciones/{profesorId}_{alumnoId}_{instrumento}`

Las **listas de alumnos** del profesor: un documento por alumno y por instrumento.

| Campo                                         | Tipo      |
| --------------------------------------------- | --------- |
| `profesorId`, `profesorNombre`                | string    |
| `alumnoId`, `alumnoNombre`, `alumnoDocumento` | string    |
| `instrumento`                                 | string    |
| `creadoEn`                                    | timestamp |

Solo el profesor la crea (para un instrumento que él enseña y un usuario con rol alumno) o la borra.
La leen el profesor y el alumno. **Este documento es lo que habilita las clases al alumno.**

### `clases/{id}`

| Campo                          | Tipo                |                                      |
| ------------------------------ | ------------------- | ------------------------------------ |
| `profesorId`, `profesorNombre` | string              |                                      |
| `instrumento`                  | string              |                                      |
| `titulo`                       | string              |                                      |
| `descripcion`                  | string              | Objetivos y tarea                    |
| `fecha`                        | string `AAAA-MM-DD` | Día del calendario, sin zona horaria |
| `materiales`                   | `Material[]`        | Archivos de la clase                 |
| `creadoEn`                     | timestamp           |                                      |

El profesor la crea, edita y borra. La leen los alumnos inscriptos con ese profesor en ese
instrumento.

### `entregas/{claseId}_{alumnoId}`

| Campo                                  | Tipo                        |
| -------------------------------------- | --------------------------- |
| `claseId`, `profesorId`, `instrumento` | string                      |
| `alumnoId`, `alumnoNombre`             | string                      |
| `archivos`                             | `Material[]` (al menos uno) |
| `comentario`                           | string (opcional)           |
| `actualizadoEn`                        | timestamp                   |

La escribe el alumno inscripto; la leen el alumno y el profesor. Si el alumno quita su último
archivo, la entrega se borra y la clase vuelve a quedar pendiente. La borran el alumno o el
profesor (al borrar la clase).

### `Material`

`{ id, nombre, tipo, ruta, tamano, contentType }`, donde `tipo` es `audio`, `video`, `pdf`,
`partitura` (MusicXML), `imagen` u `otro`, y `ruta` apunta al archivo en Storage.

## Archivos (Cloud Storage)

| Ruta                                      | Sube                    | Lee                                  | Tipos                               |
| ----------------------------------------- | ----------------------- | ------------------------------------ | ----------------------------------- |
| `clases/{claseId}/{archivo}`              | el profesor de la clase | el profesor y sus alumnos inscriptos | audio, video, imagen, PDF, MusicXML |
| `entregas/{claseId}/{alumnoId}/{archivo}` | el alumno inscripto     | el alumno y el profesor              | audio, video                        |

Límite: **200 MB por archivo** (en `storage.rules` y `MAX_BYTES` de
[`files.ts`](../src/lib/files.ts)). Las reglas de Storage consultan Firestore para saber de quién es
la clase y quién está inscripto.

## Integridad: sin registros huérfanos

Firestore es NoSQL: no tiene claves foráneas ni borrado en cascada. Cómo se relacionan las
colecciones, cómo se evita que queden registros huérfanos, qué datos están duplicados y qué
revisar al agregar una colección está en la **[guía de backend](backend.md)**.

## Progreso

Por alumno y por instrumento:

```
progreso = clases con entrega del alumno / clases planificadas por su profesor para ese instrumento
```

Cuenta todas las clases del plan, también las futuras: es el avance sobre el plan completo (por
ejemplo, 1 entrega de 12 clases = 8 %). Se calcula en el navegador con `progreso()` de
[`data.ts`](../src/lib/data.ts). El profesor lo ve en **Mis alumnos** y en el detalle de cada
alumno; el alumno, en su inicio.

## Búsqueda de alumnos

El profesor escribe un **número de documento** (con o sin puntos) o un **nombre**:

- Documento: igualdad sobre `usuarios.nro_documento`.
- Nombre: `array-contains` sobre `usuarios.terminos` con la primera palabra, y el resto de las
  palabras se filtra en el navegador. No distingue acentos ni mayúsculas.

En ambos casos solo se muestran usuarios con rol alumno.

## Tiempo real

Todas las pantallas escuchan Firestore en vivo (`onSnapshot`): cuando el profesor agrega a un
alumno, crea una clase o sube un material, el alumno lo ve sin recargar, y lo mismo para las
entregas del lado del profesor.

## Próximamente: pagos

Cada profesor y cada alumno pagará para usar el sitio. Todavía no está construido; esta es la
propuesta para que encaje sin romper lo actual:

- **Proveedor**: a definir (opciones que operan en Paraguay, como Bancard o Pagopar).
- **Backend**: una Cloud Function recibe la notificación del proveedor (webhook) y escribe
  `suscripciones/{uid}` con `{ estado: "prueba" | "activa" | "vencida", plan, venceEn }`.
  Ningún cliente puede escribir esa colección; el dueño solo la lee.
- **Acceso**: `RequireAuth` muestra una pantalla de suscripción si el estado no es activo, y las
  reglas de Firestore y Storage pueden exigir una suscripción activa para leer clases y subir
  archivos.
- La misma función puede encargarse del login y la recuperación por documento (ver el compromiso
  conocido más arriba).
