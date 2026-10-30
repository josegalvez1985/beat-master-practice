# Guía de diseño

## Principios

1. **Una tarea principal por pantalla.** Cada pantalla tiene un botón destacado (ámbar) para lo más
   importante: Entrar, Crear clase, Subir audio o video.
2. **El estado siempre a la vista.** Barras de progreso, insignias _Entregada_ / _Pendiente_ y
   contadores ("1 de 12 clases") para que nadie tenga que adivinar en qué punto está.
3. **Nada vacío sin explicación.** Cada lista vacía dice por qué y qué hacer ("Pásale tu número de
   documento a tu profesor…").
4. **Tiempo real.** Lo que hace el profesor aparece al instante en la pantalla del alumno y al revés;
   no hay botones de "actualizar".
5. **Español claro y cercano**, tratando de "tú", con frases cortas y verbos de acción.

## Identidad visual

Dos temas: **oscuro de escenario** (fondo carbón con luz ámbar de platillo) y **claro** (papel
cálido con ámbar profundo). La persona elige **Sistema** (sigue al dispositivo), **Claro** u
**Oscuro** desde el login, la barra superior o su perfil; la elección se guarda en ese navegador.

Todo sale de [`src/lib/theme.ts`](../src/lib/theme.ts): cada token de `colors` es una variable CSS
(`var(--pulso-…)`) con un valor por tema, así que cambiar de tema no vuelve a pintar la app. **No
se escriben colores sueltos en las pantallas**: un color nuevo se agrega como token en las dos
paletas. [`index.html`](../index.html) aplica el tema guardado antes del primer pintado.

| Token                 | Oscuro                | Claro                 | Uso                                                   |
| --------------------- | --------------------- | --------------------- | ----------------------------------------------------- |
| `background`          | `#0f0b09`             | `#faf7f2`             | Fondo de la app                                       |
| `card` / `panel`      | `#181310`             | `#ffffff`             | Superficie 1: paneles y modales (sólidos)             |
| `primary`             | `#f9a129`             | `#b45309`             | Acción principal, progreso, enlaces                   |
| `foreground`          | `#f8f5ef`             | `#1c1714`             | Texto principal                                       |
| `mutedForeground`     | `#a69d91`             | `#6b6158`             | Texto secundario                                      |
| `secondary` / `muted` | `#2d2621` / `#221b17` | `#ede5da` / `#f3ede5` | Superficie 2: botones secundarios y filas             |
| `border` / `input`    | `#2e2620` / `#3d342d` | `#e6ded3` / `#d6ccbf` | Bordes opacos cálidos                                 |
| `selected`            | ámbar 12 %            | ámbar 8 %             | Fondo de la opción seleccionada (con borde `primary`) |
| `destructive`         | `#e62b34`             | `#c81e28`             | Errores                                               |
| `success`             | `#5fd38d`             | `#15803d`             | Insignia _Entregada_                                  |
| `highlight`           | `#ffaf1d`             | `#c2570c`             | Texto ámbar destacado                                 |

En claro el ámbar es más oscuro (`#b45309`) para que el texto y los botones mantengan el contraste
sobre fondo claro. El ícono del logo conserva sus colores en los dos temas.

**Ámbar con propósito**: el relleno ámbar sólido es solo para la **acción principal** de cada
pantalla (Entrar, Practicar, Escuchar…), el **progreso** y lo que **suena o está activo**. Una
opción **seleccionada** (chips, pestañas, tema, etapa, compás) usa `selected` + borde `primary` y
texto normal. Los **enlaces** van en color de texto, subrayados en ámbar.

**Tipografía**:

| Uso                                                                              | Fuente                                                                 | Detalle                                                        |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| Marca, números grandes (BPM, estadísticas, porcentajes, 404) y el lema del login | _Bebas Neue_ (`fonts.display`)                                         | Solo mayúsculas: nunca para títulos ni para nombres de acordes |
| Títulos de página, sección y modal                                               | _Barlow Semi Condensed_ 600/700 (`fonts.heading`, `fonts.headingBold`) | En minúsculas con mayúscula inicial ("Plan de la clase")       |
| Texto                                                                            | _Barlow_ 400/500/600/700                                               | Base 16 px; textos secundarios desde 13 px                     |
| Números que cambian                                                              | —                                                                      | `fontVariant: ["tabular-nums"]` para que no "bailen"           |

Se cargan antes del primer pintado ([`fonts.ts`](../src/lib/fonts.ts)).

**Logo**: una línea de pulso ámbar (degradado `#ffc65c` → `primary` → `#ec7a1c`, con un
resplandor suave) sobre fondo carbón con luz de escenario, y al lado la palabra **PULSO** en Bebas
Neue. El dibujo original es [`public/favicon.svg`](../public/favicon.svg); en la app se usa el
componente vectorial [`Logo` / `LogoMark`](../src/components/ui/logo.tsx) (barra superior, login,
404). `npm run iconos` regenera desde el SVG todos los PNG:

| Archivo                                  | Uso                                                               |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `public/favicon.svg`, `favicon.png` (96) | Pestaña del navegador y resultados de Google                      |
| `public/icons/icon-192/512.png`          | App instalada (manifest) y logo en los datos para Google          |
| `public/icons/apple-touch-icon.png`      | Acceso directo en iPhone/iPad                                     |
| `public/og-image.png` (1200×630)         | Vista previa al compartir el enlace (WhatsApp, Facebook, X…)      |
| `public/brand/icon-1024.png`             | Ícono en alta resolución                                          |
| `public/brand/logo.png`                  | Logo horizontal transparente (2800×960) para **fondos oscuros**   |
| `public/brand/logo-fondo-claro.png`      | Igual, con texto oscuro para **fondos claros** (documentos, etc.) |

**Formas**: tres radios (8 controles chicos, 12 tarjetas y campos, 20 paneles grandes), superficies
sólidas por elevación con borde opaco (`shared.panel`) y un resplandor ámbar suave en los primeros
360 px (`StageGlow`).

**Táctil y accesible**: botones de 40 px (46 la acción principal), controles −/+ de 34 px con área
extra, casillas de 20 px; anillo de foco ámbar al navegar con teclado y sin animaciones si el sistema
pide reducir movimiento.

## Componentes base

| Componente                            | Archivo              | Para qué                                                                        |
| ------------------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| `Button`                              | `ui/button.tsx`      | Variantes `default` (ámbar), `secondary`, `outline`; tamaños `sm`, `lg`, `icon` |
| `Input`, `PasswordInput`, `DateInput` | `ui/`                | Campos; la contraseña tiene botón para mostrarla                                |
| `Chip`                                | `ui/chip.tsx`        | Instrumentos y filtros; seleccionable                                           |
| `Segmented`                           | `ui/segmented.tsx`   | Pestañas tipo píldora (Semana / Mes / Año, Soy alumno / Soy profesor)           |
| `Dialog`                              | `ui/dialog.tsx`      | Modal centrado; se cierra con la X, clic afuera o Escape                        |
| `Section`, `Badge`                    | `ui/section.tsx`     | Tarjeta con título y acciones; insignias de estado                              |
| `Stat`                                | `ui/stat.tsx`        | Indicadores grandes del inicio del profesor                                     |
| `Progress`                            | `ui/progress.tsx`    | Barra de progreso                                                               |
| `EmptyState`                          | `ui/empty-state.tsx` | Lista vacía con ícono, explicación y acción                                     |
| `MaterialList`, `UploadButton`        | `Materials.tsx`      | Archivos con reproductor de audio/video y subida con barra de avance            |
| `ClaseItem`, `Avatar`                 | `ClaseItem.tsx`      | Fila de clase con fecha en chip; iniciales de la persona                        |

Los íconos son de [Lucide](https://lucide.dev).

## Pantallas

### Login (`/` sin sesión)

- **Logo** (ícono de pulso + PULSO) arriba del formulario; en escritorio, arriba de la columna
  izquierda.
- **Escritorio**: dos columnas. A la izquierda, el mensaje "Cada sesión cuenta. Vuelve a tu
  instrumento." con los instrumentos; a la derecha, el formulario.
- **Celular**: solo el formulario.
- Campos: **Nro. de documento** (teclado numérico, precargado si se marcó Recordarme) y
  **Contraseña**.
- **Recordarme** (tildado por defecto) a la izquierda y _¿Olvidaste tu contraseña?_ a la derecha.
- Selector de tema arriba a la derecha.
- Enlaces: _¿Olvidaste tu contraseña?_, _Crea tu cuenta_ y _¿Cómo empiezo? Mira los primeros pasos_.
- Errores concretos: "No hay ninguna cuenta con ese número de documento." o "Contraseña
  incorrecta.", para saber si hay que registrarse o recuperar la contraseña.
- Cada modal tiene su propia URL, así se puede abrir en otra pestaña o compartir.

**Modal Crear cuenta** (`?modal=registro`)

1. Tarjetas grandes **Alumno** / **Profesor** ("¿Eres alumno o profesor?").
2. Nombre y apellido, Nro. de documento (con aclaración de para qué sirve), correo y contraseña.
3. Instrumentos con chips seleccionables; la pregunta cambia según el rol.
4. Errores concretos: documento ya registrado, correo en uso, falta instrumento…

**Modal Recuperar contraseña** (`?modal=recuperar`): número de documento y correo de la cuenta; si
coinciden, confirma a qué correo se envió el enlace.

**Modal Primeros pasos** (`?modal=primeros-pasos`): pestañas _Soy alumno_ / _Soy profesor_ con
pasos numerados para registrarse y para la primera vez que se entra, y un botón **Crear mi
cuenta**.

**Cuenta incompleta**: si el registro quedó a medias (cuenta sin perfil), en lugar de la app se ve
"Tu cuenta no terminó de crearse" con un botón **Salir** que borra esa cuenta para poder
registrarse de nuevo con el mismo correo.

### Navegación

- **Celular (< 640 px)**: barra inferior con íconos y texto (profesor: Inicio, Planificación,
  Perfil; alumno: Inicio, **Practicar**, Perfil). _Practicar_ lleva directo al modo práctica de la
  próxima clase (`/practicar`).
- **Avisos** breves abajo de la pantalla para lo que pasó ("Foto actualizada", errores al guardar)
  y para deshacer ("Bloque eliminado · **Deshacer**").

### Barra superior (con sesión)

Logo a la izquierda (lleva al inicio); navegación del rol (profesor: _Inicio_, _Planificación_); a la
derecha el selector de tema, el nombre, el rol y la foto (llevan a **Mi perfil**) y **Salir**. En
celular la navegación muestra solo íconos, la cuenta solo la foto y el tema se cambia desde el
perfil.

### Mi perfil (`/perfil`)

- **Foto de perfil**: foto grande (o iniciales), **Subir foto** / **Cambiar foto** y **Quitar foto**.
  La imagen se recorta en cuadrado y se achica a 512 px en el navegador antes de subirla.
- **Mis datos**: nombre, número de documento, correo, rol e instrumentos.
- **Apariencia**: Sistema, Claro u Oscuro.

### Profesor · Inicio (`/`)

- Saludo e instrumentos que enseña.
- Indicadores: **Alumnos**, **Clases este mes**, **Entregas esta semana**.
- **Agregar alumno**: un solo buscador que acepta número de documento o nombre; cada resultado
  muestra botones "+ Guitarra", "+ Piano"… (uno por instrumento que enseña) y "Guitarra ✓" si ya está
  en la lista.
- **Mis alumnos**: filtro por instrumento; por alumno, avatar, documento, instrumento, barra de
  progreso, porcentaje y "x de y clases". Tocar la fila abre el detalle.
- **Próximas clases** con acceso directo a Planificación.

### Profesor · Planificación (`/planificacion`)

- Pestañas **Semana / Mes / Año**, flechas para moverse, botón **Hoy** y filtro por instrumento.
- **Semana**: los 7 días, con "+" en cada día para crear una clase ese día.
- **Mes**: los días que tienen clases.
- **Año**: los 12 meses con sus clases, para ver el plan completo.
- **Nueva clase** (modal): instrumento, título, fecha, objetivos y tarea, y **Repetir cada semana
  hasta…** (muestra cuántas clases se van a crear, máximo 60).

### Profesor · Alumno (`/alumnos/:id`)

Encabezado con nombre y documento; una tarjeta por instrumento con el porcentaje grande, la barra y
la lista de clases con su estado _Entregada_ / _Pendiente_.

### Clase (`/clases/:id`)

- Fecha, título, instrumento y profesor.
- **Objetivos y tarea**.
- **Plan de la clase** (bloques):
  - **Sin plan**: _Usar plantilla de 60 min_ (calentamiento con tempo, técnica con tablatura,
    acordes y rasgueo de la canción, tarea) o _Empezar en blanco_.
  - **Ficha** con selectores de un toque: nivel, estilo (incluye Folclore paraguayo), afinación,
    capo y duración.
  - **Línea de tiempo**: un segmento por bloque, del color de su etapa; avisa en rojo si los
    minutos superan la duración.
  - **Escritorio (≥ 1100 px), dos columnas**: a la izquierda el índice fijo _Orden de la clase_
    (punto de color de la etapa, título, minutos): tocar un bloque lo abre y lleva a él; arrastrar
    cambia el orden. A la derecha los bloques.
  - **Bloques en acordeón**: uno abierto a la vez; los demás plegados muestran título y un resumen
    ("Repertorio · G · C · D · Em", "4/4 · 80 BPM · ↓ · ↓ ↑…"). Cada tarjeta tiene borde del color
    de su etapa, minutos, subir, bajar, eliminar y plegar.
  - **"+" entre bloques** para insertar justo ahí; al final, _Agregar bloque_. Ambos abren la paleta
    con los tipos del instrumento.
  - **Eliminar con _Deshacer_** (6 s) en lugar de confirmaciones del navegador; los archivos se
    borran recién cuando vence el plazo.
  - **Tablatura**: atajos (Nota, Acorde, Silencio, Compás, duraciones), editor de texto, ayuda
    "¿Cómo se escribe?" y la partitura (pentagrama + tab) sobre papel, con reproducir, detener y
    velocidad (50–125 %). Tocar una nota reproduce desde ahí.
  - **Acordes**: diagramas propios (cejilla, cuerdas al aire y apagadas) con nombres en inglés o en
    español; sugerencias de un toque.
  - **Rasgueo**: casillas por corchea con ↓ ↑ ✕ · que cambian al tocarlas, conteo (1 y 2 y…) y
    _Escuchar_ con sonido de rasgueo y la casilla que suena iluminada.
  - **Tempo**: escalera de BPM (inicio → objetivo) y metrónomo con sonido al tempo elegido.
  - **YouTube** embebido, **Archivos** (galería de imágenes, vista previa de PDF y de partituras
    Guitar Pro / MusicXML, reproductores de audio y video) y **Texto**.
  - Guardado automático con indicador (_Guardando…_ / _Guardado_) y **Vista del alumno** para ver
    la clase como la verá el alumno.
  - **Alumno**: resumen del plan con _Hecho_ en cada bloque, la barra "x de y bloques practicados"
    y **Empezar / Continuar práctica**, que abre el **modo práctica**: un bloque por pantalla con
    "Bloque 2 de 5" y puntos de avance, cronómetro con los minutos sugeridos (sigue contando en
    ámbar al pasarse), el contenido en grande, _Anterior_ y **Hecho y siguiente**, y al final
    _¡Práctica terminada!_ con la invitación a subir la entrega. `?practicar=1` lo abre directo.
- **Materiales** (u **Otros materiales** si hay plan): lista con tipo y tamaño; audio y video se
  reproducen ahí mismo, PDF y partituras se abren en otra pestaña.
- **Profesor**: Editar, Eliminar (pide confirmación y avisa que también se borran los materiales y
  las entregas de los alumnos), Subir materiales (con barra de avance por archivo) y **Entregas de
  alumnos** ("1 de 3 alumnos entregaron", con sus archivos y comentarios).
- **Alumno**: **Tu entrega**, con insignia de estado, botón **Subir audio o video**, sus archivos y un
  comentario para el profesor.

### Alumno · Inicio (`/`)

- Saludo y su número de documento bien visible (para dárselo al profesor).
- **Tu próxima práctica** (borde ámbar): la clase pendiente más cercana (hoy, mañana o atrasada),
  sus bloques y minutos y **Practicar ahora**; al lado la **racha** (días seguidos) y los **minutos
  de esta semana**. Si no hay pendientes: "¡Estás al día!".
- Sin profesor todavía: aviso explicando que el profesor debe agregarlo.
- Con profesores: una tarjeta por profesor e instrumento con el porcentaje, la barra y las clases,
  ordenadas primero las atrasadas sin entregar, luego las próximas y al final las entregadas.
- Metrónomo a mano en la columna lateral.

## Adaptable y accesible

- Puntos de corte: 640 px (celular → tablet) y 1024 px (dos columnas).
- Botones y enlaces son elementos reales (`<a href>` en los enlaces): se pueden abrir en otra
  pestaña.
- Los estados se anuncian a lectores de pantalla (`aria-checked`, `aria-selected`, etiquetas en los
  campos).
- Contraste alto: texto claro sobre fondo carbón; el ámbar se reserva para acciones y progreso.

## Ideas para las próximas versiones

| Pantalla          | Mejora sugerida                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Planificación     | Cuadrícula de calendario en la vista Mes y arrastrar clases para cambiarlas de día                 |
| Clase             | Que el profesor marque cada entrega como _Revisada_ y deje una devolución escrita o en audio       |
| Entregas          | Grabar audio o video directamente desde el navegador, sin subir un archivo                         |
| Materiales        | Visor de partituras MusicXML dentro de la página                                                   |
| Inicio del alumno | Racha de días de práctica y recordatorios de la próxima clase                                      |
| General           | Notificaciones (nueva clase, nueva entrega), avisos tipo _toast_ y esqueletos de carga             |
| Pagos             | Pantalla de suscripción y estado del plan (ver [arquitectura](arquitectura.md#próximamente-pagos)) |
