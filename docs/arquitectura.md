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

| Ruta                 | Quién      | Pantalla                                                                                                   |
| -------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `/`                  | sin sesión | **Login** con número de documento. Modales: `?modal=registro`, `?modal=recuperar`, `?modal=primeros-pasos` |
| `/`                  | con sesión | Inicio según el rol (profesor o alumno)                                                                    |
| `/login`             | —          | Redirige a `/` conservando el `?modal=` (enlaces viejos)                                                   |
| `/registro`          | —          | Redirige a `/?modal=registro`                                                                              |
| `/planificacion`     | profesor   | Clases por semana, mes o año                                                                               |
| `/alumnos/:alumnoId` | profesor   | Progreso de un alumno y estado de cada clase                                                               |
| `/clases/:claseId`   | ambos      | Detalle de la clase: materiales, entrega del alumno o entregas de todos                                    |
| `/perfil`            | ambos      | Mi perfil: foto, datos de la cuenta, instrumentos (agregar más) y tema (claro, oscuro o sistema)           |
| `/practicar`         | alumno     | Abre el modo práctica de la próxima clase pendiente (o "No tienes prácticas pendientes")                   |
| `/herramientas`      | ambos      | Herramientas de práctica según el instrumento (`?instrumento=…&h=…`)                                       |
| cualquier otra       | —          | 404                                                                                                        |

Los guardas están en [`RouteGuards.tsx`](../src/components/RouteGuards.tsx):

- `RequireAuth`: sin sesión, en `/` muestra el login (así el sitio funciona con solo
  `www.pypulso.online`); en cualquier otra pantalla privada manda a `/` y, al entrar, vuelve a la
  pantalla que se quería abrir (salvo que la persona haya tocado **Salir**: entonces empieza en el
  inicio).
- `LoginRedirect`: `/login` → `/`, para enlaces y marcadores viejos.
- `RequireRole`: pantallas solo de profesor.

## Sesión

Depende de la casilla **Recordarme** del login (tildada por defecto):

| Recordarme | Dónde guarda Firebase Auth la sesión | Efecto                                                                                                                                      |
| ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Sí         | IndexedDB                            | La comparten **todas las pestañas y ventanas** y sobrevive a cerrar el navegador. El número de documento queda precargado (`localStorage`). |
| No         | `sessionStorage` de la pestaña       | Dura mientras la pestaña esté abierta (recargar no la cierra); otra pestaña pide entrar. No se guarda nada. Para computadoras compartidas.  |

**Salir** cierra la sesión en todas las pestañas que la comparten.

**La app nunca guarda la contraseña.** La guarda, si la persona acepta, el gestor de contraseñas del
navegador: los campos usan `autocomplete="username"` / `current-password` y, con Recordarme, la
app se lo pide explícitamente con la API `PasswordCredential` (Chrome y Edge; en el resto el
navegador lo ofrece por los campos).

[`src/lib/auth.ts`](../src/lib/auth.ts) combina la sesión con el perfil de Firestore y lo expone con
`useSession()` / `usePerfil()`.

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
| `foto`          | `{ ruta, actualizadoEn }`  | Opcional. `ruta` siempre es `usuarios/{uid}/foto.jpg`   |
| `metaSemanal`   | number                     | Opcional. Alumno: meta de minutos por semana (1–3000)   |
| `creadoEn`      | timestamp                  |                                                         |

Lo leen el dueño y cualquier profesor (para buscar alumnos). No contiene el correo. El dueño solo
puede cambiar `nombre`, `instrumentos`, `terminos`, `foto` y `metaSemanal`.

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

| Campo                          | Tipo                           |                                                                                                                   |
| ------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `profesorId`, `profesorNombre` | string                         |                                                                                                                   |
| `instrumento`                  | string                         |                                                                                                                   |
| `titulo`                       | string                         |                                                                                                                   |
| `descripcion`                  | string                         | Objetivos y tarea                                                                                                 |
| `fecha`                        | string `AAAA-MM-DD`            | Día del calendario, sin zona horaria                                                                              |
| `materiales`                   | `Material[]`                   | Archivos de la clase                                                                                              |
| `ficha`                        | `Ficha` (opcional)             | Nivel, estilo, afinación, capo, duración; en batería, `superficie` (pad, batería o ambas) y `kit` (4 o 5 cuerpos) |
| `bloques`                      | `Bloque[]` (opcional, máx. 40) | Plan de la clase, en orden                                                                                        |
| `creadoEn`                     | timestamp                      |                                                                                                                   |

