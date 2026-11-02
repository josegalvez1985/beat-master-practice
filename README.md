# Pulso

Plataforma web **exclusiva para profesores de música y sus alumnos**, para enseñar y practicar
17 instrumentos: guitarra, **requinto**, **arpa paraguaya**, piano, teclado, acordeón, batería,
percusión, voz, bajo, violín, violonchelo, contrabajo, ukelele, saxofón, trompeta y flauta. No es un directorio de profesores: cada profesor agrega a sus alumnos a su lista
con el número de documento.

- **Profesores**: se registran con su número de documento y los instrumentos que enseñan, arman sus
  listas de alumnos (buscándolos por documento o nombre), planifican clases por semana, mes o año,
  arman cada clase por bloques (tablaturas y partituras con sonido, acordes, rasgueos, tempo con
  metrónomo, YouTube, imágenes, PDF, audio, video y Guitar Pro) y ven el progreso y el diario de
  práctica de cada alumno. Guardan bloques en su **biblioteca** para reusarlos, ponen hora y
  modalidad a la clase (presencial o virtual con enlace, con _Agregar al calendario_), marcan la
  **asistencia**, organizan **recitales** con su programa, evalúan cada entrega con una **rúbrica**
  por instrumento, marcan la **ruta de aprendizaje** por niveles y escriben **mensajes** por clase.
- **Alumnos**: se registran con su número de documento y sus instrumentos. Cuando un profesor los
  agrega a su lista, ven sus clases, se graban (o suben) sus prácticas en audio o video, o fotos (también con la cámara del celular) y PDF de tareas escritas (con click
  en los auriculares si quieren; la app mide su **afinación y su tiempo** antes de enviar), siguen
  su barra de progreso, su ruta, sus habilidades y sus **insignias**, y llevan un diario con meta
  semanal. Cada día, **Tu práctica de hoy** arma la rutina según el tiempo que tienen; tienen
  **repertorio**, **metas de la semana**, **Mi evolución** (primera grabación vs. la última),
  responden cada devolución, avisan si no pueden ir y reciben **avisos** en el navegador.
- **Diseño**: tema claro y oscuro, y una escena animada (arpa paraguaya, instrumentos que flotan,
  notas y la línea de pulso) en el login y en el inicio de cada persona con sus instrumentos, hecha
  con SVG y CSS para que no pese ni gaste memoria.
- **Cada familia de instrumentos con lo suyo**: partituras con sonido (teclados, arco, viento,
  voz y arpa), escalas y arpegios con teclado y sonido, respiración y notas largas (voz y
  viento), digitación de mano en los acordes de teclado y una plantilla de clase de 60 minutos
  por familia.
- **Cuenta**: cualquiera puede sumar instrumentos (para enseñar o para aprender) desde su perfil, y
  recuperar la contraseña con su documento y su correo. En el perfil, un **manual de uso** para
  profesores y otro para alumnos, por temas y paso a paso.
- **Asistente con IA** (botón ✦ flotante, que se arrastra a cualquier parte de la pantalla; alumnos
  y profesores): explica cómo se usa cada pantalla y consulta las clases, el avance y los alumnos
  de quien pregunta, solo lectura. Corre en una Cloud Function de Firebase con la API de Claude
  ([docs/firebase.md](docs/firebase.md), sección 8).
