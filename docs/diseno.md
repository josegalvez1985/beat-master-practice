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
404). `npm run iconos` regenera desde el SVG todos los PNG y el `favicon.ico`. Después de cambiar el
logo, sube el `?v=` de los íconos y de `og-image.png` en `index.html`: navegadores, WhatsApp y
Facebook guardan las imágenes por su dirección y si no cambia siguen mostrando la vieja.

| Archivo                                  | Uso                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `public/favicon.svg`, `favicon.png` (96) | Pestaña del navegador y resultados de Google                                    |
| `public/favicon.ico` (16, 32, 48)        | Navegadores y apps que piden `/favicon.ico` directo (favoritos, vistas previas) |
| `public/icons/icon-192/512.png`          | App instalada (manifest) y logo en los datos para Google                        |
| `public/icons/apple-touch-icon.png`      | Acceso directo en iPhone/iPad                                                   |
| `public/og-image.png` (1200×630)         | Vista previa al compartir el enlace (WhatsApp, Facebook, X…)                    |
| `public/brand/icon-1024.png`             | Ícono en alta resolución                                                        |
| `public/brand/logo.png`                  | Logo horizontal transparente (2800×960) para **fondos oscuros**                 |
| `public/brand/logo-fondo-claro.png`      | Igual, con texto oscuro para **fondos claros** (documentos, etc.)               |

**Formas**: tres radios (8 controles chicos, 12 tarjetas y campos, 20 paneles grandes), superficies
sólidas por elevación con borde opaco (`shared.panel`) y un resplandor ámbar suave en los primeros
360 px (`StageGlow`).

**Táctil y accesible**: botones de 40 px (46 la acción principal), controles −/+ de 34 px con área
extra, casillas de 20 px; anillo de foco ámbar al navegar con teclado y sin animaciones si el sistema
pide reducir movimiento.

## Ilustraciones y animación

Las imágenes del sitio son **SVG dibujado en el código y animaciones CSS**, no fotos, videos ni
librerías de animación: pesan unos KB, no descargan nada y no gastan memoria del dispositivo.
[`EscenaMusical`](../src/components/ui/escena-musical.tsx) es la base para reutilizar:

- **Qué muestra**: al centro el **arpa paraguaya** (sello del sitio, en el login y para quien la
  toca) o un **ecualizador**; alrededor, burbujas con instrumentos que flotan; notas que suben y la
  **línea de pulso** de la marca con un destello que la recorre.
- **Personal**: recibe los instrumentos de la persona y los pone primero, así la escena es la de
  _su_ música sin perder la idea del sitio.
- **Reglas para cualquier animación nueva**: solo `transform` y `opacity` (las resuelve la GPU,
  sin recalcular la página); colores de `colors` (cambian con el tema); `aria-hidden` si es
  decorativa o `role="img"` con descripción si dice algo; y quieta con
  `prefers-reduced-motion` (la escena la apaga, y la regla global corta las animaciones
  infinitas).
- **Tamaños usados**: 300 px de alto en el login de escritorio, 130 en el de celular (`compacta`),
  170 / 112 en la bienvenida.

## Componentes base

| Componente                            | Archivo                 | Para qué                                                                                                                                                                                  |
| ------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                              | `ui/button.tsx`         | Variantes `default` (ámbar), `secondary`, `outline` y `destructive` (rojo, solo para confirmar algo que no se deshace); tamaños `sm`, `lg`, `icon`                                        |
| `Input`, `PasswordInput`, `DateInput` | `ui/`                   | Campos; la contraseña tiene botón para mostrarla                                                                                                                                          |
| `Chip`                                | `ui/chip.tsx`           | Instrumentos y filtros; seleccionable                                                                                                                                                     |
| `Segmented`                           | `ui/segmented.tsx`      | Pestañas tipo píldora (Semana / Mes / Año, Soy alumno / Soy profesor)                                                                                                                     |
| `Dialog`                              | `ui/dialog.tsx`         | Modal centrado; se cierra con la X, clic afuera o Escape                                                                                                                                  |
| `confirmar()` + `Confirmaciones`      | `ui/confirmar.tsx`      | En lugar de `window.confirm` (ESLint lo prohíbe): ícono, título con la pregunta, qué pasa y qué se borra en una lista, y el botón con la acción ("Eliminar clase"); rojo si no se deshace |
| `Section`, `Badge`                    | `ui/section.tsx`        | Tarjeta con título y acciones; insignias de estado                                                                                                                                        |
| `Stat`                                | `ui/stat.tsx`           | Indicadores grandes del inicio del profesor                                                                                                                                               |
| `Progress`                            | `ui/progress.tsx`       | Barra de progreso                                                                                                                                                                         |
| `EmptyState`                          | `ui/empty-state.tsx`    | Lista vacía con ícono, explicación y acción                                                                                                                                               |
| `MaterialList`, `UploadButton`        | `Materials.tsx`         | Archivos con reproductor de audio/video y subida con barra de avance                                                                                                                      |
| `ClaseItem`, `Avatar`                 | `ClaseItem.tsx`         | Fila de clase con fecha en chip; iniciales de la persona                                                                                                                                  |
| `EscenaMusical`                       | `ui/escena-musical.tsx` | Ilustración animada: arpa o ecualizador, instrumentos flotando, notas y la línea de pulso                                                                                                 |
| `Bienvenida`                          | `Bienvenida.tsx`        | Saludo del inicio con la escena de los instrumentos de la persona                                                                                                                         |
| `Anillo`                              | `ui/anillo.tsx`         | Progreso circular con el porcentaje al centro; se llena al aparecer                                                                                                                       |
| `Pastilla`                            | `ui/pastilla.tsx`       | Etiqueta redonda con ícono y un dato ("Guitarra · 12 alumnos")                                                                                                                            |

