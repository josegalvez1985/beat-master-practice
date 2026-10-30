# Firebase: puesta en marcha

Pulso usa tres servicios del proyecto Firebase **`beat-master-practice`**:

| Servicio                                 | Para qué                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Authentication** (correo y contraseña) | Cuentas de profesores y alumnos. El login es con número de documento; por dentro se usa el correo de la cuenta. |
| **Cloud Firestore**                      | Perfiles, listas de alumnos, clases y entregas.                                                                 |
| **Cloud Storage**                        | Archivos: materiales de clase y entregas de los alumnos.                                                        |

La configuración web del proyecto está en [`.env`](../.env). Esos valores son públicos por diseño
(identifican el proyecto); lo que protege los datos son las reglas
[`firestore.rules`](../firestore.rules) y [`storage.rules`](../storage.rules).

## 1. Configurar el proyecto (una sola vez)

Todo se hace en [console.firebase.google.com](https://console.firebase.google.com) → proyecto
**beat-master-practice**.

1. **Crear la base de datos Firestore**
   _Build → Firestore Database → Create database_.
   - ID de la base: **`default`** (sin paréntesis). Es el nombre que usan
     [`firebase.ts`](../src/lib/firebase.ts), [`firebase.json`](../firebase.json) y
     [`storage.rules`](../storage.rules); si cambia, hay que cambiarlo en los tres.
   - Ubicación: **`southamerica-east1` (São Paulo)**, la más cercana a Paraguay. No se puede cambiar
     después.
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

   Las reglas de Firestore se publican en la base **`default`** (lo indica `"database"` en
   [`firebase.json`](../firebase.json)). Repite este paso **cada vez** que cambien
   `firestore.rules` o `storage.rules`: si no, el proyecto sigue con las reglas viejas.

   > Las reglas de Storage leen la base `default` (`/databases/default/...`). Si después de
   > publicarlas las subidas siguen fallando con `storage/unauthorized`, la causa puede ser que
   > Storage no admita leer una base con nombre propio; la salida sería una base `(default)` para
   > lo que consultan esas reglas.

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

## 5. Revisar y limpiar los datos

Cada cuenta son **tres registros** que tienen que estar siempre juntos (ver
[guía de backend](backend.md#regla-principal-sin-registros-huérfanos)):

| Dónde                            | Qué                                                            |
| -------------------------------- | -------------------------------------------------------------- |
| Authentication → Usuarios        | La cuenta (correo y contraseña), con su **UID**                |
| Firestore `usuarios/{UID}`       | El perfil, con `nro_documento`                                 |
| Firestore `documentos/{nro_doc}` | El número de documento, con el `uid` y el `email` de la cuenta |

**Para revisar** (base `default`):

1. Las tres cantidades coinciden: usuarios de Authentication, documentos de `usuarios` y de
   `documentos`.
2. Cada `documentos/{nro}` tiene un `uid` que existe en `usuarios`, y ese perfil tiene ese mismo
   `nro_documento`.
3. Cada UID de Authentication tiene su documento en `usuarios`.

**Si algo no coincide:**

- **Cuenta de Authentication sin `usuarios`**: si la persona entra, ve "Tu cuenta no terminó de
  crearse" y al tocar **Salir** la cuenta se borra sola. Si nadie va a entrar, bórrala desde
  Authentication: no tiene nada en Firestore.
- **`documentos` sin `usuarios`, o al revés**: borra a mano el que quedó y, si existe, su cuenta de
  Authentication, para que la persona pueda volver a registrarse.

**Para empezar de cero** (datos de prueba): borra **las tres cosas**, los usuarios de
Authentication y las colecciones `documentos` y `usuarios` (y, si las hay, `inscripciones`,
`clases`, `entregas` y los archivos de Storage). Si borras solo las colecciones, las cuentas
siguen en Authentication y al registrarse de nuevo aparece "Ese correo ya está registrado".

> **No borres un usuario solo desde Authentication** si tiene datos en Firestore: quedan huérfanos
> su perfil, su documento y todo lo que cuelga de él. Borrarlo todo junto requiere una Cloud
> Function (pendiente).

## 6. Problemas comunes

| Mensaje                                                                            | Causa y solución                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Database '...' not found`                                                         | La base no existe o tiene otro ID: paso 1. La app busca la base `default`; `(default)` indica un build viejo.                                                                                                                                                               |
| `Missing or insufficient permissions`                                              | Las reglas no están publicadas (paso 5), o el usuario no tiene acceso (por ejemplo, un alumno que el profesor todavía no agregó).                                                                                                                                           |
| `auth/operation-not-allowed`                                                       | El login con correo y contraseña no está activado: paso 2.                                                                                                                                                                                                                  |
| `CONFIGURATION_NOT_FOUND` (400 en `signUp`)                                        | Authentication nunca se inició en el proyecto: paso 2 (_Get started_). Si persiste, la API key de `.env` es de otro proyecto.                                                                                                                                               |
| Login: "No hay ninguna cuenta con ese número de documento."                        | No existe `documentos/{nro}`: el registro no terminó o se borraron los datos. Regístrate de nuevo (antes borra la cuenta suelta en Authentication si la hay: sección 5).                                                                                                    |
| Login: "Contraseña incorrecta."                                                    | El documento existe pero la contraseña no coincide (recuerda: mínimo 6 caracteres). Usa _¿Olvidaste tu contraseña?_.                                                                                                                                                        |
| Registro: "Ese correo ya está registrado en otra cuenta."                          | Quedó una cuenta en Authentication sin perfil, o el correo es de otra persona. Revisa la sección 5.                                                                                                                                                                         |
| "Tu cuenta no terminó de crearse"                                                  | Cuenta de Authentication sin perfil. **Salir** la borra; después, registrarse de nuevo.                                                                                                                                                                                     |
| Las subidas fallan con `storage/unauthorized`                                      | Storage no está activado o sus reglas no están publicadas: pasos 3 y 5 (y la nota del paso 5 sobre la base `default`).                                                                                                                                                      |
| Subir un archivo da **error de CORS** (`preflight … does not have HTTP ok status`) | No es CORS: **el bucket de Storage no existe** (Google responde 404). Activa Storage (paso 3) y publica las reglas (paso 5). Se comprueba con `curl https://firebasestorage.googleapis.com/v0/b/beat-master-practice.firebasestorage.app/o`: 404 = no existe, 403 = existe. |
| "Sin conexión" al entrar o registrarse                                             | Sin internet, o Firestore todavía no existe (paso 1).                                                                                                                                                                                                                       |
