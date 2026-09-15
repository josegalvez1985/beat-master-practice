# Beat Master Practice

Aplicación móvil de práctica y enseñanza de batería: rudimentos, metrónomo y
lecciones guiadas. Incluye formulario de login, home y tema oscuro. Construida con
React Native y Expo (SDK 57) con Expo Router; también se ejecuta en la web.

## Desarrollo

Requisitos: Node.js y npm — [instalar con nvm](https://github.com/nvm-sh/nvm#installing-and-updating).
Para probar en el teléfono, instala [Expo Go](https://expo.dev/go).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Escanea el código QR con Expo Go, o pulsa `a` (Android), `i` (iOS) o `w` (web).

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/routes/` | Pantallas (Expo Router, configurado en `app.json`) |
| `src/components/` | Componentes de la app (`Metronome`) |
| `src/components/ui/` | Componentes base (`Button`, `Input`, `Progress`…) |
| `src/lib/theme.ts` | Colores, fuentes y estilos compartidos |
| `src/assets/` | Imágenes |

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Expo |
| `npm run android` | Abrir en Android |
| `npm run ios` | Abrir en iOS |
| `npm run web` | Abrir en el navegador |
| `npm run build` | Exportar el bundle de producción |
| `npm run typecheck` | Comprobar tipos con TypeScript |
| `npm run lint` | Ejecutar ESLint |
| `npm run format` | Formatear con Prettier |
