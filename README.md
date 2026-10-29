# Pulso

Plataforma web de práctica y enseñanza de instrumentos musicales: guitarra, piano,
batería, voz y más. Construida con React Native Web, Vite y React Router.
Es exclusivamente una aplicación web.

## Desarrollo

Requisitos: Node.js y npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Abre la URL que muestra la terminal (por defecto http://localhost:5173).

## Cómo funciona

- Los componentes se escriben con la API de React Native (`View`, `Text`, `Pressable`…) y
  Vite los resuelve a `react-native-web` mediante un alias (`vite.config.ts`).
- Las rutas se definen en `src/main.tsx` con React Router.
- `src/react-native-web.d.ts` añade a los tipos de React Native las props solo web que usamos
  (`href`, `backgroundImage`).

## Sesión y rutas

- Sitio: https://pypulso.online (`src/lib/site.ts`).
- Sin sesión, cualquier pantalla privada redirige a `/login`. Con sesión, `/login` lleva al inicio.
- La sesión (token y usuario) se guarda en `localStorage`, que comparten todas las pestañas y
  ventanas del dominio: se mantiene al recargar y al abrir pestañas nuevas, y entrar o salir en
  una pestaña actualiza las demás. "Recordarme" la mantiene 30 días; si no, dura 1 día.
- Crear cuenta y recuperar contraseña son modales del login con URL propia:
  `/login?modal=registro` y `/login?modal=recuperar`. `/registro` redirige al primero.
- El login, el registro y la recuperación están simulados hasta conectar un backend
  (`src/lib/auth.ts`).
- Al publicar, el servidor debe devolver `index.html` para cualquier ruta (fallback de SPA); si
  no, abrir `/login` directamente o recargar fuera del inicio da 404.

## Estructura

| Ruta                     | Contenido                                                               |
| ------------------------ | ----------------------------------------------------------------------- |
| `index.html`             | Documento HTML de entrada                                               |
| `src/main.tsx`           | Arranque: fuentes, React Query y rutas                                  |
| `src/routes/`            | Pantallas: inicio, login, 404 y layout raíz                             |
| `src/components/`        | Componentes de la app (`AuthLayout`, `RouteGuards`, diálogos del login) |
| `src/components/ui/`     | Componentes base (`Button`, `Input`, `Dialog`, `Chip`…)                 |
| `src/lib/auth.ts`        | Sesión compartida entre pestañas                                        |
| `src/lib/theme.ts`       | Colores, fuentes y estilos compartidos                                  |
| `src/lib/fonts.ts`       | Carga de las fuentes Barlow y Bebas Neue                                |
| `src/lib/instruments.ts` | Instrumentos disponibles                                                |
| `src/assets/`            | Imágenes                                                                |
| `public/`                | Archivos estáticos servidos tal cual (manifest, iconos, robots.txt)     |

## Scripts

| Script              | Descripción                                |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Servidor de desarrollo                     |
| `npm run build`     | Compilar el sitio de producción en `dist/` |
| `npm run preview`   | Servir localmente el build de producción   |
| `npm run typecheck` | Comprobar tipos con TypeScript             |
| `npm run lint`      | Ejecutar ESLint                            |
| `npm run format`    | Formatear con Prettier                     |
