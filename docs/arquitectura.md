# Arquitectura

## Visión general

Pulso es una aplicación **solo web** para enseñar y practicar instrumentos musicales. Hay dos roles:

- **Profesor**: enseña uno o varios instrumentos, arma sus listas de alumnos, planifica clases por
  semana, mes o año, sube materiales y sigue el progreso de cada alumno.
- **Alumno**: estudia uno o varios instrumentos. Solo ve las clases de un profesor **después** de que
  ese profesor lo agrega a su lista. Sube sus prácticas en audio o video, y fotos o PDF de tareas
  escritas.

Toda cuenta se identifica por su **número de documento** (`nro_documento`): con él se registra, entra
y lo buscan los profesores.

| Capa     | Tecnología                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Interfaz | React 19 con la API de React Native (`View`, `Text`, `Pressable`…) renderizada por **react-native-web**   |
| Build    | **Vite** (`react-native` → `react-native-web` por alias en `vite.config.ts`)                              |
| Rutas    | **React Router** (`src/main.tsx`)                                                                         |
| Backend  | **Firebase**: Authentication, Cloud Firestore (base **`(default)`**), Cloud Storage ([guía](firebase.md)) |

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
| `/?ver=`             | alumno     | Pestañas del inicio: Hoy (sin parámetro), `clases` y `progreso`                                            |
| `/practicar`         | alumno     | Tu práctica de hoy, con el afinador y el metrónomo a mano                                                  |
| `/revision`          | profesor   | **Por revisar**: las entregas sin revisar, una por vez, de la más antigua a la más nueva                   |
| `/herramientas`      | ambos      | Herramientas de práctica según el instrumento (`?instrumento=…&h=…`)                                       |
| `/plan`              | profesor   | **Mi plan**: estado, vencimiento, planes, cómo pagar y pagos registrados                                   |
| `/admin`             | admin      | **Administración**: planes de los profesores y todo el backend en solo lectura                             |
| cualquier otra       | —          | 404                                                                                                        |

Los guardas están en [`RouteGuards.tsx`](../src/components/RouteGuards.tsx):

- `RequireAuth`: sin sesión, en `/` muestra el login (así el sitio funciona con solo
  `www.pypulso.online`); en cualquier otra pantalla privada manda a `/` y, al entrar, vuelve a la
  pantalla que se quería abrir (salvo que la persona haya tocado **Salir**: entonces empieza en el
  inicio).
- `LoginRedirect`: `/login` → `/`, para enlaces y marcadores viejos.
- `RequireRole`: pantallas solo de profesor.
- `RequireAdmin`: `/admin`, solo la cuenta del administrador (ver _Administración_).

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
   cuenta, Firebase envía el enlace (en español) al correo registrado. Después de crear la
   contraseña nueva, la página de Firebase muestra **Continuar**, que vuelve al login del sitio
   desde donde se pidió (www.pypulso.online, GitHub Pages o `localhost`).

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

| Campo            | Tipo                       |                                                                                                             |
| ---------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `rol`            | `"alumno"` \| `"profesor"` | No cambia                                                                                                   |
| `nombre`         | string                     | Nombre y apellido                                                                                           |
| `nro_documento`  | string                     | Solo dígitos. No cambia                                                                                     |
| `instrumentos`   | string[]                   | Ids de [`instruments.ts`](../src/lib/instruments.ts)                                                        |
| `terminos`       | string[]                   | Prefijos del nombre sin acentos (ya no se usa para asignar alumnos)                                         |
| `foto`           | `{ ruta, actualizadoEn }`  | Opcional. `ruta` siempre es `usuarios/{uid}/foto.jpg`                                                       |
| `metaSemanal`    | number                     | Opcional. Alumno: meta de minutos por semana (1–3000)                                                       |
| `recordatorio`   | number                     | Opcional. Alumno: hora (0–23, Paraguay) del recordatorio diario de práctica                                 |
| `autoevaluacion` | mapa instrumento → nivel   | Opcional. Alumno: cómo se ve en cada instrumento (bienvenida); el profesor lo ve como sugerencia de la ruta |
| `creadoEn`       | timestamp                  |                                                                                                             |

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

La crea solo la Cloud Function `agregarAlumno` (para un instrumento que el profesor enseña, un
usuario con rol alumno, con su plan sin bloquear y dentro del límite de alumnos: ver _Planes de los
profesores_); el profesor la borra. La leen el profesor y el alumno. **Este documento es lo que habilita las clases al alumno.**

### `clases/{id}`

| Campo                          | Tipo                                                                      |                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `profesorId`, `profesorNombre` | string                                                                    |                                                                                                                   |
| `instrumento`                  | string                                                                    |                                                                                                                   |
| `titulo`                       | string                                                                    |                                                                                                                   |
| `descripcion`                  | string                                                                    | Objetivos y tarea                                                                                                 |
| `fecha`                        | string `AAAA-MM-DD`                                                       | Día del calendario, sin zona horaria                                                                              |
| `materiales`                   | `Material[]`                                                              | Archivos de la clase                                                                                              |
| `ficha`                        | `Ficha` (opcional)                                                        | Nivel, estilo, afinación, capo, duración; en batería, `superficie` (pad, batería o ambas) y `kit` (4 o 5 cuerpos) |
| `bloques`                      | `Bloque[]` (opcional, máx. 40)                                            | Plan de la clase, en orden                                                                                        |
| `hora`                         | string `HH:MM` (opcional)                                                 | Hora de Paraguay; con hora aparecen _Google Calendar_ y el archivo `.ics` (aviso 1 h antes)                       |
| `modalidad`                    | `presencial` \| `virtual` (opcional)                                      |                                                                                                                   |
| `enlace`                       | string `https://…` (opcional)                                             | Videollamada de la clase virtual (Meet, Zoom, Jitsi)                                                              |
| `asistencia`                   | mapa `alumnoId` → `presente` \| `tarde` \| `ausente` (opcional)           | La marca el profesor en la clase                                                                                  |
| `evento`                       | `{ tipo: "recital", lugar, programa: { interprete, obra }[] }` (opcional) | La fecha es un recital o muestra, con su programa (máx. 60)                                                       |
| `paraTodos`                    | `true` (opcional)                                                         | Para toda la lista de ese instrumento, también los que entren después                                             |
| `alumnos`                      | string[] (opcional, máx. 100)                                             | Para estos alumnos: una clase individual o de un grupo. Nunca junto con `paraTodos`                               |
| `creadoEn`                     | timestamp                                                                 |                                                                                                                   |

El profesor la crea, edita y borra. La leen los alumnos inscriptos con ese profesor en ese
instrumento **a los que está dirigida**. _Duplicar_ copia hora, modalidad y enlace, no la asistencia
ni el recital, y permite elegir otros alumnos.

