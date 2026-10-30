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

Tema **oscuro de escenario**: fondo carbón con luz ámbar de platillo. Todo sale de
[`src/lib/theme.ts`](../src/lib/theme.ts); no se escriben colores sueltos en las pantallas.

| Token                 | Valor                 | Uso                                 |
| --------------------- | --------------------- | ----------------------------------- |
| `background`          | `#100c0a`             | Fondo de la app                     |
| `card`                | `#1c1714`             | Paneles y modales                   |
| `primary`             | `#f9a129`             | Acción principal, progreso, enlaces |
| `foreground`          | `#f8f5ef`             | Texto principal                     |
| `mutedForeground`     | `#a69d91`             | Texto secundario                    |
| `secondary` / `muted` | `#2b2520` / `#25211d` | Botones secundarios y filas         |
| `destructive`         | `#e62b34`             | Errores                             |
| Verde de _Entregada_  | `#5fd38d`             | Insignia de éxito                   |

**Tipografía**: _Bebas Neue_ para títulos (mayúsculas, impacto de cartel de concierto) y _Barlow_
para el texto (400, 500, 600 y 700). Se cargan antes del primer pintado
([`fonts.ts`](../src/lib/fonts.ts)).

**Formas**: radios de 10 a 22 px, paneles semitransparentes con borde sutil (`shared.panel`) y un
resplandor ámbar desde arriba (`StageGlow`).

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

### Login (`/login`)

- **Escritorio**: dos columnas. A la izquierda, el mensaje "Cada sesión cuenta. Vuelve a tu
  instrumento." con los instrumentos; a la derecha, el formulario.
- **Celular**: solo el formulario.
- Campos: **Nro. de documento** (teclado numérico) y **Contraseña**.
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

### Barra superior (con sesión)

Marca a la izquierda; navegación del rol (profesor: _Inicio_, _Planificación_); nombre, rol y
**Salir** a la derecha. En celular la navegación muestra solo íconos.

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
- **Materiales**: lista con tipo y tamaño; audio y video se reproducen ahí mismo, PDF y partituras
  se abren en otra pestaña.
- **Profesor**: Editar, Eliminar (pide confirmación y avisa que también se borran los materiales y
  las entregas de los alumnos), Subir materiales (con barra de avance por archivo) y **Entregas de
  alumnos** ("1 de 3 alumnos entregaron", con sus archivos y comentarios).
- **Alumno**: **Tu entrega**, con insignia de estado, botón **Subir audio o video**, sus archivos y un
  comentario para el profesor.

### Alumno · Inicio (`/`)

- Saludo y su número de documento bien visible (para dárselo al profesor).
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
