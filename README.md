# Pulso

Plataforma web para **enseñar y practicar instrumentos musicales**: guitarra, **arpa paraguaya**, piano, batería, voz,
bajo, violín, acordeón, ukelele, saxofón y flauta.

- **Profesores**: se registran con su número de documento y los instrumentos que enseñan, arman sus
  listas de alumnos (buscándolos por documento o nombre), planifican clases por semana, mes o año,
  arman cada clase por bloques (tablaturas y partituras con sonido, acordes, rasgueos, tempo con
  metrónomo, YouTube, imágenes, PDF, audio, video y Guitar Pro) y ven el progreso y el diario de
  práctica de cada alumno.
- **Alumnos**: se registran con su número de documento y sus instrumentos. Cuando un profesor los
  agrega a su lista, ven sus clases, se graban (o suben) sus prácticas en audio o video, siguen su
  barra de progreso y llevan un diario con meta semanal.
- **Herramientas** (alumnos y profesores), solo las que sirven para cada instrumento: afinador con
  el micrófono, metrónomo con subdivisiones y tempo que sube solo, grabadora, diccionario de
  acordes, entrenamiento auditivo y lectura de notas; y en todo audio, video o YouTube de las clases,
  velocidad más lenta y repetición de A a B.
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
> con el ID de base **`default`**, activar Authentication con correo y contraseña, Storage y
> publicar las reglas): ver **[docs/firebase.md](docs/firebase.md)**.
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

| Guía                                         | Contenido                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/firebase.md](docs/firebase.md)         | Configurar Firebase, publicar reglas, emuladores, revisar y limpiar los datos, problemas comunes                                      |
| [docs/backend.md](docs/backend.md)           | **Backend NoSQL (Firestore)**: relaciones, sin registros huérfanos, datos duplicados, cómo diseñar una colección, límites             |
| [docs/arquitectura.md](docs/arquitectura.md) | Rutas, sesión, login por documento, modelo de datos, permisos, progreso, herramientas por instrumento, batería y pagos (próximamente) |
| [docs/diseno.md](docs/diseno.md)             | Identidad visual, componentes, diseño de cada pantalla (herramientas y batería incluidas) e ideas de mejora                           |
| [docs/despliegue.md](docs/despliegue.md)     | GitHub Actions, GitHub Pages, dominio www.pypulso.online, Google Search Console, Firebase Hosting y publicar las reglas               |

## Scripts

| Script                  | Descripción                                                             |
| ----------------------- | ----------------------------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo contra el proyecto real de Firebase              |
| `npm run dev:emulators` | Servidor de desarrollo contra los emuladores locales                    |
| `npm run emulators`     | Levanta los emuladores de Auth, Firestore y Storage (requiere Java 21+) |
| `npm run build`         | Compila el sitio en `dist/`                                             |
| `npm run preview`       | Sirve localmente el build                                               |
| `npm run deploy:reglas` | Publica `firestore.rules` y `storage.rules` en Firebase                 |
| `npm run typecheck`     | Comprueba tipos con TypeScript                                          |
| `npm run lint`          | ESLint                                                                  |
| `npm run format`        | Formatea con Prettier                                                   |

## Estructura

| Ruta                                               | Contenido                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`                                       | Documento HTML de entrada                                                                                                      |
| `src/main.tsx`                                     | Arranque: fuentes, rutas y guardas de sesión                                                                                   |
| `src/routes/`                                      | Pantallas: login, inicio, `profesor/` (inicio, planificación, alumno), `alumno/` (inicio), clase, herramientas, 404            |
| `src/components/`                                  | Componentes de la app: barra superior, modales del login, materiales, reproductor de práctica, grabadora, afinador, metrónomo… |
| `src/components/plan/`                             | Plan de clase por bloques: editor, modo práctica y cada tipo de bloque                                                         |
| `src/components/herramientas/`                     | Diario de práctica, diccionario de acordes, oído, lectura de notas y teclado                                                   |
| `src/components/bateria/`                          | Grilla de grooves, rudimentos, medidor de tiempo, lectura y oído rítmico, notación rítmica                                     |
| `src/components/ui/`                               | Componentes base: `Button`, `Input`, `Dialog`, `Chip`, `Segmented`, `Progress`…                                                |
| `src/lib/firebase.ts`                              | Conexión a Firebase (o a los emuladores)                                                                                       |
| `src/lib/auth.ts`                                  | Sesión compartida entre pestañas, registro, login y recuperación por documento                                                 |
| `src/lib/data.ts`                                  | Lecturas en vivo y escrituras de Firestore (con sus cascadas); cálculo del progreso                                            |
| `src/lib/plan.ts`                                  | Modelo del plan de clase: bloques, ficha, plantillas por instrumento                                                           |
| `src/lib/herramientas.ts`                          | Qué herramienta ve cada instrumento                                                                                            |
| `src/lib/audio.ts`, `notas.ts`                     | Sonido compartido (Web Audio) y notas (Do-Re-Mi, frecuencias)                                                                  |
| `src/lib/afinador.ts`, `tiempo.ts`, `grabadora.ts` | Micrófono: afinador (YIN), detector de golpes (AudioWorklet) y grabación                                                       |
| `src/lib/bateria.ts`                               | Kit sintetizado, grooves por estilo, rudimentos y ritmos                                                                       |
| `src/lib/files.ts`                                 | Subida y descarga de archivos en Storage                                                                                       |
| `src/lib/theme.ts`                                 | Colores, fuentes y estilos compartidos                                                                                         |
| `firestore.rules`, `storage.rules`                 | Reglas de seguridad                                                                                                            |
| `firebase.json`                                    | Emuladores, reglas y Firebase Hosting                                                                                          |
| `.github/workflows/`                               | CI y publicación en GitHub Pages                                                                                               |
| `docs/`                                            | Guías                                                                                                                          |

## Próximamente

- **Pagos**: cada profesor y alumno pagará una suscripción para usar el sitio. La propuesta está en
  [docs/arquitectura.md](docs/arquitectura.md#próximamente-pagos).
- **Cloud Functions** (requieren el plan Blaze): borrar en cascada todo lo de un usuario borrado
  desde la consola de Authentication y barrer los archivos de Storage que nada referencia. Ver
  [docs/backend.md](docs/backend.md).
- Ideas de diseño para las siguientes versiones en [docs/diseno.md](docs/diseno.md#ideas-para-las-próximas-versiones).