**Por qué dos campos.** Firestore rechaza una consulta si las reglas no pueden garantizar que todos
los resultados son legibles, y no se puede consultar por un campo que falta. Por eso el alumno lista
con dos consultas (`paraTodos == true` y `alumnos array-contains` su uid) y toda clase nueva tiene
uno de los dos. Las clases de antes de estos campos no tienen ninguno: el alumno no las **lista**
hasta que `/admin` → _Planes_ → _Preparar datos anteriores_ les pone `paraTodos`.

#### Plan de la clase (`ficha` + `bloques`)

Tipos en [`src/lib/plan.ts`](../src/lib/plan.ts). Cada bloque tiene `id`, `etapa` (calentamiento,
técnica, repertorio, teoría, tarea o libre), `titulo`, `minutos`, `notas` y un `tipo` con su
contenido:

| `tipo`        | Contenido                                                                                                                                                                       | Instrumentos                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `tablatura`   | `tex`: alphaTex (pentagrama + tab con sonido)                                                                                                                                   | guitarra, bajo, ukelele                             |
| `acordes`     | `acordes`: nombres (`Am`, `G7`, `Lam`, `Fa#m`…)                                                                                                                                 | guitarra, ukelele                                   |
| `rasgueo`     | `compas` (4/4, 3/4, 6/8), `golpes` (↓ ↑ ✕ ·), `bpm`                                                                                                                             | guitarra, ukelele                                   |
| `tempo`       | `inicio`, `objetivo`, `paso` (BPM)                                                                                                                                              | todos                                               |
| `youtube`     | `url`                                                                                                                                                                           | todos                                               |
| `archivos`    | `archivos`: `Material[]` en `clases/{claseId}/`                                                                                                                                 | todos                                               |
| `texto`       | solo `notas`                                                                                                                                                                    | todos                                               |
| `partitura`   | `tex`: alphaTex con `\tuning piano` (notas por nombre, `C4` = Do central), sin tablatura, con el sonido y la clave del instrumento                                              | teclados, arco, viento, voz, arpa y bajo            |
| `escala`      | `tonica` (0 = Do), `escala` (mayor, menores, pentatónicas, blues, cromática, arpegios), `octavas`, `bpm`, `porPulso`                                                            | todos menos batería y percusión                     |
| `respiracion` | `inhalar`, `sostener`, `exhalar` (segundos), `repeticiones`, `nota` (MIDI de la nota larga, o null)                                                                             | voz y viento                                        |
| `groove`      | `compas`, `subdivision` (2, 3, 4), `compases` (1–4), `bpm`, `pistas`: un texto por pieza del kit, un carácter por paso (`.` silencio, `x` golpe, `>` acento, `o` nota fantasma) | batería y percusión (cada uno con su set de piezas) |
| `rudimento`   | `rudimento` (id de la lista PAS de [`bateria.ts`](../src/lib/bateria.ts)), `inicio`, `objetivo`, `paso` (BPM), `empiezaCon` (R o L)                                             | batería y percusión                                 |

