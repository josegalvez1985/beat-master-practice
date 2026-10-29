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
   - Ubicación: **`southamerica-east1` (São Paulo)**, la más cercana a Paraguay. No se puede cambiar
     después.
   - Modo: **producción**. Bloquea todo hasta que publiques las reglas del paso 5.
2. **Activar el login con correo y contraseña**
   _Build → Authentication → Get started → Sign-in method → Email/Password → Enable_.
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

## 5. Problemas comunes

| Mensaje                                       | Causa y solución                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Database '(default)' not found`              | Falta crear Firestore: paso 1.                                                                                                    |
| `Missing or insufficient permissions`         | Las reglas no están publicadas (paso 5), o el usuario no tiene acceso (por ejemplo, un alumno que el profesor todavía no agregó). |
| `auth/operation-not-allowed`                  | El login con correo y contraseña no está activado: paso 2.                                                                        |
| Las subidas fallan con `storage/unauthorized` | Storage no está activado o sus reglas no están publicadas: pasos 3 y 5.                                                           |
| "Sin conexión" al entrar o registrarse        | Sin internet, o Firestore todavía no existe (paso 1).                                                                             |
