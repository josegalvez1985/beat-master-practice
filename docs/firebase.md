# Firebase: puesta en marcha

Pulso usa tres servicios del proyecto Firebase **`beat-master-practice`**:

| Servicio                                 | Para qué                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Authentication** (correo y contraseña) | Cuentas de profesores y alumnos. El login es con número de documento; por dentro se usa el correo de la cuenta. |
| **Cloud Firestore**                      | Perfiles, listas de alumnos, clases, entregas, diario y récords de práctica.                                    |
| **Cloud Storage**                        | Archivos: materiales de clase y entregas de los alumnos.                                                        |

La configuración web del proyecto está en [`.env`](../.env). Esos valores son públicos por diseño
(identifican el proyecto); lo que protege los datos son las reglas
[`firestore.rules`](../firestore.rules) y [`storage.rules`](../storage.rules).

## 1. Configurar el proyecto (una sola vez)

Todo se hace en [console.firebase.google.com](https://console.firebase.google.com) → proyecto
**beat-master-practice**.

1. **Crear la base de datos Firestore**
   _Build → Firestore Database → Create database_.
   - ID de la base: **`(default)`** (con paréntesis), edición **Standard**. Es la única que las
     reglas de Storage pueden leer, y la que usan [`firebase.ts`](../src/lib/firebase.ts),
     [`firebase.json`](../firebase.json), [`storage.rules`](../storage.rules) y las Cloud
     Functions. Desde la terminal:
     `npx firebase firestore:databases:create "(default)" --location nam5`.
   - Ubicación: **`nam5` (Estados Unidos)**. Los avisos (`functions/src/avisos.ts`) corren en
     `us-central1` por eso. No se puede cambiar después.
   - Modo: **producción**. Bloquea todo hasta que publiques las reglas del paso 5.
2. **Activar el login con correo y contraseña**
   _Build → Authentication → Get started → Sign-in method → Email/Password → Enable_.
   - **Get started** (_Comenzar_) es obligatorio: crea la configuración de Authentication del
     proyecto. Sin ese paso, el registro falla con `CONFIGURATION_NOT_FOUND`.
   - Las contraseñas deben tener **6 caracteres o más** (lo exige Firebase).
3. **Activar Storage**
   _Build → Storage → Get started_. Los proyectos nuevos piden el plan **Blaze** (pago por uso, con
   una cuota gratuita) para usar Storage. Conviene crear una alerta de presupuesto en
   _Usage and billing_.
4. **Dominios autorizados**
   _Authentication → Settings → Authorized domains_ → agregar:
   - `www.pypulso.online`
   - `josegalvez1985.github.io`

   (`localhost` ya viene incluido).

5. **Publicar las reglas de seguridad** desde la carpeta del proyecto:

   ```sh
   npx firebase login          # una vez, abre el navegador
   npm run deploy:reglas       # publica firestore.rules y storage.rules
   ```

   La primera vez, Firebase pregunta si Storage puede leer Firestore (las reglas de archivos
   consultan las clases y las listas de alumnos). Responde que sí.

   Las reglas de Firestore se publican en la base **`(default)`** (lo indica `"database"` en
   [`firebase.json`](../firebase.json)). Repite este paso **cada vez** que cambien
   `firestore.rules` o `storage.rules`: si no, el proyecto sigue con las reglas viejas.

   **Sin terminal**: también se pueden pegar en la consola. _Firestore Database_ → base
   **`(default)`** → _Reglas_ → borra todo, pega el archivo completo (desde
   `rules_version = '2';`) → _Publicar_. Para `storage.rules`, lo mismo en _Storage → Rules_. El
   archivo del repositorio manda: lo que se edite solo en la consola se pierde en el próximo
   `npm run deploy:reglas`.

   > Las reglas de Storage leen la base `(default)` (`/databases/(default)/...`): Firebase no les
   > deja leer otra (_"Storage Security Rules can only access documents from the default Cloud
   > Firestore database"_). Con una base con nombre propio, toda subida falla con
   > `storage/unauthorized` y la consola de Storage muestra _Errores_ en las métricas de las reglas.

### Base `(default)`: de dónde viene

Pulso empezó con una base llamada `default` (sin paréntesis, edición Enterprise). Las reglas de
Storage no pueden leerla, así que no se podía subir ningún archivo. En noviembre de 2026 los datos
pasaron a `(default)` con [`scripts/copiar-base.mjs`](../scripts/copiar-base.mjs), que usa la
sesión de `npx firebase login`:

```sh
node scripts/copiar-base.mjs            # solo cuenta los documentos de cada base
node scripts/copiar-base.mjs --copiar   # copia todo (mismos ids y campos; se puede repetir)
```

El script no borra nada. Cuando todo funcione con `(default)`, la base vieja se borra a mano:
_Firestore Database_ → base `default` → _Eliminar base de datos_ (o
`npx firebase firestore:databases:delete default`). Así deja de cobrarse.

Con eso la app ya funciona en `npm run dev` contra el proyecto real.

## 2. Índices

Las consultas de la app usan filtros de igualdad y `array-contains`, que Firestore resuelve con sus
índices automáticos; [`firestore.indexes.json`](../firestore.indexes.json) está vacío a propósito.
Si en el futuro una consulta nueva necesita un índice compuesto, Firestore muestra en la consola
del navegador un error con un enlace para crearlo: ábrelo y luego copia el índice a ese archivo.

## 3. Probar sin tocar el proyecto real: emuladores

Los emuladores levantan Auth, Firestore y Storage en tu computadora con un proyecto de prueba
(`demo-pulso`), aplicando las mismas reglas. Los datos se borran al cerrarlos.

Requisito: **Java 21 o superior** (`java -version`).

```sh
npm run emulators       # terminal 1: Auth :9099, Firestore :8080, Storage :9199
npm run dev:emulators   # terminal 2: la app apuntando a los emuladores
```

`npm run dev:emulators` usa [`.env.emulators`](../.env.emulators). Los emuladores recargan
`firestore.rules` solos al guardar.

## 4. Variables de entorno

| Archivo          | Uso                                                                         |
| ---------------- | --------------------------------------------------------------------------- |
| `.env`           | Proyecto real. Se versiona.                                                 |
| `.env.emulators` | Modo `emulators` (`npm run dev:emulators`). Se versiona.                    |
| `.env.local`     | Opcional, para sobrescribir valores solo en tu máquina. **No** se versiona. |

Además de la configuración de Firebase, `.env` tiene `VITE_WEB3FORMS_KEY`: la clave pública de
[Web3Forms](https://web3forms.com) para el formulario de contacto. Se crea en web3forms.com con el
correo que recibe los mensajes (jose.jgalvez@gmail.com) y se pega ahí; sin ella el formulario
avisa que no está configurado.

Y `VITE_FIREBASE_VAPID_KEY`: la clave pública de los avisos push (sección 9).

## 5. Revisar y limpiar los datos

Cada cuenta son **tres registros** que tienen que estar siempre juntos (ver
[guía de backend](backend.md#regla-principal-sin-registros-huérfanos)):

| Dónde                            | Qué                                                            |
| -------------------------------- | -------------------------------------------------------------- |
| Authentication → Usuarios        | La cuenta (correo y contraseña), con su **UID**                |
| Firestore `usuarios/{UID}`       | El perfil, con `nro_documento`                                 |
| Firestore `documentos/{nro_doc}` | El número de documento, con el `uid` y el `email` de la cuenta |

**Para revisar** (base `(default)`):

1. Las tres cantidades coinciden: usuarios de Authentication, documentos de `usuarios` y de
   `documentos`.
2. Cada `documentos/{nro}` tiene un `uid` que existe en `usuarios`, y ese perfil tiene ese mismo
   `nro_documento`.
3. Cada UID de Authentication tiene su documento en `usuarios`.
4. Cada anotación de `diario` y cada `records` tiene un `alumnoId` que existe en `usuarios`.

La forma más rápida de revisarlo es la página **`/admin`** del sitio, solo para el administrador
([arquitectura.md](arquitectura.md#administración)). Muestra la cantidad de documentos de cada
colección, sus datos, los archivos de Storage y, en _Cuentas_, marca **Sin perfil** las cuentas de
Authentication sin `usuarios/{UID}`. Es solo lectura: lo que haya que borrar se borra desde la
consola, como se explica abajo.

**Si algo no coincide:**

- **Cuenta de Authentication sin `usuarios`**: si la persona entra, ve "Tu cuenta no terminó de
  crearse" y al tocar **Salir** la cuenta se borra sola. Si nadie va a entrar, bórrala desde
  Authentication: no tiene nada en Firestore.
- **`documentos` sin `usuarios`, o al revés**: borra a mano el que quedó y, si existe, su cuenta de
  Authentication, para que la persona pueda volver a registrarse.

**Para empezar de cero** (datos de prueba): borra **las tres cosas**, los usuarios de
Authentication y las colecciones `documentos` y `usuarios` (y, si las hay, `inscripciones`,
`clases`, `entregas`, `diario`, `records` y los archivos de Storage). Si borras solo las colecciones, las cuentas
siguen en Authentication y al registrarse de nuevo aparece "Ese correo ya está registrado".

> **No borres un usuario solo desde Authentication** si tiene datos en Firestore: quedan huérfanos
> su perfil, su documento y todo lo que cuelga de él. Borrarlo todo junto requiere una Cloud
> Function (pendiente).

## 6. Problemas comunes

| Mensaje                                                                            | Causa y solución                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Database '...' not found`                                                         | La base no existe o tiene otro ID: paso 1. La app busca la base `(default)`; si el mensaje nombra `default` (sin paréntesis), es un build viejo.                                                                                                                            |
| `Missing or insufficient permissions`                                              | Las reglas no están publicadas (paso 5), o el usuario no tiene acceso (por ejemplo, un alumno que el profesor todavía no agregó).                                                                                                                                           |
| "Firebase rechazó el plan" al editar una clase (o el alumno no ve el plan)         | El plan usa un campo que las reglas publicadas todavía no conocen (por ejemplo, la ficha de batería). Publica las reglas (paso 5) y vuelve a guardar el plan: lo que no se pudo guardar no llegó a la base.                                                                 |
| `auth/operation-not-allowed`                                                       | El login con correo y contraseña no está activado: paso 2.                                                                                                                                                                                                                  |
| `CONFIGURATION_NOT_FOUND` (400 en `signUp`)                                        | Authentication nunca se inició en el proyecto: paso 2 (_Get started_). Si persiste, la API key de `.env` es de otro proyecto.                                                                                                                                               |
| Login: "No hay ninguna cuenta con ese número de documento."                        | No existe `documentos/{nro}`: el registro no terminó o se borraron los datos. Regístrate de nuevo (antes borra la cuenta suelta en Authentication si la hay: sección 5).                                                                                                    |
| Login: "Contraseña incorrecta."                                                    | El documento existe pero la contraseña no coincide (recuerda: mínimo 6 caracteres). Usa _¿Olvidaste tu contraseña?_.                                                                                                                                                        |
| Registro: "Ese correo ya está registrado en otra cuenta."                          | Quedó una cuenta en Authentication sin perfil, o el correo es de otra persona. Revisa la sección 5.                                                                                                                                                                         |
| "Tu cuenta no terminó de crearse"                                                  | Cuenta de Authentication sin perfil. **Salir** la borra; después, registrarse de nuevo.                                                                                                                                                                                     |
| Subir un material o una entrega: "Firebase no lo permitió (permission-denied)"     | El archivo subió, pero Firestore rechazó guardarlo en la clase o la entrega (y la app lo borró para que no quede huérfano): las reglas publicadas son más viejas que el código. Publica las reglas (paso 5).                                                                |
| Las subidas fallan con `storage/unauthorized`                                      | Storage no está activado, sus reglas no están publicadas, o la app usa una base que no es `(default)` (Storage solo puede leer esa): pasos 1, 3 y 5.                                                                                                                        |
| Publicar las Functions: `User code failed to load ... Timeout after 10000`         | Firebase le da 10 s a cargar `functions/` y desde una carpeta de OneDrive la primera carga tarda más. Usa `npm run deploy:funciones` (le da 60 s); con `npx firebase deploy` directo, antes `$env:FUNCTIONS_DISCOVERY_TIMEOUT=60` en PowerShell.                            |
| Subir un archivo da **error de CORS** (`preflight … does not have HTTP ok status`) | No es CORS: **el bucket de Storage no existe** (Google responde 404). Activa Storage (paso 3) y publica las reglas (paso 5). Se comprueba con `curl https://firebasestorage.googleapis.com/v0/b/beat-master-practice.firebasestorage.app/o`: 404 = no existe, 403 = existe. |
| "Sin conexión" al entrar o registrarse                                             | Sin internet, o Firestore todavía no existe (paso 1).                                                                                                                                                                                                                       |
| Recuperar contraseña: `auth/unauthorized-continue-uri`                             | El sitio desde donde se pidió el reseteo no está en los dominios autorizados: paso 4.                                                                                                                                                                                       |
| Asistente: "no está bien configurado (la clave de la API)" (400)                   | La clave de Claude en Secret Manager no es válida (por ejemplo, se guardó el id `apikey_01…` en vez de la clave `sk-ant-api03-…`): sección 8.                                                                                                                               |

## 7. Plan Blaze y costos

El proyecto necesita el plan **Blaze** (pago por uso, con cuotas gratis): Storage lo exige para
tener un bucket, y las Cloud Functions pendientes también. Lo que hace falta:

1. Una **cuenta de facturación** de Google Cloud con tarjeta (crédito o débito internacional),
   vinculada desde la consola: _Upgrade → Blaze_.
2. Una **alerta de presupuesto** (por ejemplo, US$20 con avisos al 50, 90 y 100 %): Blaze **no
   tiene tope de gasto**, cobra todo lo que pase de la cuota gratis.

**Qué cuesta** (referencia para unos 200 alumnos y 20 profesores):

| Servicio           | Por qué cuesta                                                                                                          | Aproximado por mes            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Firestore          | La base `(default)` tiene cuota gratis por día (50.000 lecturas, 20.000 escrituras); pasarla se cobra, aunque es barato | US$0 a 2                      |
| Storage, guardar   | São Paulo no tiene la capa gratis _Always Free_ (solo regiones de EE. UU.); crece con cada video                        | US$1 al inicio, ~US$17 al año |
| Storage, descargas | Ver videos desde São Paulo hacia internet es lo más caro                                                                | US$10 a 12                    |
| Cloud Functions    | Muy pocas invocaciones (cuota gratis de 2 millones por mes)                                                             | ~US$0                         |

**El video manda en el costo**: bajar la calidad de la grabadora (`grabadora.ts`) o preferir audio
cuando alcanza es lo que más ahorra. Los precios cambian: confírmalos en
[Firebase pricing](https://firebase.google.com/pricing),
[Firestore pricing](https://cloud.google.com/firestore/pricing) (tabla por ubicación) y
[precios de red de Google Cloud](https://cloud.google.com/vpc/network-pricing).

**¿Por qué no Cloudinary para los archivos?** Borrar en Cloudinary exige su clave secreta, que no
puede estar en el navegador: sin servidor, cada archivo borrado quedaría huérfano. Sus archivos son
públicos por enlace salvo con enlaces firmados (otra vez, servidor), y acá hay videos de alumnos.
Y con este volumen de video su plan gratis (25 créditos) no alcanza: el siguiente cuesta unos
US$89 a 99 por mes. Firebase Storage con sus reglas resuelve permisos y borrados sin servidor.

## 8. Asistente con IA (Cloud Functions)

El asistente corre en una Cloud Function ([`functions/`](../functions/)); necesita el plan
**Blaze** (sección 7). Una sola vez:

1. **La clave de la API de Claude**: créala en [platform.claude.com](https://platform.claude.com)
   (_API Keys_) y guárdala en Secret Manager desde la terminal, **nunca en un archivo ni en un
   chat** (si una clave se pega en algún lado, revócala y crea otra):

   ```sh
   npx firebase functions:secrets:set ANTHROPIC_API_KEY
   ```

   El comando pide la clave sin mostrarla. La clave empieza con **`sk-ant-api03-`** y la Console
   la muestra **una sola vez**, al crearla: si no se copió, se crea otra. El `apikey_01…` que
   aparece en la lista de claves es solo su **identificador** y no sirve como clave (la API
   responde 401). Si Firebase avisa que la Function usa una versión vieja del secreto, responde
   **Y** para volver a publicarla con la nueva.

2. **Instalar y publicar** la Function:

   ```sh
   npm --prefix functions install
   npm run deploy:funciones
   ```

   Publica `preguntarAsistente` en `southamerica-east1`. La primera vez Firebase activa solo las
   APIs que faltan (Cloud Functions, Cloud Build, Artifact Registry, Secret Manager).

3. **Publicar las reglas** (`npm run deploy:reglas`): incluyen `asistenteUso`.

Para cambiar la clave: repite el paso 1 y vuelve a publicar la Function. Para apagar el asistente
sin tocar el sitio: `npx firebase functions:delete preguntarAsistente`.

**Costo**: cada pregunta se registra en `asistenteUso/{uid}` con los tokens del mes; el detalle real
está en la consola de Claude. Con `claude-opus-5-5` (US$ 4 / 20 por millón de tokens de entrada /
salida; lo cacheado, la guía, se lee a US$ 0,20) una pregunta típica cuesta unos pocos centavos;
con `claude-haiku-5-5` (US$ 0,10 / 0,50), unas 40 veces menos. Se cambia en `MODELO`
(`functions/src/asistente.ts`) y se vuelve a publicar.

**Si el asistente responde "no está bien configurado (la clave de la API)"** (400 en
`preguntarAsistente`): la API de Claude rechazó la clave. Mira la causa en los logs:

```sh
npx firebase functions:log --only preguntarAsistente
```

`401 authentication_error: Invalid bearer token` significa que la clave guardada no es válida:
puede ser el identificador `apikey_01…` en lugar de `sk-ant-api03-…`, una clave revocada o un
token de una suscripción de Claude, que no es una clave de API. Repite el paso 1 y vuelve a
publicar. `403` significa que la clave es de un workspace sin permiso para el modelo de `MODELO`.

**Administración** (`/admin`): `npm run deploy:funciones` también publica `verBackend` en
`southamerica-east1`, la función de solo lectura que alimenta esa página
([arquitectura.md](arquitectura.md#administración)). No usa secretos ni reglas nuevas.

**Emuladores**: crea `functions/.secret.local` con `ANTHROPIC_API_KEY=...` (no se versiona) y corre
`npm run emulators`.

## 9. Avisos (notificaciones push)

Clases nuevas, entregas, comentarios, evaluaciones, mensajes y el recordatorio de práctica llegan
como avisos del navegador. Necesitan las Functions (plan **Blaze**). Una sola vez:

1. **La clave pública (VAPID)**: en la consola de Firebase → ⚙ _Configuración del proyecto_ →
   _Cloud Messaging_ → _Configuración web_ → _Certificados push web_ → **Generar par de claves**.
   Copia la clave (empieza con `B…`) en `.env`:

   ```sh
   VITE_FIREBASE_VAPID_KEY=B...
   ```

   Es pública por diseño (va en el sitio), por eso puede estar en `.env`. Haz commit y push para
   que GitHub Pages la tome.

2. **Publicar las Functions** (`npm run deploy:funciones`): además del asistente publica
   `avisarClaseNueva`, `avisarEntrega`, `avisarMensaje` y `recordarPractica` en `us-central1`
   (donde está la base). La última es una tarea programada cada hora: la primera vez Firebase activa
   Cloud Scheduler y Eventarc.

3. **Publicar las reglas** (`npm run deploy:reglas`): incluyen `dispositivos`.

Después, cada persona los activa en _Mi perfil → Avisos_. En iPhone y iPad solo funcionan con Pulso
agregado a la pantalla de inicio (Safari → Compartir → _Agregar a inicio_).

**Costo**: Cloud Messaging es gratis; las Functions de avisos entran en la cuota gratis de
invocaciones y Cloud Scheduler da 3 tareas gratis por cuenta de facturación.
