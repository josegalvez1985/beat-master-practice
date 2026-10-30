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
   - `www` → registro **CNAME** a `josegalvez1985.github.io`. Si el dominio vino con un hosting,
     `www` suele apuntar a ese hosting: edita ese registro en lugar de agregar otro.
   - Opcional, para que `pypulso.online` sin www también funcione: registros **A** del dominio raíz
     a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`, y borra los
     registros **AAAA** que apunten a otro servidor.
2. **GitHub**: _Settings → Pages → Custom domain_ → `www.pypulso.online` → _Save_. Cuando el
   certificado esté listo, marca **Enforce HTTPS**.
3. **Ruta base**: no hay que configurar nada. Con dominio propio el sitio vive en la raíz, y el
   workflow lo detecta cada vez que publica. Si agregas o quitas el dominio, vuelve a correr
   _Publicar en GitHub Pages_ desde _Actions_ para que compile con la ruta nueva. Con el dominio
   configurado, la dirección de github.io redirige sola a www.pypulso.online.
4. **Firebase**: agrega `www.pypulso.online` a los dominios autorizados
   ([guía de Firebase](firebase.md#1-configurar-el-proyecto-una-sola-vez)).

### Comprobar que el dominio funciona

| Prueba                                                       | Resultado esperado                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `nslookup -type=CNAME www.pypulso.online 8.8.8.8`            | `canonical name = josegalvez1985.github.io`                                 |
| `nslookup -type=A pypulso.online 8.8.8.8`                    | Las cuatro IP `185.199.108-111.153` (no la IP de Hostinger)                 |
| Abrir https://www.pypulso.online                             | La app, con candado (certificado de `www.pypulso.online`, no `*.github.io`) |
| Abrir https://pypulso.online                                 | Redirige a https://www.pypulso.online                                       |
| Abrir https://josegalvez1985.github.io/beat-master-practice/ | Redirige a **https**://www.pypulso.online                                   |

Problemas habituales:

- **El candado falla en www** (el certificado es de `*.github.io`): GitHub todavía no emitió el
  certificado del dominio. Suele tardar de minutos a 24 h. Si no aparece, en _Settings → Pages_
  quita el dominio, guarda, vuelve a escribir `www.pypulso.online` y guarda: eso pide el
  certificado de nuevo. Cuando esté, marca **Enforce HTTPS**.
- **`pypulso.online` sin www muestra "Parked Domain" de Hostinger**: el registro **A** de `@`
  apunta a Hostinger. En Hostinger → DNS, reemplázalo por las cuatro IP de GitHub y **borra el
  registro AAAA** de `@` (si queda, los navegadores con IPv6 siguen yendo a Hostinger).
- **En _Actions_ aparecen dos publicaciones por push** (_Publicar en GitHub Pages_ y _pages build
  and deployment_): la fuente de Pages está en _Deploy from a branch_. Cámbiala a **GitHub
  Actions**; si no, las dos compiten y la que termina última decide qué se ve.
- El archivo `CNAME` de la raíz del repositorio no se usa al publicar con GitHub Actions: el
  dominio que vale es el de _Settings → Pages → Custom domain_.

## Ruta base: cómo funciona

`vite.config.ts` toma la variable de entorno `BASE_PATH` (por defecto `/`). El router usa esa misma
base (`basename` en `src/main.tsx`) y los enlaces la incluyen en su `href`, así que funcionan igual
bajo `/beat-master-practice/` que en la raíz del dominio.

En GitHub Actions, `pages.yml` toma ese valor de la configuración de Pages (`base_path` de
`actions/configure-pages`): `/` con dominio propio y `/beat-master-practice/` sin él.

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
npx firebase login      # una vez por computadora
npm run deploy:reglas   # Firestore (base `default`) y Storage
```

Publica las reglas **antes** (o junto con) el código que las necesita: por ejemplo, borrar una
clase con entregas requiere las reglas que permiten al profesor borrarlas.