- **Planes de los profesores** (_Mi plan_ en el menú, `/plan`): 30 días gratis desde el registro y
  después Inicial (5 alumnos, Gs. 50.000), Profesor (20, Gs. 150.000) o Academia (60,
  Gs. 300.000) por mes; los alumnos no pagan. Se paga por transferencia o QR a ueno y el
  administrador lo registra en `/admin` (con una cantidad de alumnos a medida si hace falta). Al
  vencer hay 5 días hábiles para pagar; después no se puede crear (clases, alumnos, archivos),
  pero nada se borra. El administrador puede habilitar días por excepción, y su propia cuenta
  tiene todo habilitado. Todo se controla en las reglas y en Cloud Functions
  ([docs/arquitectura.md](docs/arquitectura.md#planes-de-los-profesores)).
- **Celular del profesor**: obligatorio al registrarse; lo ve solo él (en _Mi perfil_) y el
  administrador.
- **Administración** (`/admin`, solo la cuenta del administrador): los planes de los profesores
  (buscar por CI, registrar pagos, habilitar días, celulares) y todo el backend en solo lectura: cada colección de Firestore con sus documentos, las cuentas de Authentication y los
  archivos de Storage ([docs/arquitectura.md](docs/arquitectura.md#administración)).
- **Contacto**: formulario en el login y en el perfil que abre WhatsApp (0986 103 839) con la
  consulta ya escrita.
- **Herramientas** (alumnos y profesores), solo las que sirven para cada instrumento: afinador con
  el micrófono, metrónomo con subdivisiones y tempo que sube solo, grabadora, diccionario de
  acordes, entrenamiento auditivo, lectura de notas y **a primera vista** (melodías nuevas cada vez)
  y **polca, guarania y galopa** con sus acordes y acompañamiento; y en todo audio, video o YouTube
  de las clases, velocidad más lenta y repetición de A a B. **Funcionan sin conexión** una vez
  abiertas (service worker y copia local de Firestore, que se borra al salir).
- **Batería**: grooves en grilla con sonido (incluye polca paraguaya, guarania y galopa),
  rudimentos con escalera de tempo y récords, medidor de tiempo con el micrófono, lectura y oído
  rítmico, y comentarios del profesor en un segundo exacto de la entrega.

Sitio: **https://www.pypulso.online** · GitHub Pages:
**https://josegalvez1985.github.io/beat-master-practice/** · Repositorio:
**https://github.com/josegalvez1985/beat-master-practice**

Es una aplicación **solo web** (React Native Web + Vite + React Router) con **Firebase**
(Authentication, Firestore y Storage).

## Empezar

Requisitos: Node.js 20.19 o superior y npm.

```sh
git clone https://github.com/josegalvez1985/beat-master-practice.git
cd beat-master-practice
npm i
npm run dev
```

Abre http://localhost:5173. La primera pantalla es el login.

> Antes de usar la app con el proyecto real hay que configurar Firebase una vez (crear Firestore
> con el ID de base **`(default)`**, activar Authentication con correo y contraseña, Storage y
> publicar las reglas): ver **[docs/firebase.md](docs/firebase.md)**. Si los datos todavía están
> en la base vieja `default` (sin paréntesis), las subidas de archivos fallan: hay que copiarlos
> una vez ([docs/despliegue.md](docs/despliegue.md#pasar-a-la-base-default-una-vez)).
> Para probar sin tocar datos reales, usa los emuladores (misma guía, sección 3).

> **Si `npm run dev` o `npm run build` fallan con `Cannot find package ... node_modules`**, la
> instalación quedó incompleta (pasa a menudo si el proyecto está en una carpeta de OneDrive, que
> sincroniza `node_modules` mientras se escribe). Reinstala con `npm ci`. Para evitarlo, guarda el
> proyecto fuera de OneDrive (por ejemplo en `C:\dev\`) o pausa la sincronización al instalar.

## Regla del proyecto: sin registros huérfanos

Toda colección de Firestore y todo archivo de Storage tiene que estar relacionado con otro
registro, y **no pueden quedar registros huérfanos**: lo que depende entre sí se crea en una sola
escritura, las reglas comprueban la relación y borrar algo borra lo que cuelga de él. Al agregar
una colección, documenta su relación en
[docs/backend.md](docs/backend.md#regla-principal-sin-registros-huérfanos).

## Guías

| Guía                                         | Contenido                                                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/firebase.md](docs/firebase.md)         | Configurar Firebase (base `(default)` y por qué), publicar reglas (terminal o consola), emuladores, revisar y limpiar los datos, problemas comunes, plan Blaze y costos, asistente (clave de la API) y avisos |
| [docs/backend.md](docs/backend.md)           | **Backend NoSQL (Firestore)**: relaciones, sin registros huérfanos, datos duplicados, cómo diseñar una colección, límites                                                                                     |
| [docs/arquitectura.md](docs/arquitectura.md) | Rutas, sesión, login por documento, modelo de datos, permisos, progreso, herramientas por instrumento, batería, administración y planes de los profesores                                                     |
| [docs/diseno.md](docs/diseno.md)             | Identidad visual, componentes, diseño de cada pantalla (herramientas, batería, asistente y administración incluidos) e ideas de mejora                                                                        |
| [docs/despliegue.md](docs/despliegue.md)     | GitHub Actions, GitHub Pages, dominio www.pypulso.online, Google Search Console, Firebase Hosting, publicar las reglas y las Cloud Functions, y pasar a la base `(default)`                                   |

## Scripts

| Script                     | Descripción                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`              | Servidor de desarrollo contra el proyecto real de Firebase                              |
| `npm run dev:emulators`    | Servidor de desarrollo contra los emuladores locales                                    |
| `npm run emulators`        | Levanta los emuladores de Auth, Firestore y Storage (requiere Java 21+)                 |
| `npm run build`            | Compila el sitio en `dist/`                                                             |
| `npm run preview`          | Sirve localmente el build                                                               |
| `npm run deploy:reglas`    | Publica `firestore.rules` y `storage.rules` en Firebase                                 |
| `npm run deploy:funciones` | Publica las Cloud Functions (asistente, avisos, administración y planes) en Firebase    |
| `npm run typecheck`        | Comprueba tipos con TypeScript                                                          |
| `npm run lint`             | ESLint                                                                                  |
| `npm run format`           | Formatea con Prettier                                                                   |
| `npm run iconos`           | Regenera los íconos y logos PNG desde `public/favicon.svg` (después de cambiar el logo) |

## Estructura

| Ruta                                               | Contenido                                                                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                                       | Documento HTML de entrada                                                                                                                     |
| `src/main.tsx`                                     | Arranque: fuentes, rutas y guardas de sesión                                                                                                  |
| `src/routes/`                                      | Pantallas: login, inicio, `profesor/` (inicio, planificación, alumno), `alumno/` (inicio), clase, herramientas, admin, 404                    |
| `src/components/`                                  | Componentes de la app: barra superior, modales del login, materiales, reproductor de práctica, grabadora, afinador, metrónomo…                |
| `src/components/plan/`                             | Plan de clase por bloques: editor, modo práctica y cada tipo de bloque                                                                        |
| `src/components/herramientas/`                     | Diario de práctica, diccionario de acordes, oído, lectura de notas y teclado                                                                  |
| `src/components/bateria/`                          | Grilla de grooves, rudimentos, medidor de tiempo, lectura y oído rítmico, notación rítmica                                                    |
| `src/components/ui/`                               | Componentes base: `Button`, `Input`, `Dialog`, `Chip`, `Progress`… y `EscenaMusical` (ilustración animada liviana, SVG + CSS)                 |
| `src/lib/firebase.ts`                              | Conexión a Firebase (o a los emuladores)                                                                                                      |
| `src/lib/auth.ts`                                  | Sesión compartida entre pestañas, registro, login y recuperación por documento                                                                |
| `src/lib/data.ts`                                  | Lecturas en vivo y escrituras de Firestore (con sus cascadas); cálculo del progreso                                                           |
| `src/lib/plan.ts`                                  | Modelo del plan de clase: bloques, ficha, plantillas por instrumento                                                                          |
| `src/lib/herramientas.ts`                          | Qué herramienta ve cada instrumento                                                                                                           |
| `src/lib/audio.ts`, `notas.ts`                     | Sonido compartido (Web Audio) y notas (Do-Re-Mi, frecuencias)                                                                                 |
| `src/lib/afinador.ts`, `tiempo.ts`, `grabadora.ts` | Micrófono: afinador (YIN), detector de golpes (AudioWorklet) y grabación                                                                      |
| `src/lib/bateria.ts`                               | Kit sintetizado, grooves por estilo, rudimentos y ritmos                                                                                      |
| `src/lib/files.ts`                                 | Subida y descarga de archivos en Storage                                                                                                      |
| `src/lib/theme.ts`                                 | Colores, fuentes y estilos compartidos                                                                                                        |
| `functions/`                                       | Cloud Functions de Firebase: asistente con IA (`asistente.ts`, `herramientas.ts`), avisos, administración (`admin.ts`) y planes (`planes.ts`) |
| `scripts/`                                         | Publicar las Functions (`deploy-funciones.mjs`), generar íconos y copiar la base vieja a `(default)` (`copiar-base.mjs`)                      |
| `firestore.rules`, `storage.rules`                 | Reglas de seguridad                                                                                                                           |
| `firebase.json`                                    | Emuladores, reglas y Firebase Hosting                                                                                                         |
| `.github/workflows/`                               | CI y publicación en GitHub Pages                                                                                                              |
| `docs/`                                            | Guías                                                                                                                                         |

## Pendiente para publicar

Lo que ya está en el código pero todavía no en el sitio ni en Firebase:

1. **Publicar los planes**, en orden y sin pausas
   ([docs/despliegue.md](docs/despliegue.md#publicar-los-planes-de-los-profesores-una-vez)):
   `npm run deploy:funciones`, `npm run deploy:reglas`, push del sitio y enseguida `/admin` →
   _Planes_ → _Darles la prueba gratis_.
2. **Base vieja `default`**: borrarla cuando todo funcione con `(default)`
   (`npx firebase firestore:databases:delete default`).

## Próximamente

- **Cobro automático** de los planes con uPay (de ueno) por API, en lugar de registrar cada pago a
  mano. Ver [docs/arquitectura.md](docs/arquitectura.md#próximamente-cobro-automático).
- **Cloud Functions** (requieren el plan Blaze): borrar en cascada todo lo de un usuario borrado
  desde la consola de Authentication y barrer los archivos de Storage que nada referencia. Ver
  [docs/backend.md](docs/backend.md).
- Ideas de diseño para las siguientes versiones en [docs/diseno.md](docs/diseno.md#ideas-para-las-próximas-versiones).