El profesor la crea, edita y borra. La leen los alumnos inscriptos con ese profesor en ese
instrumento.

#### Plan de la clase (`ficha` + `bloques`)

Tipos en [`src/lib/plan.ts`](../src/lib/plan.ts). Cada bloque tiene `id`, `etapa` (calentamiento,
técnica, repertorio, teoría, tarea o libre), `titulo`, `minutos`, `notas` y un `tipo` con su
contenido:

| `tipo`      | Contenido                                                                                                                                                                       | Instrumentos            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `tablatura` | `tex`: alphaTex (pentagrama + tab con sonido)                                                                                                                                   | guitarra, bajo, ukelele |
| `acordes`   | `acordes`: nombres (`Am`, `G7`, `Lam`, `Fa#m`…)                                                                                                                                 | guitarra, ukelele       |
| `rasgueo`   | `compas` (4/4, 3/4, 6/8), `golpes` (↓ ↑ ✕ ·), `bpm`                                                                                                                             | guitarra, ukelele       |
| `tempo`     | `inicio`, `objetivo`, `paso` (BPM)                                                                                                                                              | todos                   |
| `youtube`   | `url`                                                                                                                                                                           | todos                   |
| `archivos`  | `archivos`: `Material[]` en `clases/{claseId}/`                                                                                                                                 | todos                   |
| `texto`     | solo `notas`                                                                                                                                                                    | todos                   |
| `groove`    | `compas`, `subdivision` (2, 3, 4), `compases` (1–4), `bpm`, `pistas`: un texto por pieza del kit, un carácter por paso (`.` silencio, `x` golpe, `>` acento, `o` nota fantasma) | batería                 |
| `rudimento` | `rudimento` (id de la lista PAS de [`bateria.ts`](../src/lib/bateria.ts)), `inicio`, `objetivo`, `paso` (BPM), `empiezaCon` (R o L)                                             | batería                 |

