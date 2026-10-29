# Pulso

Plataforma web para **enseñar y practicar instrumentos musicales**: guitarra, piano, batería, voz,
bajo, violín, ukelele, saxofón y flauta.

- **Profesores**: se registran con su número de documento y los instrumentos que enseñan, arman sus
  listas de alumnos (buscándolos por documento o nombre), planifican clases por semana, mes o año,
  suben materiales (audio, video, PDF, partituras) y ven el progreso de cada alumno.
- **Alumnos**: se registran con su número de documento y sus instrumentos. Cuando un profesor los
  agrega a su lista, ven sus clases, suben sus prácticas en audio o video y siguen su barra de
  progreso.

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

> Antes de usar la app con el proyecto real hay que configurar Firebase una vez (crear Firestore,
> activar el login con correo, Storage y publicar las reglas): ver **[docs/firebase.md](docs/firebase.md)**.
> Para probar sin tocar datos reales, usa los emuladores (misma guía, sección 3).

## Guías

| Guía                                         | Contenido                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [docs/firebase.md](docs/firebase.md)         | Configurar Firebase, publicar reglas, emuladores y problemas comunes                           |
| [docs/arquitectura.md](docs/arquitectura.md) | Rutas, sesión, login por documento, modelo de datos, permisos, progreso y pagos (próximamente) |
| [docs/diseno.md](docs/diseno.md)             | Identidad visual, componentes, diseño de cada pantalla e ideas de mejora                       |
| [docs/despliegue.md](docs/despliegue.md)     | GitHub Actions, GitHub Pages, dominio www.pypulso.online y Firebase Hosting                    |

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

| Ruta                               | Contenido                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `index.html`                       | Documento HTML de entrada                                                                             |
| `src/main.tsx`                     | Arranque: fuentes, rutas y guardas de sesión                                                          |
| `src/routes/`                      | Pantallas: login, inicio, `profesor/` (inicio, planificación, alumno), `alumno/` (inicio), clase, 404 |
| `src/components/`                  | Componentes de la app: barra superior, modales del login, materiales, formulario de clase…            |
| `src/components/ui/`               | Componentes base: `Button`, `Input`, `Dialog`, `Chip`, `Segmented`, `Progress`…                       |
| `src/lib/firebase.ts`              | Conexión a Firebase (o a los emuladores)                                                              |
| `src/lib/auth.ts`                  | Sesión compartida entre pestañas, registro, login y recuperación por documento                        |
| `src/lib/data.ts`                  | Lecturas en vivo y escrituras de Firestore; cálculo del progreso                                      |
| `src/lib/files.ts`                 | Subida y descarga de archivos en Storage                                                              |
| `src/lib/theme.ts`                 | Colores, fuentes y estilos compartidos                                                                |
| `firestore.rules`, `storage.rules` | Reglas de seguridad                                                                                   |
| `firebase.json`                    | Emuladores, reglas y Firebase Hosting                                                                 |
| `.github/workflows/`               | CI y publicación en GitHub Pages                                                                      |
| `docs/`                            | Guías                                                                                                 |

## Próximamente

- **Pagos**: cada profesor y alumno pagará una suscripción para usar el sitio. La propuesta está en
  [docs/arquitectura.md](docs/arquitectura.md#próximamente-pagos).
- Ideas de diseño para las siguientes versiones en [docs/diseno.md](docs/diseno.md#ideas-para-las-próximas-versiones).