Los íconos son de [Lucide](https://lucide.dev).

## Pantallas

### Login (`/` sin sesión)

- **Logo** (ícono de pulso + PULSO) arriba del formulario; en escritorio, arriba de la columna
  izquierda.
- **Escritorio**: dos columnas. A la izquierda, el logo, la **escena musical** (arpa paraguaya con
  las cuerdas vibrando, guitarra, batería, piano y micrófono flotando) y el mensaje "Cada sesión
  cuenta. Vuelve a tu instrumento." con los instrumentos; a la derecha, el formulario.
- **Celular**: el logo, una línea que dice qué es Pulso ("Exclusiva para profesores de música y
  sus alumnos…"; es lo que lee Google, que indexa la versión para celular), la escena en versión
  compacta y el formulario.
- Campos: **Nro. de documento** (teclado numérico, precargado si se marcó Recordarme) y
  **Contraseña**.
- **Recordarme** (tildado por defecto) a la izquierda y _¿Olvidaste tu contraseña?_ a la derecha.
- Selector de tema arriba a la derecha.
- Enlaces: _¿Olvidaste tu contraseña?_, _Crea tu cuenta_, _¿Cómo empiezo? Mira los primeros pasos_
  y _¿Necesitas ayuda? Escríbenos_.
- Errores concretos: "No hay ninguna cuenta con ese número de documento." o "Contraseña
  incorrecta.", para saber si hay que registrarse o recuperar la contraseña.
- Cada modal tiene su propia URL, así se puede abrir en otra pestaña o compartir.

**Modal Crear cuenta** (`?modal=registro`)

1. Tarjetas grandes **Profesor** / **Alumno** ("¿Eres profesor o alumno?"), sin ninguna elegida al
   abrir: el rol no cambia después, así que tiene que ser una decisión. El enlace de invitación de
   un profesor (`&rol=alumno`) abre con Alumno elegido.
2. Nombre y apellido, Nro. de documento (con aclaración de para qué sirve), **celular** (solo profesores,
   obligatorio: "Solo lo ve el equipo de Pulso"), correo y contraseña.
3. Instrumentos con chips seleccionables; la pregunta cambia según el rol.
4. Errores concretos: documento ya registrado, correo en uso, falta instrumento…

**Modal Recuperar contraseña** (`?modal=recuperar`): número de documento y correo de la cuenta; si
coinciden, confirma a qué correo se envió el enlace. Después de crear la contraseña nueva en la
página de Firebase, **Continuar** vuelve al login.

**Modal Contacto** (`?modal=contacto`, también en _Mi perfil_): motivo (Consulta, Problema con mi
cuenta, Algo no funciona, Sugerencia), nombre, número de documento (opcional sin cuenta) y la
consulta; **Enviar por WhatsApp** abre el chat con el 0986 103 839 con el mensaje ya escrito y el
modal dice "¡Gracias! Se abrió WhatsApp con tu mensaje…" (con el número por si no se abrió).
Aclara que los datos solo se usan para responder y que no se guardan en Pulso.

**Modal Primeros pasos** (`?modal=primeros-pasos`): pestañas _Soy alumno_ / _Soy profesor_ con
pasos numerados para registrarse y para la primera vez que se entra (plan de la clase, entregas
grabadas, herramientas, avance), y un botón **Crear mi cuenta**. Los pasos están en
[`PrimerosPasosDialog.tsx`](../src/components/PrimerosPasosDialog.tsx): **actualízalos cada vez que
se agregue algo que el alumno o el profesor usen**.

**Cuenta incompleta**: si el registro quedó a medias (cuenta sin perfil), en lugar de la app se ve
"Tu cuenta no terminó de crearse" con un botón **Salir** que borra esa cuenta para poder
registrarse de nuevo con el mismo correo.

### Navegación

- **Celular (< 640 px)**: barra inferior con íconos y texto (profesor: Inicio, Planificación,
  Herramientas, Mi plan, Perfil; alumno: Inicio, **Practicar**, Herramientas, Perfil). _Practicar_ abre la práctica de hoy con el afinador y el metrónomo
  a mano (`/practicar`).
- **Avisos** breves abajo de la pantalla para lo que pasó ("Foto actualizada", errores al guardar)
  y para deshacer ("Bloque eliminado · **Deshacer**").

### Barra superior (con sesión)

Logo a la izquierda (lleva al inicio); navegación del rol (profesor: _Inicio_, _Planificación_, _Herramientas_, _Mi plan_; alumno: _Inicio_,
_Practicar_, _Herramientas_); a la
derecha el selector de tema, el nombre, el rol y la foto (llevan a **Mi perfil**) y **Salir**. En
celular la navegación muestra solo íconos, la cuenta solo la foto y el tema se cambia desde el
perfil. La cuenta del administrador ve _Admin_ (ícono de base de datos) en lugar de _Mi plan_ (su
plan dice solo "Todo habilitado" y sigue en el perfil), en la barra superior y en la inferior. En
la barra inferior las pestañas se reparten el ancho (nunca más ancha que la pantalla, aun en
320 px) y _Planificación_ se lee _Planificar_.

### Mi perfil (`/perfil`)

- **Foto de perfil**: foto grande (o iniciales), **Subir foto** / **Cambiar foto** y **Quitar foto**.
  La imagen se recorta en cuadrado y se achica a 512 px en el navegador antes de subirla.
- **Mis datos**: nombre, número de documento, correo, rol e instrumentos; el profesor, además, su
  **celular** ("solo lo ve el equipo de Pulso") con _Cambiar_, o un recuadro ámbar para agregarlo si
  se registró antes de que fuera obligatorio.
- **Instrumentos que enseñas / estudias**: los actuales y botones "+ Piano"… para agregar más
  (con confirmación). No se quitan desde la app.
- **Apariencia**: Sistema, Claro u Oscuro.
- **Mi plan** (solo profesores): el estado en una línea ("Prueba gratis hasta el …", "Profesor,
  activo hasta el …", "Vencido…") y _Ver mi plan y cómo pagar_.
- **Manual de uso**: _Abrir el manual_ abre un diálogo con los temas del rol (profesor o alumno)
  plegables, uno abierto a la vez (borde `primary` y fondo `selected`), con pasos numerados. El
  contenido está en [`manual.ts`](../src/lib/manual.ts): actualízalo junto con _Primeros pasos_.
- **Ayuda y contacto**: _Escribir a Pulso_ abre el formulario de contacto con sus datos cargados.
- **Eliminar mi cuenta** (al final; no aparece en la cuenta del administrador): botón `outline`
  con la papelera y el texto en `colors.destructive`. Abre un diálogo que lista, con puntos rojos,
  todo lo que se borra según el rol, dice qué se conserva (al profesor, sus pagos y su plan), pide
  la **contraseña** y confirma con el botón rojo _Eliminar para siempre_ (con "Eliminando… puede
  tardar un minuto"). Al terminar vuelve al login con el aviso "Tu cuenta y todos tus datos se
  eliminaron de Pulso" (`/?cuenta=eliminada`).

### Profesor · Inicio (`/`)

- **Bienvenida**: saludo, una **frase motivadora** del día (`src/lib/frases.md`: una por día, las 100 sin repetir) e instrumentos que enseña, con una pastilla por instrumento y **cuántos
  alumnos** tiene en esa lista ("Guitarra · 12 alumnos"), junto a la escena musical con **sus**
  instrumentos flotando (el arpa al centro si la enseña; si no, el ecualizador).
- **Para hoy**, lo primero: una fila tocable por cada cosa que lo necesita, en el orden en que la
  atendería: entregas por revisar (borde `primary` y fondo `selected`), clases de hoy con para quién
  son, quién avisó que no puede ir, mensajes nuevos y alumnos sin entregar hace más de 14 días. Sin
  nada, "Nada urgente".
- Indicadores: **Alumnos**, **Clases este mes**, **Por revisar**.
- **Mis alumnos**: _Agregar alumno_ arriba a la derecha (ámbar solo si todavía no tiene ninguno);
  filtro por instrumento; por alumno, avatar, instrumento, nivel, "x de y clases entregadas" y la
  barra con el porcentaje de su ruta de aprendizaje. Tocar la fila abre el detalle.
- **Agregar alumno** (modal): solo por **número de documento**, nunca por nombre (dos alumnos pueden
  llamarse igual; el documento es único). Dos campos: _Nro. de documento_ (con _Buscar_) y, aparte,
  _Nombre del alumno_ en solo lectura, que se completa al encontrarlo para que el profesor
  confirme que es él; cambiar el número lo vacía. Debajo, botones "+ Guitarra", "+ Piano"… (uno por
  instrumento que enseña) y "Guitarra ✓" si ya está en la lista. Si el número es de un profesor, lo
  dice; si no tiene cuenta, ofrece **Invitar por WhatsApp**.
- **Próximas clases** con para quién es cada una y acceso directo a Planificación.

### Profesor · Por revisar (`/revision`)

Título con cuántas faltan; una tarjeta con la entrega actual (nombre del alumno, clase y fecha, _Le
costó: …_, su comentario, archivos con comentarios escritos o grabados, rúbrica y **Revisada y
siguiente**), _Después_ para dejarla al final y, debajo, _En la cola_: los demás, tocables. Vacía:
"¡Todo revisado!".

### Profesor · Planificación (`/planificacion`)

- Pestañas **Semana / Mes / Año**, flechas para moverse, botón **Hoy** y filtro por instrumento.
- **Semana**: los 7 días, con "+" en cada día para crear una clase ese día.
- **Mes**: los días que tienen clases.
- **Año**: los 12 meses con sus clases, para ver el plan completo.
- Cada clase dice para quién es ("Ana Pérez", "Ana y Luis", "Todos").
- **Nueva clase** (modal): instrumento, **para quién es** (_Elegir alumnos_, con un chip por alumno
  de esa lista, o _Todos los de Guitarra_; hay que elegir: "toda la lista" nunca pasa por no mirar),
  título, fecha, **hora** (opcional, "18:30"),
  **modalidad** (presencial o virtual con el **enlace** de la videollamada), objetivos y tarea,
  **Es un recital o muestra** (lugar y programa: quién toca qué) y **Repetir cada semana hasta…**
  (muestra cuántas clases se van a crear, máximo 60).

### Profesor · Mi plan (`/plan`)

- **Tu plan**: insignia con el plan, el estado en una frase (prueba, activo, en gracia con la fecha
  límite, o vencido), "N de M alumnos" con barra (en rojo si pasa el límite) y la regla de los 5
  días hábiles.
- **Planes**: tres tarjetas (Inicial, Profesor, Academia) con el precio en `fonts.display`, "por
  mes" y lo que incluye; la del plan actual con `colors.selected` + borde `primary` y _Tu plan_; "este
  plan no alcanza" en rojo si tiene más alumnos.
- **Cómo pagar**: pasos numerados con los datos de ueno (banco, titular, alias o cuenta,
  seleccionables para copiar), el concepto `Pulso {documento}` y, si hay WhatsApp configurado,
  _Enviar comprobante_. Sin datos configurados, un aviso para escribir desde _Ayuda y contacto_.
- **Tus pagos**: plan, meses, "hasta el …", referencia y monto; las cortesías como "Días de
  cortesía" con su motivo. La cuenta del administrador dice que tiene todo habilitado.
- **Aviso del plan** (`AvisoPlan`) arriba de Inicio, Planificación y la clase del profesor: con
  7 días o menos, en gracia (borde ámbar, _Ver mi plan_) o bloqueado (borde rojo, _Renovar mi
  plan_). Con el plan bloqueado no aparecen _Nueva clase_, _Editar_, _Duplicar_ ni _Subir_; en su
  lugar, "Con tu plan vencido no puedes …" con _Mi plan_. _Agregar alumno_ muestra "Tienes N de M
  alumnos" y el motivo exacto si la función lo rechaza (límite o plan vencido).

### Profesor · Alumno (`/alumnos/:id`)

Encabezado con nombre y documento; una tarjeta por instrumento con "x de y clases entregadas", cuántas
veces asistió y **Nueva clase** (ya viene con el alumno elegido). Primero, **Para preparar la clase**
(fondo `muted`): última clase y qué le costó, práctica de la semana, tu última evaluación, comentarios
sin responder, metas, tempos y próxima clase; **Enviar resumen a la familia** (WhatsApp) y **Tus notas
privadas**. Después, la lista de clases con su estado _Entregada_ / _Pendiente_, su **ruta de
aprendizaje** (nivel inicial, básico, intermedio o avanzado con sus objetivos: el profesor elige el
nivel y marca cada objetivo de un toque), sus **habilidades** (el promedio de cada criterio de la
rúbrica, con flecha si subió) y su **diario de práctica** de ese instrumento (minutos de la semana en ese
instrumento, su meta semanal total como dato aparte y las últimas anotaciones).

### Clase (`/clases/:id`)

- Fecha, título, instrumento, profesor y, si los tiene, hora, modalidad y _Recital_. Con hora:
  **Google Calendar** y **Otro calendario (.ics)**, con aviso una hora antes; si es virtual,
  **Entrar a la videollamada**.
- **Recital**: lugar y programa numerado (obra e intérprete).
- **Alumno**: en una clase de hoy o futura, **No puedo ir** (motivo opcional); después, _Avisaste
  que no vas_. En sus devoluciones, _Entendido_ / _Ya lo corregí_ debajo de cada comentario, y "2
  sin responder" en el archivo.
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
    con los tipos del instrumento y, arriba, **De tu biblioteca**: los bloques guardados de ese
    instrumento (la ✕ los quita de la biblioteca). En cada bloque, el ícono de marcador lo
    **guarda en tu biblioteca** (menos los de archivos).
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
  - **Partitura** (teclados, arco, viento, voz y arpa): el mismo editor que la tablatura, con
    atajos de notas por nombre (Do4, acorde, silencio, figuras) y el pentagrama sin tab, con la clave
    y el sonido del instrumento.
  - **Escala o arpegio**: tónica, tipo (mayor, menores, pentatónicas, blues, cromática, arpegios),
    octavas, figura y tempo; las notas en Do-Re-Mi, el teclado iluminado y _Escuchar_ con la nota que
    suena resaltada.
  - **Respiración** (voz y viento): segundos para inhalar, sostener y exhalar, repeticiones y una
    nota opcional; un círculo que crece al inhalar y se achica al exhalar, con la cuenta, y la nota
    sonando al exhalar (vocalización o nota larga).
  - **Afinar** (instrumentos con afinador): abre el afinador en un modal con la afinación de la ficha.
  - **YouTube** embebido (con velocidad y repetición A-B), **Archivos** (galería de imágenes, vista previa de PDF y de partituras
    Guitar Pro / MusicXML, reproductores de audio y video) y **Texto**.
  - Guardado automático con indicador (_Guardando…_ / _Guardado_) y **Vista del alumno** para ver
    la clase como la verá el alumno.
  - **Alumno**: resumen del plan con _Hecho_ en cada bloque, la barra "x de y bloques practicados"
    y **Empezar / Continuar práctica**, que abre el **modo práctica**: un bloque por pantalla con
    "Bloque 2 de 5" y puntos de avance, cronómetro con los minutos sugeridos (sigue contando en
    ámbar al pasarse), el contenido en grande, _Anterior_, _Me costó_ y **Me salió y sigo** (un pedal Bluetooth o las flechas ← → pasan sin opinar); la pantalla queda encendida; y al final
    _¡Práctica terminada!_ con la invitación a subir la entrega (es lo que cuenta en el avance de las clases) y el aviso
    "Anotamos N min en tu diario: tu avance de la semana ya se actualizó" (se anota solo). `?practicar=1` lo abre directo.
- **Materiales** (u **Otros materiales** si hay plan; el profesor tiene **De mi biblioteca**: sus
  archivos para reusar, con _Usar_, _Subir a mi biblioteca_ y la papelera con _Deshacer_): lista con tipo y tamaño; audio y video se
  reproducen ahí mismo con **velocidad** (50, 75, 90, 100 %, sin cambiar el tono) y **repetir de A
  a B** para un pasaje, PDF y partituras se abren en otra pestaña. La papelera (del profesor en los
  materiales, del alumno en sus archivos de la entrega) quita el archivo con **Deshacer** (6 s), y
  si el borrado falla lo vuelve a mostrar con un aviso de error.
- **Profesor**: la insignia _Para: …_, Editar, Eliminar (pide confirmación y avisa que también se borran los materiales y
  las entregas de los alumnos), Duplicar (a otra fecha y para otros alumnos), Subir materiales (con barra de avance por archivo; en celular y tablet, también **Sacar foto**, que abre la cámara) y **Alumnos de la
  clase** ("1 de 3 entregaron · 2 asistieron"), solo los alumnos de esa clase, con **Pasar lista** (modal: Presente, Llegó tarde,
  Ausente por alumno, tocar la marcada la borra, y _Marcar presentes a los N que faltan_). Por alumno, insignias de asistencia y de _Pendiente_ / _Por revisar_ / _Revisada_, _Le costó: …_, sus archivos con el **análisis** de la grabación (estabilidad del tiempo, BPM y, en arco, viento y voz, notas
  afinadas), comentarios en un segundo (escritos o **Grabar mi respuesta**, en audio o video; la diana los **convierte en meta** de la semana), **Evaluar con rúbrica** (1 a 5 por criterio
  del instrumento y una devolución breve), **Marcar como revisada** y **Mensajes** (ámbar con "2 nuevos").
- **Alumno**: **Tu entrega**, con insignia de estado, la **evaluación de tu profesor** (barras por
  criterio y su devolución), **Grabar audio / video** ahí mismo (_Sin click_ / _Con click_ con el
  tempo, y el aviso de usar auriculares; primero una **cuenta** con el número grande en ámbar y
  _Cancelar_; al terminar, **Analizando tu grabación…** y el resultado, que se envía con la
  grabación; se escucha, se puede repetir o descargar, y **Enviar a mi profesor**; sin enviar, vuelve
  al abrir la clase, "Tenías esta grabación sin enviar", y sin conexión avisa que se enviará sola), _Subir audio, video, foto o PDF_ como alternativa (fotos y PDF hasta 20 MB: una tarea escrita, una partitura copiada) y, en celular y tablet, **Sacar foto** con la cámara, sus archivos, un comentario para el profesor
  y **Mensajes con tu profesor** (una charla por clase; cada uno borra los suyos).

### Alumno · Inicio (`/`)

- **Bienvenida**: saludo, una **frase motivadora** del día (`src/lib/frases.md`: una por día, las 100 sin repetir), **sus instrumentos** en pastillas y **su semana** en un anillo de
  progreso que se llena al aparecer (verde al 100 %): meta semanal o, sin meta, clases de la semana
  entregadas (ver _Progreso_ en [arquitectura](arquitectura.md#progreso)); al lado, la escena con sus
  instrumentos. El número de documento sigue en el aviso para quien aún no está en una lista y en
  _Mi perfil_.
- **Primera vez**: _Bienvenido a Pulso_, cuatro pasos con ícono y _Siguiente_ / _Saltar_, y _¿Cómo
  tocas hoy?_ con los cuatro niveles descritos por instrumento.
- Sin profesor todavía: aviso explicando que el profesor debe agregarlo.
- Con profesores, tres pestañas (`Segmented`, en la URL: `?ver=`), una pregunta cada una:
  - **Hoy** (qué hago): **Tu profesor te dijo** si hay algo nuevo (comentarios sin responder,
    evaluaciones de los últimos 14 días, mensajes sin leer; cada fila lleva a la clase) y **Tu
    práctica de hoy** (borde ámbar): 10, 20 o 40 min; la clase pendiente más cercana (hoy, mañana o
    atrasada) con **Practicar ahora**, o "¡Estás al día!"; los pasos numerados con sus minutos
    (calentamiento, la clase, _Refuerza: tiempo_…, _Repasa: obra_ con **Hecho**), que llevan a donde
    se hace; las metas sin cumplir y "Esta semana: 5 de 7 días · 120 min". Al lado, **Diario de
    práctica** (minutos contra la meta, _Anotar práctica_).
  - **Mis clases**: una tarjeta por profesor e instrumento con "x de y clases entregadas", la barra
    y las clases (con su hora, _Recital_ o _Virtual_), ordenadas primero las atrasadas sin entregar,
    luego las próximas, las entregadas y, al final y sin estado, las de antes de que entrara.
  - **Mi progreso**: por lista, **ruta de aprendizaje** (nivel y objetivos que marcó el profesor),
    **Metas de la semana** (casillas, agregar y "Semanas anteriores: 5 de 7 cumplidas"),
    **Repertorio** (cada obra con su estado, _Repasé hoy_ y a qué tempo va) y sus **habilidades**;
    **Mi evolución**: la primera grabación al lado de la última y los gráficos de desvío del tiempo
    y, en arco, viento y voz, notas afinadas (tocar un punto muestra fecha y valor); **Lo que me
    dijo mi profesor** (todo, de lo más nuevo a lo más viejo, con _Ver más_) y **Tus insignias** (las
    ganadas primero; las otras, con lo que falta: "3 de 7 días").

### Alumno · Practicar (`/practicar`)

Título, **Tu práctica de hoy** (la misma de _Hoy_) y, a mano, el **afinador** (solo si estudia un
instrumento que lo usa), el metrónomo y **Más herramientas para practicar**.

### Herramientas (`/herramientas`)

- Para alumnos y profesores. Arriba, el instrumento (si hay varios); debajo, tarjetas con **solo las
  herramientas de ese instrumento** (la elegida con `selected` + borde `primary`), y la herramienta
  abierta en un panel. Un alumno de batería ve metrónomo, grabadora y diario; uno de piano, también
  acordes con teclado, oído y lectura en clave de sol y fa.
- **Metrónomo**: BPM grande, pulsos del compás, _Iniciar práctica_; compás, subdivisión, _Marcar el
  tempo_ y _Subir el tempo solo_ (+N BPM cada N compases hasta un tope). En el inicio esas opciones
  están plegadas en _Más opciones_.
- **Grabadora**: Audio / Video, _Sin click_ / _Con click_ (tempo con −/+ y aviso de auriculares) y
  **Grabar**; mientras graba, punto rojo y tiempo, los cuatro pulsos del click (el que suena en
  ámbar) y la cámara en espejo; después, la toma con velocidad y bucle, su **análisis** (notas
  afinadas, estabilidad del tiempo y BPM), _Grabar de nuevo_ y _Descargar_.
- **Acordes**: buscador (inglés o Do-Re-Mi) y sugerencias; el acorde con su nombre ("Sol mayor"),
  diagrama o teclado, sus notas y _Escuchar_ / _Nota por nota_.
- **Oído** y **Lectura**: marcador de aciertos (y racha desde 3), _Empezar_ / _Siguiente_, respuestas
  que se marcan en verde (correcta) o rojo (la elegida, si falló). La lectura dibuja el pentagrama
  sobre papel en los dos temas. **Lectura → Primera vista**: Fácil (negras y blancas) o Media
  (corcheas y saltos), tempo, la melodía nueva en la partitura con sonido y _Otra melodía_.
- **Polca y guarania**: Polca paraguaya, Guarania o Galopa con su descripción y un consejo; el tono
  (Sol, Re, La… o sus menores), los 16 compases con su acorde (el que suena, con borde ámbar), los
  diagramas en guitarra, ukelele y requinto, el tempo y **Acompañamiento** (bajo y rasgueo en
  bucle).
- **Diario** (solo alumnos): meta semanal con −/+, anotar (instrumento, hoy o ayer, minutos,
  comentario) y las últimas prácticas, que se borran con _Deshacer_.

### Batería

- **Profesor**: dos bloques propios.
  - **Groove**: grilla de pasos (filas = piezas del kit con su color, columnas = pasos con el conteo
    "1 e y a" debajo; el pulso con fondo más marcado y un espacio entre compases). Tocar una casilla
    alterna golpe → acento (más grande, con anillo) → nota fantasma (chica y tenue) → silencio.
    _Estilo de partida_ carga un groove de la biblioteca; compás, subdivisión, compases y tempo; "+"
    para sumar piezas (toms, ride, crash…).
  - **Rudimento**: elige de la lista, la escalera de tempo (desde, hasta, de a) y con qué mano
    empieza.
  - Ficha con **superficie** (pad, batería o ambas) y **kit**; estilos de batería (incluye polca
    paraguaya, guarania y galopa); _Usar plantilla de 60 min_ arma una clase completa de batería.
  - **Duplicar** la clase a otra fecha (sin archivos) y **comentar** en un segundo exacto de la
    entrega del alumno ("0:42 · se apura el fill").
- **Alumno**: en la clase, la grilla suena con su columna en ámbar; tocar el nombre de una pieza la
  silencia ("tócala tú"), _Click_ y un tempo de práctica que no cambia la clase. El rudimento se ve
  en grande (R en color de texto, L más tenue, ">" en ámbar para el acento, adornos chicos) con la
  escalera de tempo y **Lo toqué limpio a N BPM** (récord). Los comentarios del profesor aparecen
  bajo el reproductor; tocarlos lleva a ese segundo.
- **Percusión de manos**: la misma grilla con su set: cajón (bajo y slap), congas (abierta, slap y
  bajo), bongó (macho y hembra), shaker, claves, cencerro y güiro, y patrones de cajón pop, rumba,
  tumbao, martillo, cumbia y bossa. Usa también los rudimentos (manos alternadas), el medidor de
  tiempo y la lectura y el oído rítmico.
- **Herramientas de batería**: Metrónomo (con click que se calla y click en 2 y 4), Medidor de
  tiempo (número grande en ms, "Te apuras" / "Vas atrás" / "¡Justo!", gráfico de puntos con la
  franja de ±25 ms y porcentaje a tiempo), Grooves, Rudimentos (con trofeo y récord), Lectura
  rítmica (el compás sobre papel, cada nota en verde, ámbar o rojo al tocarla) y Oído rítmico.

### Afinador (`components/Afinador.tsx`)

- Escucha el micrófono y muestra la nota en grande (Do-Re-Mi, con el cifrado y los Hz debajo), una
  barra de −50 a +50 cents con la aguja ámbar que se vuelve verde (`success`) al quedar a ±5 cents
  y qué hacer, según el instrumento: _tensa / afloja la cuerda_, _mete / saca la boquilla_ (saxo),
  _mete / saca la cabeza_ (flauta), _sube / baja la voz_; y _¡Afinado!_.
- Violín, viento y voz: gráfico de los últimos 3 segundos con la franja de ±5 cents.
- **Sostener nota**: nota de referencia continua (la cuerda elegida o, en modo cromático, la nota
  del selector −/+), con el consejo de usar auriculares.
- Saxo: _Saxo alto (Mib)_ / _Saxo tenor (Sib)_ / _Sonido real (Do)_; muestra la nota escrita.
- Fila de cuerdas (de la más grave a la más aguda) con **Auto** (detecta la cuerda más cercana);
  tocar una cuerda la fija como objetivo y suena su nota de referencia.
- Opciones de instrumento (si estudia varios) y de afinación (Estándar, Drop D, DADGAD…). El arpa
  paraguaya, la flauta y la voz usan el modo cromático (la nota más cercana).
- En la clase, **Afinar** (junto a _Empezar práctica_ y en la barra del modo práctica) lo abre en un
  modal con el instrumento y la afinación de la ficha. Al cerrarlo se apaga el micrófono.

### Asistente (botón ✦)

- Botón redondo ámbar flotante en todas las pantallas con sesión: empieza abajo a la derecha
  (sobre la barra inferior en el celular) y se arrastra con el mouse o el dedo a cualquier parte
  de la pantalla. Un toque lo abre; recuerda el lugar en ese navegador (`localStorage`) y se
  mantiene dentro de la ventana al cambiar su tamaño.
- Se abre como tarjeta en escritorio (400 px) y a pantalla completa en el celular: cabecera con
  _Asistente_, _Nueva conversación_ y cerrar; el saludo con sugerencias según el rol y
  "¿Cómo se usa _esta pantalla_?"; burbujas (la persona a la derecha con el tinte `selected`, el
  asistente a la izquierda con Markdown simple); "Pensando…" mientras responde; un error se
  muestra con _Reintentar_.
- Pie: "Hoy: N de 30 · Puede equivocarse: revisa lo importante. Solo ve tus datos y no cambia
  nada." Enter envía; Shift+Enter, nueva línea.

### Administración (`/admin`, solo el administrador)

- Título _Administración_ y "Los planes de los profesores y todo el backend de Pulso (Firestore,
  cuentas y archivos, solo lectura).", con **Recargar** a la derecha. Debajo, dos `Stat`: _Colecciones_ y _Documentos_.
- `Segmented` con _Planes_ | _Colecciones_ | _Cuentas_ | _Archivos_:
  - **Planes** (la vista inicial): un aviso en rojo si hay profesores sin plan, con _Darles la
    prueba gratis_ (confirmación con sus nombres); el buscador **por CI o nombre**; una fila por
    profesor (nombre, CI, celular, plan, vence, bloqueo, "N de M alumnos (a medida)" y _Prueba_ /
    _Activo_ o, en rojo, _En gracia_ / _Bloqueado_ / _Sin plan_) con WhatsApp, _Habilitar días_ y
    _Registrar pago_. La cuenta del administrador dice _Todo habilitado_ y no tiene esos botones.
  - _Registrar pago_ pide plan (`Segmented`), meses y **cantidad de alumnos** (`Stepper`: la del
    plan o una a medida), monto (precio × meses, editable) y referencia, y confirma con
    `confirmar()`. _Habilitar días_ elige **cantidad de días** o **hasta una fecha** (`DateInput`)
    y un motivo, muestra "Quedará habilitado hasta el …" y confirma. Debajo, _Últimos pagos y
    cortesías_ (las cortesías con su motivo y Gs. 0).
  - **Colecciones**: una tarjeta con las colecciones como opciones chicas (`nombre (cantidad)`),
    el buscador "Buscar en lo cargado" y una fila por documento (id en negrita, una pista como el
    `nombre` o el `titulo`, y la fecha del último cambio). Al tocar la fila se despliegan los datos
    en JSON con letra monoespaciada y se pueden seleccionar para copiarlos.
  - **Cuentas**: una fila por cuenta (correo, uid, alta y último ingreso) con la etiqueta _Con
    perfil_ (verde) o **Sin perfil** (`colors.destructive`).
  - **Archivos**: una fila por archivo (ruta, tamaño, tipo y fecha), con el peso total arriba.
- Las listas se cargan de a 50 (100 en cuentas y archivos) con **Cargar más**. Un error de la
  función se muestra en rojo en lugar de la lista.
- **En el celular**: las pestañas de `Segmented` pasan a una segunda línea si no entran; en cada
  fila, el estado y los botones bajan debajo del texto (la columna de texto tiene base de
  ~220 px, no `flex: 1` con base 0, que la dejaba en una tira angosta); los ids, uid y rutas de
  Storage se cortan en cualquier carácter (`wordBreak`) en lugar de ensanchar la página, y la
  fecha de cada documento va debajo del id. Los modales (`Dialog` y `confirmar`) usan menos
  margen y relleno bajo 520 px, se desplazan por dentro si el formulario es largo, y la lista de
  `confirmar` (por ejemplo, los profesores sin plan) se desplaza sola con los botones siempre a la
  vista.

## Adaptable y accesible

- Puntos de corte: 640 px (celular → tablet) y 1024 px (dos columnas).
- Botones y enlaces son elementos reales (`<a href>` en los enlaces): se pueden abrir en otra
  pestaña.
- Los estados se anuncian a lectores de pantalla (`aria-checked`, `aria-selected`, etiquetas en los
  campos).
- Contraste alto: texto claro sobre fondo carbón; el ámbar se reserva para acciones y progreso.

## Ideas para las próximas versiones

| Pantalla      | Mejora sugerida                                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planificación | Cuadrícula de calendario en la vista Mes y arrastrar clases para cambiarlas de día                                                                                    |
| Batería       | Medidor de tiempo sobre un groove completo (bombo y caja por separado) y exportar el groove a partitura                                                               |
| Herramientas  | Guardar el puntaje de oído y lectura para ver el avance semana a semana                                                                                               |
| General       | Notificaciones (nueva clase, nueva entrega, nueva devolución) y esqueletos de carga                                                                                   |
| Pagos         | Cobro automático con uPay (QR por pedido y aviso del pago) en lugar de registrar cada pago a mano (ver [arquitectura](arquitectura.md#próximamente-cobro-automático)) |
