# Publicación

El sitio se publica con **GitHub Pages** desde GitHub Actions:

- Dirección de GitHub: **https://josegalvez1985.github.io/beat-master-practice/**
- Dominio propio: **https://www.pypulso.online** (cuando se configure el DNS, ver más abajo).

Cualquiera de las dos abre directamente el **login** si no hay sesión.

## Workflows (pestaña _Actions_ del repositorio)

| Archivo                                       | Cuándo corre                                  | Qué hace                          |
| --------------------------------------------- | --------------------------------------------- | --------------------------------- |
| [`ci.yml`](../.github/workflows/ci.yml)       | Cada push a `main` y cada pull request        | `npm ci`, tipos, lint y build     |
| [`pages.yml`](../.github/workflows/pages.yml) | Cada push a `main`, o a mano (_Run workflow_) | Compila y publica en GitHub Pages |

Los workflows aparecen en _Actions_ recién cuando estos archivos están en GitHub (después del
primer push que los incluya).

## Activar GitHub Pages (una vez)

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Haz push a `main` (o corre _Publicar en GitHub Pages_ desde _Actions_).
3. Al terminar, la URL aparece en el resumen del workflow y en _Settings → Pages_.

Como Pages no conoce las rutas de la app, el workflow copia `index.html` a `404.html`: así
`/beat-master-practice/login` o recargar cualquier pantalla abre la app en la pantalla correcta.

## Usar el dominio www.pypulso.online

1. **DNS** (en el proveedor del dominio):
   - `www` → registro **CNAME** a `josegalvez1985.github.io`
   - Opcional, para que `pypulso.online` sin www también funcione: registros **A** del dominio raíz
     a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`.
2. **GitHub**: _Settings → Pages → Custom domain_ → `www.pypulso.online` → _Save_. Cuando el
   certificado esté listo, marca **Enforce HTTPS**.
3. **Ruta base**: con dominio propio el sitio vive en la raíz. Crea la variable del repositorio
   `BASE_PATH` con el valor `/` (_Settings → Secrets and variables → Actions → Variables_) y vuelve a
   correr el workflow. Con el dominio configurado, la dirección de github.io redirige sola a
   www.pypulso.online.
4. **Firebase**: agrega `www.pypulso.online` a los dominios autorizados
   ([guía de Firebase](firebase.md#1-configurar-el-proyecto-una-sola-vez)).

## Ruta base: cómo funciona

`vite.config.ts` toma la variable de entorno `BASE_PATH` (por defecto `/`). El router usa esa misma
base (`basename` en `src/main.tsx`) y los enlaces la incluyen en su `href`, así que funcionan igual
bajo `/beat-master-practice/` que en la raíz del dominio.

Para probar localmente el build de Pages:

```sh
BASE_PATH=/beat-master-practice/ npm run build
```

(En Git Bash de Windows, antepone `MSYS_NO_PATHCONV=1` para que no convierta la ruta.)

## Alternativa: Firebase Hosting

[`firebase.json`](../firebase.json) también deja listo Firebase Hosting (carpeta `dist`, todas las
rutas a `index.html`):

```sh
npm run build
npx firebase deploy --only hosting
```

Publica en `beat-master-practice.web.app`, y el dominio propio se conecta desde la consola de
Firebase (_Hosting → Add custom domain_). Usa **un solo** servicio para www.pypulso.online.

## Reglas de Firebase

Las reglas no se publican con GitHub Pages. Cada vez que cambien `firestore.rules` o
`storage.rules`:

```sh
npm run deploy:reglas
```