Las tablaturas y los archivos Guitar Pro / MusicXML se dibujan y suenan con
[alphaTab](https://alphatab.net) ([`Partitura.tsx`](../src/components/plan/Partitura.tsx)), que se
carga solo en las clases que la usan; sin workers, con la fuente y el banco de sonidos empaquetados
por Vite. El profesor edita con guardado automático; los cambios de archivos se guardan al instante
(ver [backend](backend.md)). El alumno ve el plan en modo práctica y, en cada bloque, dice _Me salió_
o _Me costó_ (un pedal o las flechas lo marcan hecho sin opinión).

**Cómo le fue en cada bloque** (colección `practicas`, ver abajo): se ve en todos sus dispositivos y
la ve su profesor. [`practica.ts`](../src/lib/practica.ts) sigue guardando en `localStorage` los
bloques marcados, para mantener lo marcado antes de esa colección. Los **días y minutos de la
semana** del inicio salen del **diario de práctica** (colección `diario`): así son los mismos en
todos los dispositivos. Al terminar el modo práctica, los minutos se anotan ahí solos (ver
_Progreso_).

### `entregas/{claseId}_{alumnoId}`

| Campo                                  | Tipo                                                                                                                                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claseId`, `profesorId`, `instrumento` | string                                                                                                                                                                                                                                   |
| `alumnoId`, `alumnoNombre`             | string                                                                                                                                                                                                                                   |
| `archivos`                             | `Material[]` (al menos uno)                                                                                                                                                                                                              |
| `comentario`                           | string (opcional)                                                                                                                                                                                                                        |
| `devoluciones`                         | `Devolucion[]` (opcional, máx. 100): `{ id, archivoId, segundo, texto, fecha, media? }`, comentarios del profesor en un punto de un archivo; `media`: su respuesta grabada (`{ ruta, tipo, contentType, tamano }`), con `texto` opcional |
| `revisadaEn`                           | timestamp (opcional): el profesor la revisó. Un archivo nuevo lo quita y vuelve a _Por revisar_                                                                                                                                          |
| `evaluacion`                           | `{ criterios: { [id]: 1–5 }, comentario, fecha }` (opcional): la rúbrica del profesor ([`rubrica.ts`](../src/lib/rubrica.ts)); solo la escribe el profesor                                                                               |
| `respuestas`                           | mapa `devolucionId` → `entendido` \| `corregido` (opcional): la respuesta del alumno a cada devolución; el profesor solo puede quitarlas (con su devolución)                                                                             |
| `actualizadoEn`                        | timestamp                                                                                                                                                                                                                                |

La escribe el alumno inscripto; la leen el alumno y el profesor. Sus archivos son audio y video
(hasta 200 MB) o fotos y PDF (hasta 20 MB), en `entregas/{claseId}/{alumnoId}/`. Si el alumno quita su último
archivo, la entrega se borra y la clase vuelve a quedar pendiente. La borran el alumno o el
profesor (al borrar la clase).

### `practicas/{claseId}_{alumnoId}`

Cómo le fue al alumno en cada bloque de una clase.

| Campo                                              | Tipo                                           |         |
| -------------------------------------------------- | ---------------------------------------------- | ------- |
| `claseId`, `profesorId`, `alumnoId`, `instrumento` | string                                         |         |
| `bloques`                                          | mapa `bloqueId` → `bien` \| `costo` \| `hecho` | Máx. 40 |
| `actualizadoEn`                                    | timestamp                                      |         |

La escribe el alumno (la regla comprueba la clase, su destino y la inscripción); la leen él y el
profesor, que ve _Le costó: …_ en la entrega y en _Para preparar la clase_.

### `notasAlumno/{id}`

Notas privadas del profesor sobre un alumno en una lista: `{ profesorId, alumnoId, instrumento,
texto (1–2000), creadoEn }`. Solo las lee y las borra el profesor; **el alumno no las ve** y el
asistente tampoco las consulta. No se editan.

### `bibliotecaArchivos/{id}`

Archivos que el profesor reutiliza: `{ profesorId, material, creadoEn }`, con el archivo en
`biblioteca/{uid}/`. La Cloud Function `usarArchivoBiblioteca`
([`biblioteca.ts`](../functions/src/biblioteca.ts)) lo copia a `clases/{claseId}/` y lo agrega a
`materiales` (comprueba dueño, plan y el máximo de 30).

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

### `biblioteca/{id}`

Bloques que el profesor guarda para reusar en otras clases.

| Campo         | Tipo      |                                               |
| ------------- | --------- | --------------------------------------------- |
| `profesorId`  | string    | Dueño                                         |
| `instrumento` | string    | Se ofrece en las clases de ese instrumento    |
| `titulo`      | string    | 1–120                                         |
| `bloque`      | `Bloque`  | Copia del bloque; nunca un bloque de archivos |
| `creadoEn`    | timestamp |                                               |

Lo crea y lo borra el profesor (de la paleta _Agregar bloque_); solo lo lee él. Al usarlo, el
bloque entra al plan como copia con un `id` nuevo.

### `logros/{profesorId}_{alumnoId}_{instrumento}`

La **ruta de aprendizaje** del alumno en esa lista: mismo id que la inscripción.

| Campo                                   | Tipo      |                                                                           |
| --------------------------------------- | --------- | ------------------------------------------------------------------------- |
| `profesorId`, `alumnoId`, `instrumento` | string    |                                                                           |
| `nivel`                                 | string    | `inicial`, `basico`, `intermedio` o `avanzado`                            |
| `cumplidos`                             | string[]  | Ids de los objetivos logrados ([`ruta.ts`](../src/lib/ruta.ts), máx. 200) |
| `actualizadoEn`                         | timestamp |                                                                           |

Lo escribe el profesor (la regla exige que la inscripción exista); lo leen él y el alumno. Se
borra con la inscripción. Los ids de objetivos solo se agregan, nunca se renombran.

### `mensajes/{id}`

Conversación sobre una clase entre su profesor y un alumno de esa lista.

| Campo                    | Tipo                    |                                                         |
| ------------------------ | ----------------------- | ------------------------------------------------------- |
| `claseId`                | string                  |                                                         |
| `profesorId`, `alumnoId` | string                  | Los dos de la charla                                    |
| `autorId`                | string                  | Quién lo escribió                                       |
| `texto`                  | string                  | 1–1000                                                  |
| `tipo`                   | `"ausencia"` (opcional) | El alumno avisa que no puede ir (el texto es el motivo) |
| `leido`                  | `true` (opcional)       | El otro abrió la conversación. Ausente = sin leer       |
| `creadoEn`               | timestamp               |                                                         |

Lo escriben los dos (la regla comprueba la clase, su destino y la inscripción); el texto no se
edita: el otro solo puede marcarlo como leído. Cada uno borra los suyos y el profesor los borra
todos con la clase. Los mensajes de más de 30 días sin `leido` no cuentan como nuevos: son de antes
de este campo.

### `repertorio/{id}`

Las obras del alumno en una lista y cómo van.

| Campo                                   | Tipo                |                                                        |
| --------------------------------------- | ------------------- | ------------------------------------------------------ |
| `profesorId`, `alumnoId`, `instrumento` | string              | La inscripción de la que cuelga                        |
| `obra`                                  | string              | 1–120                                                  |
| `estado`                                | string              | `aprendiendo`, `entera`, `memoria` o `lista` (recital) |
| `repasadoEn`                            | string `AAAA-MM-DD` | Opcional. Último repaso                                |
| `bpm`, `bpmObjetivo`                    | number (20–300)     | Opcional. A qué tempo va y a cuál tiene que llegar     |
| `bpmEn`                                 | string `AAAA-MM-DD` | Opcional. Cuándo se anotó el tempo                     |
| `creadoEn`                              | timestamp           |                                                        |

La escriben el alumno y el profesor de esa lista (la regla exige la inscripción); solo cambian
`estado`, `repasadoEn` y el tempo. Se borra con la inscripción.

### `metas/{id}`

Metas concretas de una semana, pactadas entre profesor y alumno.

| Campo                                   | Tipo                |                        |
| --------------------------------------- | ------------------- | ---------------------- |
| `profesorId`, `alumnoId`, `instrumento` | string              | La inscripción         |
| `texto`                                 | string              | 1–200                  |
| `semana`                                | string `AAAA-MM-DD` | El lunes de esa semana |
| `cumplida`                              | boolean             | Solo cambia este campo |
| `creadoEn`                              | timestamp           |                        |

La escriben los dos; se borra con la inscripción.

### `dispositivos/{token}`

Un navegador que recibe avisos (Firebase Cloud Messaging): `{ uid, creadoEn }`, con el token de
FCM como id. Lo crea el dueño al activar los avisos en _Mi perfil_; se borra al desactivarlos, al
tocar **Salir** y desde la Function cuando FCM dice que el token ya no sirve. Solo la Function lo
lee para enviar.

### `asistenteConsultas/{fecha}_{uid}`

Cada pregunta al asistente que llega al modelo. El id empieza con la fecha ISO, así se ordena por
tiempo.

| Campo       | Tipo           | Notas                                                                     |
| ----------- | -------------- | ------------------------------------------------------------------------- |
| `uid`       | string         | Quién preguntó (`usuarios/{uid}`)                                         |
| `nombre`    | string         | Copia del nombre al preguntar (no se actualiza: es un registro histórico) |
| `rol`       | string         | `alumno` o `profesor`                                                     |
| `pregunta`  | string         | Hasta 1500 caracteres                                                     |
| `pantalla`  | string         | Dónde estaba (por ejemplo, "Una clase")                                   |
| `respuesta` | string \| null | La respuesta; `null` si falló                                             |
| `error`     | string \| null | El error de la API tal como vino (estado y cuerpo); `null` si respondió   |
| `mensaje`   | string         | Solo si falló: lo que vio la persona                                      |
| `busquedas` | number         | Búsquedas en sus datos que hizo el modelo                                 |
| `tokens`    | map            | `{ entrada, salida, cacheLeidos, cacheEscritos }` de esa pregunta         |
| `modelo`    | string         | `MODELO` al responder                                                     |
| `fecha`     | timestamp      | Hora del servidor                                                         |

La escribe solo la Function `preguntarAsistente` y se lee solo en `/admin`. Las reglas niegan todo
desde la app.

### `suscripciones/{uid}`

El plan del profesor (ver _Planes de los profesores_): uno por profesor, nunca se borra (tampoco al
eliminar la cuenta: queda con `baja`, como historial de sus pagos).

| Campo                      | Tipo      | Notas                                                            |
| -------------------------- | --------- | ---------------------------------------------------------------- |
| `plan`                     | string    | `prueba`, `inicial`, `profesor` o `academia`                     |
| `pruebaDesde`              | timestamp | Solo en la prueba: vence 30 días después                         |
| `venceEn`, `actualizadoEn` | timestamp | Plan pagado o días de excepción (`activarPlan`, `habilitarDias`) |
| `maxAlumnos`               | number    | Cantidad de alumnos a medida, en lugar de la del plan            |
| `baja`                     | map       | `{ nombre, nro_documento, eliminadaEn }`: el profesor se fue     |

El profesor la crea solo al registrarse (mismo batch que su perfil, como prueba con la hora del
servidor, o desde la prueba anterior si ese documento está en `bajas`) y la lee; las demás
escrituras son de las Functions del administrador y de `eliminarCuenta`.

### `pagos/{id}`

Cada pago que registró el administrador (`{profesorId}_{referencia}`: la referencia en el id impide
registrar dos veces el mismo) y cada cortesía (`{profesorId}_cortesia-{hora}`).

| Campo                           | Tipo      | Notas                                          |
| ------------------------------- | --------- | ---------------------------------------------- |
| `profesorId`                    | string    | `usuarios/{uid}`                               |
| `plan`, `meses`, `monto`        | —         | Plan pagado, meses (1 a 12) y guaraníes        |
| `referencia`                    | string    | Número de la transferencia o del comprobante   |
| `tipo`                          | string    | `pago` o `cortesia` (días de excepción, Gs. 0) |
| `motivo`                        | string    | Solo en una cortesía                           |
| `alumnos`                       | number    | Cantidad de alumnos habilitada                 |
| `desde`, `hasta`                | timestamp | El período que extendió                        |
| `registradoEn`, `registradoPor` | —         | Hora del servidor y uid del administrador      |

La escriben solo `activarPlan` y `habilitarDias`; el profesor lee los suyos en _Mi plan_.

### `telefonos/{uid}`

El celular del profesor, aparte de `usuarios` (que pueden leer todos los profesores).

| Campo           | Tipo      | Notas                                |
| --------------- | --------- | ------------------------------------ |
| `telefono`      | string    | Celular de Paraguay: `+5959XXXXXXXX` |
| `actualizadoEn` | timestamp | Hora del servidor                    |

Lo crea y cambia solo su dueño (un profesor; nace en el batch del registro); lo lee solo él, y el
administrador a través de `planesAdmin`. Se borra solo con la cuenta.

### `bajas/{nro_documento}`

Un número de documento cuya cuenta de **profesor** se eliminó (_Eliminar mi cuenta_).

| Campo         | Tipo      | Notas                          |
| ------------- | --------- | ------------------------------ |
| `rol`         | string    | `profesor`                     |
| `pruebaDesde` | timestamp | Cuándo empezó su prueba gratis |
| `eliminadaEn` | timestamp | Hora del servidor              |

La escribe solo `eliminarCuenta` y nunca se borra. Si esa persona vuelve a registrarse como
profesor, su prueba sigue contando desde `pruebaDesde` (la regla de `suscripciones` lo exige):
eliminar la cuenta no da otros 30 días gratis. Un plan pagado que todavía corría no pasa a la
cuenta nueva: el administrador lo resuelve con _Habilitar días_. Se lee de a una (`get`) con
sesión, nunca se lista.

### `Material`

`{ id, nombre, tipo, ruta, tamano, contentType, analisis? }`, donde `tipo` es `audio`, `video`, `pdf`,
`partitura` (MusicXML), `imagen` u `otro`, y `ruta` apunta al archivo en Storage. `analisis`
(`{ afinacion, notas, desvioMs, bpm }`, todo opcional) lo agrega la grabadora de la app al enviar
(ver _Herramientas de práctica_).

## Archivos (Cloud Storage)

| Ruta                                                   | Sube                    | Lee                                  | Tipos                                                   |
| ------------------------------------------------------ | ----------------------- | ------------------------------------ | ------------------------------------------------------- |
| `clases/{claseId}/{archivo}`                           | el profesor de la clase | el profesor y sus alumnos inscriptos | audio, video, imagen, PDF, MusicXML                     |
| `entregas/{claseId}/{alumnoId}/{archivo}`              | el alumno inscripto     | el alumno y el profesor              | audio, video (subidos o grabados en la app: WebM o MP4) |
| `entregas/{claseId}/{alumnoId}/devoluciones/{archivo}` | el profesor de la clase | el alumno y el profesor              | audio y video: su respuesta grabada                     |
| `biblioteca/{uid}/{archivo}`                           | el profesor dueño       | el profesor dueño                    | los mismos que los materiales de una clase              |
| `usuarios/{uid}/foto.jpg`                              | el dueño                | el dueño y cualquier profesor        | JPEG de 512 px, máximo 2 MB                             |

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

| Herramienta                             | Instrumentos                                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Afinador                                | guitarra, requinto, bajo, ukelele, violín, violonchelo, contrabajo, arpa, saxofón, trompeta, flauta, voz                                                                |
| Metrónomo                               | todos                                                                                                                                                                   |
| Grabadora                               | todos                                                                                                                                                                   |
| Diccionario de acordes                  | guitarra, ukelele y requinto (diagrama; el del requinto es la forma de guitarra una cuarta más grave), piano, teclado y acordeón (teclado con digitación), arpa (notas) |
| Oído                                    | todos menos batería y percusión; el ejercicio de acordes, solo los que tocan acordes                                                                                    |
| Lectura (notas sueltas y primera vista) | todos menos batería y percusión, con su clave (sol, fa o las dos)                                                                                                       |
| Polca y guarania                        | los que tocan acordes (guitarra, requinto, ukelele, arpa, teclados) y el bajo                                                                                           |
| Diario                                  | todos (solo alumnos: el profesor lo ve en la ficha del alumno)                                                                                                          |
| Medidor de tiempo                       | batería y percusión                                                                                                                                                     |
| Grooves (biblioteca)                    | batería (kit) y percusión (cajón, congas, bongó, shaker, claves, cencerro, güiro)                                                                                       |
| Rudimentos                              | batería y percusión (récords en `records`)                                                                                                                              |
| Lectura rítmica                         | batería y percusión                                                                                                                                                     |
| Oído rítmico                            | batería y percusión                                                                                                                                                     |

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
  (hasta 30 min de audio o 10 de video, así no supera los 200 MB). Antes de grabar hay una **cuenta**
  (3 segundos o, con click, un compás) y la pantalla queda encendida
  ([`pantalla.ts`](../src/lib/pantalla.ts)). En la clase, **Enviar a mi profesor** la sube como
  archivo de la entrega con `subirYAnotar` (si no se puede anotar en Firestore, borra el archivo).
  Hasta enviarla queda en este navegador ([`borrador.ts`](../src/lib/borrador.ts), IndexedDB, se
  borra al tocar **Salir**): si se cierra la pestaña, vuelve al abrir la clase, y sin conexión se
  envía sola cuando vuelve. En `/herramientas` solo se escucha o se descarga. **Con click**: el
  metrónomo suena solo mientras graba (con auriculares no queda grabado).
- **Análisis de la grabación** ([`analisis.ts`](../src/lib/analisis.ts)): al terminar una toma de
  hasta 5 minutos, el navegador la decodifica a 22 kHz y mide la **afinación** (YIN cada 100 ms en
  los primeros 2 minutos; % de notas sostenidas a ±15 cents) y el **tiempo** (ataques contra una
  grilla de corcheas ajustada por mínimos cuadrados: el desvío medio en ms; con click, a ese tempo).
  La afinación solo se mide en **arco, viento y voz** (`mideAfinacion`), donde la hace quien toca:
  con trastes o cuerdas fijas el número diría sobre todo cómo está afinado el instrumento, y YIN
  sigue una nota a la vez, así que los acordes lo confunden. El número de grabaciones viejas de esos
  instrumentos tampoco se muestra. El tiempo solo se mide en cuerdas pulsadas, teclados y percusión.
  Los números viajan con el archivo (`Material.analisis`) y los ve el profesor.
- **Velocidad y bucle A-B** ([`Reproductor.tsx`](../src/components/Reproductor.tsx)): en todo audio
  y video de clases y entregas (50 a 100 %, sin cambiar el tono) y en YouTube (con los mensajes de
  la API del reproductor, sin cargar scripts).
- **Acordes, Oído y Lectura** ([`components/herramientas/`](../src/components/herramientas/)):
  ejercicios sin datos guardados; el puntaje dura mientras la pantalla está abierta. **Primera
  vista** ([`primera-vista.ts`](../src/lib/primera-vista.ts)) genera cada vez una melodía de cuatro
  compases en Do mayor (fácil: negras y blancas por grados; media: corcheas y saltos) y la muestra
  con alphaTab, con el sonido del instrumento.
- **Polca y guarania** ([`progresiones.ts`](../src/lib/progresiones.ts)): polca, guarania y galopa
  como formas armónicas por grados (sin canciones ni letras), en el tono elegido, con diagramas en
  guitarra, ukelele y requinto y un acompañamiento de bajo y rasgueo programado en el reloj de audio.
- **Diario** ([`Diario.tsx`](../src/components/herramientas/Diario.tsx)): colección `diario` y
  `usuarios.metaSemanal`.

### Familias de instrumentos

Cada familia tiene sus bloques y su **plantilla de 60 minutos** (`plantilla()` de
[`plan.ts`](../src/lib/plan.ts)):

| Familia             | Instrumentos                                                  | Plantilla                                                                                                    |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Cuerdas con trastes | guitarra, requinto, bajo, ukelele                             | Tempo, tablatura, acordes y rasgueo (guitarra, ukelele y requinto; el bajo, partitura en clave de fa), tarea |
| Teclados            | piano, teclado, acordeón                                      | Escala, arpegio, lectura a primera vista, obra (partituras), tarea                                           |
| Arco                | violín, violonchelo, contrabajo                               | Cuerdas al aire con metrónomo, escala, estudio y obra (partituras), tarea                                    |
| Viento              | flauta, saxofón, trompeta                                     | Respiración, notas largas, escala, estudio y obra, tarea                                                     |
| Voz                 | voz                                                           | Respiración, vocalización con nota, escala, melodía, canción de referencia, tarea                            |
| Arpa paraguaya      | arpa                                                          | Arpegios y escala de Sol, bajo de polca y obra (polca, guarania o galopa), tarea                             |
| Percusión           | batería (kit) y percusión (cajón, congas, bongó y accesorios) | Batería: la suya. Percusión: manos alternadas, sonidos del cajón, patrón del estilo, canción y tarea         |

El requinto paraguayo se afina como una guitarra una cuarta más aguda (La Re Sol Do Mi La); la
trompeta en Sib y el saxo muestran en el afinador la nota escrita.

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

### Eliminar la cuenta

En _Mi perfil_, alumnos y profesores tienen **Eliminar mi cuenta** (no la cuenta del
administrador). Con la contraseña (`reauthenticateWithCredential` en
[`auth.ts`](../src/lib/auth.ts)), la Cloud Function `eliminarCuenta`
([`functions/src/cuenta.ts`](../functions/src/cuenta.ts), `southamerica-east1`) borra los
archivos, todos los documentos de la persona, su perfil, su documento y la cuenta de
Authentication; después la app cierra la sesión, borra la copia local y abre el login con
`?cuenta=eliminada`. Del profesor se conservan `suscripciones` (con `baja`) y `pagos`, y nace
`bajas/{nro}`. Al borrar sus clases se borran también las entregas de sus alumnos en ellas. El
orden exacto está en [backend.md](backend.md#eliminar-una-cuenta-cascada-completa).

## Progreso

Son dos preguntas distintas, por alumno y por instrumento:

- **¿Cuánto aprendió?** La **ruta de aprendizaje**: el nivel y el porcentaje de sus objetivos que
  marcó el profesor (`avanceDeNivel()` de [`ruta.ts`](../src/lib/ruta.ts)). Es la barra de **Mis
  alumnos** y lo que el alumno ve en _Mi progreso_.
- **¿Está al día?** `progreso()` de [`data.ts`](../src/lib/data.ts), la misma función en todas las
  vistas y copiada en [`herramientas.ts`](../functions/src/herramientas.ts):

```
al día = clases entregadas / clases para ese alumno desde que entró hasta hoy
```

Las clases futuras no cuentan: planificar el año entero no baja el número de nadie. Las de antes de
que entrara tampoco (`inscripciones.creadoEn`): siguen visibles en _Mis clases_, sin estado, pero no
quedan pendientes ni son su próxima práctica (`desdeSuIngreso()`). Una entrega de una clase futura
sí suma. Una clase cuenta cuando el alumno **entrega** algo (terminar el modo práctica no alcanza),
y se actualiza en vivo.

**Avance de la semana** (anillo del inicio del alumno, `avanceSemanal()` de
[`avance.ts`](../src/lib/avance.ts)), de lunes a domingo:

1. Con **meta semanal**: minutos anotados en el diario (todos sus instrumentos) / meta.
2. Sin meta: clases de esta semana entregadas / clases de esta semana.
3. Sin meta ni clases en la semana: solo los minutos, con el enlace para definir la meta.

Al **terminar el modo práctica**, los minutos de los bloques hechos se anotan solos en el diario
(id `{alumnoId}_{claseId}_{fecha}`: una vez por clase y por día; terminarla otra vez ese día no
duplica, porque las reglas no dejan cambiar una anotación). Así el anillo sube enseguida.

El **profesor** ve en el diario del alumno solo los minutos de **su** instrumento (no puede leer
los demás) y la meta semanal como dato aparte, sin porcentaje: la meta cuenta todos los
instrumentos del alumno y compararla con una parte daría un número falso.

## Seguimiento del alumno

- **Rúbrica** ([`rubrica.ts`](../src/lib/rubrica.ts)): en cada entrega el profesor pone de 1 a 5 en
  los criterios de la familia del instrumento (afinación, tiempo, técnica, sonido, expresión…) y una
  devolución breve. **Habilidades** promedia cada criterio en todas las entregas evaluadas, con la
  tendencia de la última.
- **Ruta de aprendizaje** ([`ruta.ts`](../src/lib/ruta.ts)): cuatro niveles con objetivos por
  familia; el profesor elige el nivel y marca los objetivos (colección `logros`), el alumno los ve
  en su inicio.
- **Asistencia**: el profesor marca presente, tarde o ausente en la clase (`clases.asistencia`).
- **Insignias** ([`insignias.ts`](../src/lib/insignias.ts)): se calculan en el navegador con lo que
  ya está guardado (entregas, diario, récords, análisis, rúbricas y ruta); no se guarda nada nuevo.

## El trabajo del profesor

- **Para hoy** ([`ParaHoy.tsx`](../src/components/ParaHoy.tsx)): entregas por revisar, clases de hoy,
  ausencias de clases por venir, mensajes sin leer (de los últimos 100) y alumnos con clases
  pendientes que hace más de 14 días no entregan. Mira solo las entregas: revisar el diario de cada
  uno serían una consulta por persona en cada visita al inicio.
- **Por revisar** (`/revision`): cola de entregas sin `revisadaEn`, de la más antigua a la más nueva.
  [`EntregaRevision`](../src/components/EntregaRevision.tsx) es la misma pieza en la cola y en la
  clase: comentarios escritos o grabados, _Convertir en meta_, rúbrica y _Revisada_.
- **Para preparar la clase** ([`PrepararClase.tsx`](../src/components/PrepararClase.tsx), en la ficha
  del alumno): última clase y qué le costó, práctica de la semana, última evaluación, comentarios sin
  responder, metas, tempos y próxima clase; las notas privadas (`notasAlumno`), y _Enviar resumen a
  la familia_, un enlace de WhatsApp con el texto ya escrito: no se guarda nada.
- **Invitar por WhatsApp**: el enlace abre _Crear cuenta_ con el rol alumno
  (`?modal=registro&rol=alumno`). No lleva el número de documento: una URL queda en historiales.
- **Biblioteca de archivos** ([`BibliotecaArchivos.tsx`](../src/components/BibliotecaArchivos.tsx)):
  se sube una vez y cada clase recibe su copia.

## La experiencia del alumno

- **Tu práctica de hoy** ([`rutina.ts`](../src/lib/rutina.ts)): el único lugar que dice qué hacer.
  Arriba, la clase pendiente con _Practicar ahora_. El alumno elige 10, 20 o 40 minutos (se recuerda
  en el navegador) y se arma la rutina: calentamiento, la clase pendiente (al modo práctica), el
  criterio más bajo de su rúbrica con la herramienta que lo entrena y la obra de su repertorio que
  hace más tiempo no repasa; debajo, sus metas de la semana sin cumplir y "N de 7 días · M min" de
  esta semana, del diario: descansar un día no le quita nada, como sí lo hacía una racha. Se calcula;
  no se guarda.
- **Lo que dijo su profesor** ([`Correcciones.tsx`](../src/components/Correcciones.tsx)): lo nuevo
  (comentarios sin responder, evaluaciones de los últimos 14 días, mensajes sin leer) va primero en
  _Hoy_; todo queda en _Mi progreso_, en _Lo que me dijo mi profesor_.
- **Mi evolución** ([`MiEvolucion.tsx`](../src/components/MiEvolucion.tsx)): la primera grabación
  al lado de la última (por instrumento) y dos gráficos (notas afinadas y desvío del tiempo) con el
  análisis de cada grabación. La fecha sale del id del archivo (empieza con el momento de la subida).
- **Repertorio** y **metas de la semana** (colecciones `repertorio` y `metas`): las ven y editan el
  alumno, en su inicio, y el profesor, en la ficha del alumno.
- **Respuestas a las devoluciones**: el alumno responde _Entendido_ o _Ya lo corregí_ a cada
  comentario (`entregas.respuestas`); el profesor lo ve debajo del comentario.
- **No puedo ir**: en una clase de hoy o futura, el alumno avisa con un motivo (un mensaje de tipo
  `ausencia`); el profesor lo ve junto a la asistencia.
- **Bienvenida** ([`BienvenidaAlumno.tsx`](../src/components/BienvenidaAlumno.tsx)): la primera vez
  en ese navegador, un recorrido de 4 pasos y una autoevaluación por instrumento
  (`usuarios.autoevaluacion`), que el profesor ve en la ruta como _Se autoevaluó en nivel…_ con
  _Empezar ahí_.
- **Pedal o teclado** en el modo práctica: flechas o Page Up / Page Down (lo que envían los pedales
  Bluetooth para pasar páginas) cambian de bloque; no mientras se escribe.
- **Entrenador de velocidad** en las partituras ([`Partitura.tsx`](../src/components/plan/Partitura.tsx)):
  repite en bucle el pasaje elegido (arrastrando sobre la partitura) o la obra entera, desde el 60 %
  y sumando 5 % por vuelta hasta el 100 %.

## Avisos (notificaciones)

- **En el navegador** ([`avisos.ts`](../src/lib/avisos.ts)): en _Mi perfil → Avisos_, cada persona
  los activa por dispositivo; se pide el permiso, se obtiene el token de FCM con la clave pública
  VAPID (`VITE_FIREBASE_VAPID_KEY`) y se guarda en `dispositivos`. [`sw.js`](../public/sw.js)
  muestra cada aviso y, al tocarlo, abre su página. En iPhone y iPad solo funcionan con Pulso
  agregado a la pantalla de inicio.
- **Las Functions** ([`functions/src/avisos.ts`](../functions/src/avisos.ts), en `us-central1`,
  donde está la base `nam5`): `avisarClaseNueva` (clase de los próximos 7 días, a los alumnos de
  la lista), `avisarEntrega` (entrega nueva y respuestas, al profesor; comentario y evaluación, al
  alumno), `avisarMensaje` (al otro de la charla; la ausencia lo dice) y `recordarPractica` (cada
  hora: los alumnos con `recordatorio` a esa hora que no anotaron práctica hoy, con los días que
  practicaron esta semana).

## Búsqueda de alumnos

El profesor asigna alumnos **solo por número de documento** (con o sin puntos), nunca por nombre:
el documento es único y el nombre no. [`buscarPorDocumento`](../src/lib/data.ts) busca por
igualdad sobre `usuarios.nro_documento`, y el nombre se muestra aparte, en un campo de solo
lectura, para que el profesor confirme que es la persona. Si el número es de un profesor, la
pantalla lo avisa y no deja agregarlo (`agregarAlumno` también lo rechaza).

`usuarios.terminos` (prefijos del nombre) se sigue guardando, pero ya no se usa para asignar
alumnos.

## Tiempo real

Todas las pantallas escuchan Firestore en vivo (`onSnapshot`): cuando el profesor agrega a un
alumno, crea una clase o sube un material, el alumno lo ve sin recargar, y lo mismo para las
entregas del lado del profesor.

## Uso sin conexión

- **Service worker** ([`public/sw.js`](../public/sw.js), registrado en
  [`main.tsx`](../src/main.tsx) solo en producción): guarda la app y cada archivo del sitio que ya
  se usó (código, fuentes, el banco de sonidos de alphaTab). Las páginas van primero a la red y, sin
  internet, abren la app guardada. Nunca intercepta Firebase ni otros sitios.
- **Copia local de Firestore** (`persistentLocalCache` en [`firebase.ts`](../src/lib/firebase.ts)):
  el perfil, las clases y las listas ya vistas se leen sin internet. Al tocar **Salir** se borra esa
  copia (un equipo compartido) y la app vuelve a empezar.

Afinador, metrónomo, grabadora y los ejercicios funcionan sin internet una vez abiertos; enviar una
grabación o un mensaje necesita conexión.

## Contacto

Formulario **Contacto** en el login (`?modal=contacto`, enlace _¿Necesitas ayuda? Escríbenos_) y en
_Mi perfil_ (_Ayuda y contacto_), para alumnos, profesores y quien todavía no tiene cuenta. Abre
**WhatsApp** con el **0986 103 839** y el mensaje ya escrito: motivo, nombre, la consulta, número
de documento, rol y la página. La respuesta va por WhatsApp al número de quien escribe.

- **Cómo se envía**: un enlace `wa.me` ([`enlaceContacto`](../src/lib/contacto.ts), número en
  `WHATSAPP_CONTACTO`), porque el sitio no tiene servidor; la persona toca **Enviar** en WhatsApp.
  No hay clave ni servicio intermedio.
- **Sin datos en Firebase**: el mensaje no se guarda en Firestore ni en Storage, así que no hay
  registros que relacionar ni borrar.
- Con sesión, nombre y documento vienen cargados; desde el login el documento es opcional.

## Asistente con IA

Botón ✦ flotante (abajo a la derecha; se arrastra a cualquier parte) en todas las pantallas con
sesión (alumnos y profesores): un chat que
explica cómo se usa Pulso y consulta los datos de quien pregunta.

```
Sitio (React)                        Cloud Function (Firebase)                 API de Claude
botón ✦ → chat
preguntarAsistente ────────────────► valida la sesión y el límite del día
{pregunta, historial, guia,          arma el system: instrucciones + guía
 pantalla}                           (cacheada) + contexto ──────────────────► Claude Opus 5.5
                                                         ◄── tool_use (búsquedas fijas)
                                     lee Firestore, solo lo de esa persona ──► (hasta 5 vueltas)
                                                         ◄── respuesta
◄──────────────────────────────────── {respuesta, usadasHoy, limite}
                                     suma el uso en asistenteUso/{uid}
                                     guarda la consulta en asistenteConsultas
```

- **Backend en Firebase**: la Cloud Function `preguntarAsistente`
  ([`functions/src/asistente.ts`](../functions/src/asistente.ts)), región `southamerica-east1`.
  La clave de la API de Claude vive en **Secret Manager** (`ANTHROPIC_API_KEY`): nunca en el código
  ni en el navegador.
- **Modelo**: `claude-opus-5-5` con esfuerzo `low` (chat) y respaldo automático si rechaza una
  pregunta (`fallbacks: "default"`). Se cambia en la constante `MODELO`; `claude-haiku-5-5` cuesta
  unas 40 veces menos.
- **Solo lectura y solo lo propio**: la IA no consulta libremente; tiene búsquedas fijas
  ([`herramientas.ts`](../functions/src/herramientas.ts)): el alumno, su resumen, sus clases (con
  plan y entrega), su diario y récords; el profesor, su resumen, sus clases (con las entregas), sus
  alumnos y la ficha de cada uno. Cada búsqueda filtra por quien pregunta (la Function usa el Admin
  SDK, que no pasa por las reglas). No escribe nada.
- **La guía de uso** la manda el sitio: las secciones _Pantallas_ de
  [diseño](diseno.md#pantallas), y _Progreso_ y _Herramientas de práctica_ de esta guía
  ([`asistente-envio.ts`](../src/lib/asistente-envio.ts)). Queda al día con cada publicación del
  sitio, sin volver a publicar la Function.
- **Límites**: 30 preguntas por persona y por día (las que fallan no cuentan), 5 vueltas, 8
  búsquedas y 8000 tokens por pregunta, 10 mensajes de historial.
- **Uso y costo**: `asistenteUso/{uid}` (uno por persona) guarda las preguntas del día y los tokens
  del mes.
- **Registro de consultas**: cada pregunta que llega al modelo se guarda en `asistenteConsultas`
  (ver _Modelo de datos_) con la respuesta o, si falló, el error de la API tal como vino (por
  ejemplo `401 {"type":"error","error":{"type":"authentication_error",…}}`) y el mensaje que vio
  la persona. Se revisan en `/admin` → _Colecciones_ → `asistenteConsultas`, de la más nueva a la
  más vieja. No se registran las que no llegan al modelo (sin sesión, sin perfil o pasado el límite
  del día). En el navegador la conversación vive solo en memoria y se pierde al cerrar.

## Administración

`/admin` es para una sola persona: la dueña del número de documento `4169298` (`ADMIN_DOCUMENTO`,
en [`src/lib/admin.ts`](../src/lib/admin.ts) y en [`functions/src/admin.ts`](../functions/src/admin.ts)).
Solo esa cuenta ve _Admin_ en la barra.

- **Planes** (la única parte que escribe): cada profesor con su plan, vencimiento, bloqueo,
  alumnos usados y celular, con buscador por CI; _Registrar pago_ (con alumnos a medida),
  _Habilitar días_ y _Darles la prueba gratis_ (ver
  [Planes de los profesores](#planes-de-los-profesores)).
- **Colecciones**: cada colección de Firestore con su cantidad de documentos; cada documento con
  su id, una pista (`nombre`, `titulo`…) y, al tocarlo, todos sus datos en JSON y sus fechas de
  creación y cambio. De a 50, con _Cargar más_ y búsqueda dentro de lo cargado.
- **Cuentas**: las cuentas de Authentication (correo, uid, alta y último ingreso). Marca **Sin
  perfil** a la que no tiene `usuarios/{uid}`, que es un registro que no terminó (sección 5 de
  [firebase.md](firebase.md)).
- **Archivos**: los archivos de Storage con su ruta, tamaño, tipo y fecha.

Colecciones, cuentas y archivos los trae la Cloud Function `verBackend` (`southamerica-east1`), que
nunca escribe ni borra. Como el Admin SDK no pasa por las reglas, ella y las de planes
(`planesAdmin`, `activarPlan`, `habilitarDias`) comprueban en cada llamada que quien pide es el uid de
`documentos/4169298` (`exigirAdmin`); ese documento se crea con la cuenta y las reglas no dejan
cambiarlo. Para cambiar de administrador: el número en los dos archivos y publicar el sitio y las
Functions.

## Planes de los profesores

Paga **el profesor**, con una cuota mensual según cuántos alumnos tiene; **los alumnos no pagan**.
Es quien decide usar Pulso y sin él el alumno no tiene clases, y el acceso se resuelve en un solo
lugar: "¿el profesor de esta clase está al día?". La lógica vive en
[`src/lib/planes.ts`](../src/lib/planes.ts) (lo que muestra la app),
[`functions/src/planes.ts`](../functions/src/planes.ts) (agregar alumnos, pagos y excepciones) y
las reglas (`venceDe` / `bloqueoDe` / `habilitado`): **las tres copias van juntas**.

| Plan         | Alumnos (por persona) | Por mes     |
| ------------ | --------------------- | ----------- |
| **Prueba**   | 60 (todo habilitado)  | Gratis      |
| **Inicial**  | 5                     | Gs. 50.000  |
| **Profesor** | 20                    | Gs. 150.000 |
| **Academia** | 60 (un profesor, hoy) | Gs. 300.000 |

- **Prueba**: 30 días desde el registro. Los profesores registrados antes del lanzamiento
  (2 de noviembre de 2026) cuentan sus 30 días desde ese día.
- **Alumnos por persona**: quien estudia guitarra y piano con el mismo profesor cuenta 1. El
  administrador puede poner una **cantidad a medida** al registrar un pago (por ejemplo 35), que
  reemplaza la del plan.
- **Vencimiento**: después hay **5 días hábiles** para pagar (lunes a viernes, hora de Paraguay,
  UTC-3; los feriados cuentan como hábiles): si vence un día de semana, el mismo día de la semana
  siguiente; si vence sábado o domingo, el viernes siguiente.
- **Bloqueado** (pasados los 5 días hábiles): no puede **crear** clases (tampoco duplicar ni
  repetir), agregar alumnos, subir archivos ni editar las clases. Sí ve todo, borra, marca
  asistencia, evalúa, comenta, escribe mensajes y quita materiales; sus alumnos siguen
  practicando y entregando. **Nada se borra al vencer.**
- **Días por excepción**: el administrador puede habilitar a un profesor **N días más** o **hasta
  una fecha**, sin pago y con un motivo. Mantiene su plan y su cantidad de alumnos; queda en el
  historial como **cortesía** (Gs. 0). Nunca acorta un plan: cuenta desde hoy si ya venció, o desde
  su vencimiento si no.
- **La cuenta del administrador** (documento 4169298, que es profesor) tiene **todo habilitado**:
  sin vencimiento ni límite de alumnos, en las reglas y en `agregarAlumno`.
- **Academia** con varios profesores bajo una misma cuenta: pendiente.

### Cómo se paga hoy (etapa 1, manual)

1. El profesor entra a **Mi plan** (en el menú, `/plan`): ve los planes y los datos de la cuenta
   de ueno ([`src/lib/datos-de-pago.ts`](../src/lib/datos-de-pago.ts); vacío = "no configurado"),
   y transfiere o paga con QR con el concepto `Pulso {su documento}`.
2. El administrador ve el pago en ueno, busca al profesor **por su CI** en `/admin` → **Planes** y
   toca _Registrar pago_: plan, meses, cantidad de alumnos (la del plan o a medida), monto y la
   **referencia** de la transferencia (la misma referencia no se registra dos veces).
3. `activarPlan`, en una transacción, crea `pagos/{profesorId}_{referencia}` y extiende
   `suscripciones/{uid}`: si todavía no estaba bloqueado, los meses se suman al **vencimiento
   anterior** (los días de gracia no son gratis); si ya estaba bloqueado, empiezan **hoy**.

### Datos y controles

- **`suscripciones/{uid}`**: `{ plan, pruebaDesde?, venceEn?, maxAlumnos?, actualizadoEn? }`. La
  prueba vence 30 días después de `pruebaDesde`, salvo que tenga `venceEn` (un plan pagado o días
  de excepción). Una por profesor, **nunca se borra**. El profesor la crea **solo al registrarse,
  en el mismo batch que su perfil** (las reglas exigen que el perfil de un profesor nazca con ella
  y que sea una prueba con la hora del servidor); después solo la leen él y escriben las funciones
  del administrador. Los profesores de antes del lanzamiento la reciben con _Darles la prueba
  gratis_ (`planesAdmin` → `crearPruebas`, que nunca pisa una existente). Sin ella, las reglas
  bloquean.
- **`pagos/{id}`**: pagos (`{profesorId}_{referencia}`, `tipo: "pago"`) y cortesías
  (`{profesorId}_cortesia-{hora}`, `tipo: "cortesia"`, Gs. 0, con `motivo`). Cuelga de `usuarios`
  (que nunca se borra); el profesor lee los suyos, **motivo incluido**; nadie la escribe desde la
  app.
- **`telefonos/{uid}`**: el celular del profesor (`+5959XXXXXXXX`). Va **aparte de `usuarios`**
  porque todos los profesores pueden leer `usuarios`: este solo lo lee su dueño, y el
  administrador lo ve con `planesAdmin`. Obligatorio para los profesores nuevos (nace en el batch
  del registro, que lo exige); los de antes lo agregan en _Mi perfil_. Nunca se borra.
- **`inscripciones`**: se crean **solo con la función `agregarAlumno`** (las reglas niegan crearlas
  desde la app). En una transacción comprueba el rol, el instrumento, que el plan no esté
  bloqueado y el límite por persona (salvo para el administrador), y copia los nombres de
  `usuarios`.
- **Reglas de Firestore**: crear `clases` exige `habilitado(me())`; con el plan bloqueado, una
  clase solo cambia `asistencia` o achica `materiales`.
- **Reglas de Storage**: subir a `clases/{id}/` lee la clase y la suscripción (el máximo de **2
  documentos**). Por ese límite, el administrador se reconoce por su **uid escrito en
  `storage.rules`** (el de `documentos/4169298`): si esa cuenta se recrea, hay que actualizarlo.
  Las entregas de los alumnos no se tocan.
- **Interfaz**: _Mi plan_ (en el menú del profesor, `/plan`) con el estado, los planes, cómo pagar
  y _Tus pagos_ (con las cortesías); un aviso arriba en Inicio, Planificación y la clase (7 días
  antes, en gracia y bloqueado); _Mi plan_ y el celular en el perfil; con el plan bloqueado
  desaparecen _Nueva clase_, _Editar_, _Duplicar_ y _Subir_, y el plan de la clase se ve en solo
  lectura.
- **Pruebas**: el flujo completo (registro con prueba y celular, trampas, límite, alumnos a medida,
  gracia, bloqueo, borde de los días hábiles, días por excepción, administrador sin límites y
  pruebas faltantes: 69 casos) se probó contra los emuladores de Firebase antes de publicarlo.

### Próximamente: cobro automático

Con más de unos 15–20 profesores, **uPay** (de ueno, antes Pagopar) por API: Pulso crea el pedido,
uPay muestra el QR y avisa el pago a una Cloud Function (webhook), que llama a la misma lógica de
`activarPlan`. La clave privada iría en Secret Manager, como la del asistente. Bancard (vPOS)
queda como opción para débito automático con tarjeta.

### Antes de cobrar (no es código)

- **RUC y factura electrónica (SIFEN)**: una suscripción es una venta de servicio y lleva factura;
  confirmarlo con un contador.
- **Términos y condiciones y política de reembolso**, visibles antes de pagar.
- **Precios con IVA incluido**.