Las tablaturas y los archivos Guitar Pro / MusicXML se dibujan y suenan con
[alphaTab](https://alphatab.net) ([`Partitura.tsx`](../src/components/plan/Partitura.tsx)), que se
carga solo en las clases que la usan; sin workers, con la fuente y el banco de sonidos empaquetados
por Vite. El profesor edita con guardado automático; los cambios de archivos se guardan al instante
(ver [backend](backend.md)). El alumno ve el plan en modo práctica y marca cada bloque como _Hecho_
(se recuerda en ese navegador).

**Registro de práctica** ([`practica.ts`](../src/lib/practica.ts)): cada _Hecho_ guarda fecha, clase,
bloque y minutos en `localStorage` del alumno (últimos 6 meses). De ahí salen la **racha** (días
seguidos hasta hoy o ayer) y los **minutos de la semana** del inicio. Es una ayuda personal, no un
dato evaluado: vale por dispositivo y no se guarda en Firestore.

### `entregas/{claseId}_{alumnoId}`

| Campo                                  | Tipo                                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `claseId`, `profesorId`, `instrumento` | string                                                                                                                              |
| `alumnoId`, `alumnoNombre`             | string                                                                                                                              |
| `archivos`                             | `Material[]` (al menos uno)                                                                                                         |
| `comentario`                           | string (opcional)                                                                                                                   |
| `devoluciones`                         | `Devolucion[]` (opcional, máx. 100): `{ id, archivoId, segundo, texto, fecha }`, comentarios del profesor en un punto de un archivo |
| `actualizadoEn`                        | timestamp                                                                                                                           |

La escribe el alumno inscripto; la leen el alumno y el profesor. Si el alumno quita su último
archivo, la entrega se borra y la clase vuelve a quedar pendiente. La borran el alumno o el
profesor (al borrar la clase).

### `diario/{id}`

El **diario de práctica** del alumno: una anotación por práctica.

| Campo         | Tipo                |                                |
| ------------- | ------------------- | ------------------------------ |
| `alumnoId`    | string              | Dueño                          |
| `instrumento` | string              | Id de `instruments.ts`         |
| `fecha`       | string `AAAA-MM-DD` | Día practicado (hoy o ayer)    |
| `minutos`     | number              | 1–600                          |
| `comentario`  | string              | Opcional, hasta 500 caracteres |
| `creadoEn`    | timestamp           |                                |

Solo un usuario con rol alumno crea las suyas; no se editan; las borra el alumno (con _Deshacer_).
La lee el alumno y, para cada instrumento, el profesor que tiene al alumno en esa lista (la consulta
filtra por `alumnoId` e `instrumento`, así la regla comprueba la inscripción). El modo práctica
ofrece anotar los minutos al terminar.

### `records/{alumnoId}_{rudimento}`

El mejor tempo limpio del alumno en cada rudimento de batería.

| Campo           | Tipo                |                                    |
| --------------- | ------------------- | ---------------------------------- |
| `alumnoId`      | string              | Dueño                              |
| `rudimento`     | string              | Id de `RUDIMENTOS` en `bateria.ts` |
| `bpm`           | number              | 20–300                             |
| `fecha`         | string `AAAA-MM-DD` | Día del récord                     |
| `actualizadoEn` | timestamp           |                                    |

Lo escribe y lo borra el alumno; lo leen él y sus profesores de batería (la regla comprueba la
inscripción `{profesorId}_{alumnoId}_bateria`).

### `Material`

`{ id, nombre, tipo, ruta, tamano, contentType }`, donde `tipo` es `audio`, `video`, `pdf`,
`partitura` (MusicXML), `imagen` u `otro`, y `ruta` apunta al archivo en Storage.

## Archivos (Cloud Storage)

| Ruta                                      | Sube                    | Lee                                  | Tipos                                                   |
| ----------------------------------------- | ----------------------- | ------------------------------------ | ------------------------------------------------------- |
| `clases/{claseId}/{archivo}`              | el profesor de la clase | el profesor y sus alumnos inscriptos | audio, video, imagen, PDF, MusicXML                     |
| `entregas/{claseId}/{alumnoId}/{archivo}` | el alumno inscripto     | el alumno y el profesor              | audio, video (subidos o grabados en la app: WebM o MP4) |
| `usuarios/{uid}/foto.jpg`                 | el dueño                | el dueño y cualquier profesor        | JPEG de 512 px, máximo 2 MB                             |

**Fotos de perfil.** Se guardan en Storage, no en Firestore (un documento admite 1 MiB y se
descargaría la imagen en cada lectura del perfil) ni en un servicio externo como Cloudinary (borrar
o reemplazar exige su clave secreta, que no puede estar en el navegador, y las fotos viejas
quedarían huérfanas). El navegador recorta y achica la imagen antes de subirla
([`prepararFoto`](../src/lib/files.ts)); la ruta fija hace que una foto nueva reemplace a la
anterior.

Límite: **200 MB por archivo** (en `storage.rules` y `MAX_BYTES` de
[`files.ts`](../src/lib/files.ts)). Las reglas de Storage consultan Firestore para saber de quién es
la clase y quién está inscripto.

## Herramientas de práctica

Página `/herramientas` (alumnos y profesores) y accesos en el inicio del alumno y en la clase. Cada
herramienta se muestra **solo para los instrumentos donde tiene sentido**, según los instrumentos
de la persona (perfil y, en el alumno, las listas de sus profesores). La tabla está en
[`herramientas.ts`](../src/lib/herramientas.ts):

| Herramienta            | Instrumentos                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Afinador               | guitarra, bajo, ukelele, violín, arpa, saxofón, flauta, voz                                  |
| Metrónomo              | todos                                                                                        |
| Grabadora              | todos                                                                                        |
| Diccionario de acordes | guitarra y ukelele (diagrama), piano y acordeón (teclado), arpa (notas)                      |
| Oído                   | todos menos batería; el ejercicio de acordes, solo guitarra, ukelele, piano, acordeón y arpa |
| Lectura de notas       | todos menos batería, con su clave (sol, fa o las dos)                                        |
| Diario                 | todos (solo alumnos: el profesor lo ve en la ficha del alumno)                               |
| Medidor de tiempo      | batería                                                                                      |
| Grooves (biblioteca)   | batería                                                                                      |
| Rudimentos             | batería (récords en `records`)                                                               |
| Lectura rítmica        | batería                                                                                      |
| Oído rítmico           | batería                                                                                      |

Todas funcionan en el navegador, con un solo `AudioContext` ([`audio.ts`](../src/lib/audio.ts)) y
las notas de [`notas.ts`](../src/lib/notas.ts). El micrófono y la cámara exigen HTTPS (o
`localhost`).

- **Afinador** ([`afinador.ts`](../src/lib/afinador.ts)): `getUserMedia` sin los filtros de llamada
  (cancelación de eco, ruido y ganancia); detecta la frecuencia con el algoritmo **YIN** cada 50 ms
  y muestra la mediana de las últimas cinco lecturas. Compara con las cuerdas de la afinación (las
  `afinaciones` de `plan.ts`, más el violín) o, en arpa, viento y voz, con la nota más cercana
  (La4 = 440 Hz). En saxo muestra la nota escrita (alto en Mib, tenor en Sib). Nota de referencia
  sostenida y, en violín, viento y voz, la afinación de los últimos 3 segundos. No graba ni guarda
  nada.
- **Metrónomo** ([`Metronome.tsx`](../src/components/Metronome.tsx)): compás 2/4, 3/4, 4/4 y 6/8,
  subdivisiones, marcar el tempo con toques y subir el tempo solo cada N compases.
- **Grabadora** ([`grabadora.ts`](../src/lib/grabadora.ts)): `MediaRecorder` en audio o video
  (hasta 30 min de audio o 10 de video, así no supera los 200 MB). En la clase, **Enviar a mi
  profesor** la sube como archivo de la entrega con `subirYAnotar` (si no se puede anotar en
  Firestore, borra el archivo). En `/herramientas` solo se escucha o se descarga.
- **Velocidad y bucle A-B** ([`Reproductor.tsx`](../src/components/Reproductor.tsx)): en todo audio
  y video de clases y entregas (50 a 100 %, sin cambiar el tono) y en YouTube (con los mensajes de
  la API del reproductor, sin cargar scripts).
- **Acordes, Oído y Lectura** ([`components/herramientas/`](../src/components/herramientas/)):
  ejercicios sin datos guardados; el puntaje dura mientras la pantalla está abierta.
- **Diario** ([`Diario.tsx`](../src/components/herramientas/Diario.tsx)): colección `diario` y
  `usuarios.metaSemanal`.

### Batería

- **Kit sintetizado** ([`bateria.ts`](../src/lib/bateria.ts)): bombo, caja, aro, hi-hat (cerrado,
  abierto y con pie), ride, crash y tres toms con Web Audio, sin archivos de sonido. Los grooves y
  los rudimentos se programan con el reloj de audio del metrónomo (`useMetronomo` con
  `programar`), así el tempo es exacto.
- **Biblioteca de estilos**: rock, balada, funk, shuffle, bossa nova, cumbia, polca paraguaya,
  guarania y galopa, con un consejo de cada uno; sirven de punto de partida para el bloque `groove`.
- **Rudimentos**: 12 de la lista PAS (redobles, paradiddles, flams y drags). La digitación suena en
  estéreo: mano derecha a la derecha, izquierda a la izquierda.
- **Medidor de tiempo** ([`tiempo.ts`](../src/lib/tiempo.ts)): un `AudioWorklet` detecta cada
  golpe del micrófono con su hora en el reloj de audio (la misma de los clicks) y lo compara con la
  grilla. Se **calibra** una vez por dispositivo (8 negras junto al click; la mediana se guarda en
  `localStorage`) para descontar el retraso de auriculares y micrófono. El click va por auriculares
  o solo visual, para que el micrófono no lo cuente como golpe.
- **Lectura y oído rítmico**: compases de 4/4 en semicorcheas, dibujados en un renglón de percusión
  ([`Ritmo.tsx`](../src/components/bateria/Ritmo.tsx)); la lectura usa el detector para marcar cada
  nota justa, cerca o faltante.
- **Plantilla de 60 min**: rudimento de calentamiento, rudimento del día, ostinato de coordinación,
  groove del estilo, 3 compases de groove + 1 de fill, canción para tocar encima y tarea.

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
