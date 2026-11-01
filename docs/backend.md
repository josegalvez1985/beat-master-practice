# Backend: Firestore (NoSQL) sin registros huérfanos

Guía para cualquier cambio en los datos: colecciones nuevas, campos, reglas o flujos que crean y
borran registros. El modelo de cada colección está en [arquitectura.md](arquitectura.md#modelo-de-datos-firestore)
y la puesta en marcha de Firebase en [firebase.md](firebase.md).

## Trabajamos con una base NoSQL

Cloud Firestore es una base de datos **de documentos**, no relacional. Lo que en SQL hace la base
de datos, aquí lo tiene que hacer el proyecto:

| En SQL                                     | En Firestore (y cómo lo resolvemos)                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Claves foráneas (`FOREIGN KEY`)            | **No existen.** Un campo `uid` o `claseId` es texto; nada impide que apunte a algo que no existe. Lo validan las **reglas**. |
| `ON DELETE CASCADE`                        | **No existe.** Borrar un documento no borra lo que lo referencia. La cascada la hace el **código**.                          |
| `JOIN`                                     | **No existe.** Cada consulta lee una sola colección. Por eso se **duplican** datos (por ejemplo, `alumnoNombre`).            |
| Transacciones sobre todo                   | `writeBatch` / `runTransaction`: atómicas, hasta **500 escrituras**.                                                         |
| `UNIQUE`                                   | Se logra con el **id del documento**: `documentos/{nro_documento}` hace único al número.                                     |
| Validación en el servidor (backend propio) | No tenemos backend: la app escribe directo desde el navegador. **Las reglas son la única validación del lado del servidor.** |

Consecuencia: **cada relación entre registros la garantizamos nosotros**, en el código y en las
reglas. Si no se hace a propósito, quedan registros huérfanos.

## Regla principal: sin registros huérfanos

**Toda colección tiene que estar relacionada con otra y no pueden quedar registros huérfanos**, ni
documentos de Firestore ni archivos de Storage. Un huérfano es un registro que apunta a otro que ya
no existe, o que nadie referencia (una cuenta sin perfil, un archivo que ninguna clase nombra).

La relación se garantiza con tres herramientas, siempre las tres:

1. **Escrituras atómicas** (`writeBatch`): lo que depende entre sí se crea o se borra en la misma
   operación; si una parte falla, no se escribe nada.
2. **Reglas que comprueban la relación**: `exists()` / `get()` para lo que ya existe y
   `existsAfter()` / `getAfter()` para lo que se crea en el mismo batch. Una escritura que dejaría
   un huérfano se rechaza aunque no venga de la app (cualquiera puede llamar a Firestore con la
   configuración pública de `.env`).
3. **Borrado en cascada**: borrar un registro borra lo que cuelga de él. Los archivos de Storage
   se borran **antes** que el documento que los nombra; si el borrado falla, el documento sigue
   apuntando al archivo y se puede reintentar.

### Relaciones actuales

| Registro                        | Depende de                                                                        | Cómo se evita el huérfano                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cuenta de Authentication        | `usuarios/{uid}`                                                                  | El registro borra la cuenta si falla la escritura del perfil. Si aun así queda una cuenta sin perfil, la pantalla "Tu cuenta no terminó de crearse" la borra al tocar **Salir** (tras confirmar en el servidor que no tiene perfil).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `documentos/{nro}`              | `usuarios/{uid}` (y viceversa)                                                    | Se crean juntos en un batch; cada regla de `create` exige con `getAfter()` que el otro exista y apunte de vuelta. Ninguno se puede borrar desde la app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `inscripciones`                 | `usuarios` del profesor y del alumno                                              | La regla comprueba que ambos existan y sus roles. Los `usuarios` no se borran.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `clases`                        | `usuarios` del profesor                                                           | La regla exige que quien crea sea profesor. Borrar una clase ([`eliminarClase`](../src/lib/data.ts)) borra sus materiales, los archivos de los bloques de su plan, sus `entregas` y los archivos de esas entregas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `entregas`                      | `clases`, `usuarios` del alumno, `inscripciones`                                  | La regla lee la clase y la inscripción. Se borran con la clase; quitar el último archivo borra la entrega. Quitar a un alumno de la lista **no** borra sus entregas: siguen apuntando a una clase y a un alumno que existen (son historial). Las **devoluciones** del profesor (comentarios en un segundo de un archivo) van **dentro** de la entrega: se borran con ella, y quitar un archivo quita en la misma escritura las devoluciones que lo nombran. El alumno no puede escribirlas, solo quitarlas así (la regla exige que la lista nueva sea parte de la anterior). Si el profesor comenta justo cuando el alumno quita ese archivo, quien abra la entrega después quita esas devoluciones sueltas ([`limpiarDevoluciones`](../src/lib/data.ts)). |
| `diario`                        | `usuarios` del alumno (y su `inscripción` para que el profesor lo lea)            | La regla exige que quien crea sea el alumno dueño (rol alumno), con instrumento, fecha, minutos y comentario válidos; no se edita. La borra el alumno, con _Deshacer_ (se oculta 6 s y después se borra; si cambia de pantalla, se borra en ese momento). Quitar al alumno de una lista **no** la borra: es del alumno; ese profesor deja de poder leerla. Los `usuarios` no se borran.                                                                                                                                                                                                                                                                                                                                                                    |
| `records`                       | `usuarios` del alumno (y su `inscripción` en batería para que el profesor lo lea) | Id determinista `{alumnoId}_{rudimento}`: uno por alumno y rudimento, sin duplicados. La regla exige que quien escribe sea el alumno dueño (rol alumno), que el id coincida y que el rudimento sea uno del catálogo `RUDIMENTOS` (los ids solo se agregan, nunca se quitan). Los borra el alumno. Quitar al alumno de la lista de batería no los borra (son del alumno). Los `usuarios` no se borran.                                                                                                                                                                                                                                                                                                                                                      |
| `asistenteUso`                  | `usuarios` (mismo id)                                                             | Uno por persona (`asistenteUso/{uid}`): no crece. Lo escribe solo la Cloud Function del asistente (Admin SDK); las reglas dejan leer el propio y no escribir. No guarda preguntas ni respuestas. Los `usuarios` no se borran.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Copia de una clase (_Duplicar_) | `usuarios` del profesor, como toda clase                                          | [`duplicarClase`](../src/lib/data.ts) copia título, objetivos, ficha y plan, pero **no los archivos**: los de la original viven en `clases/{idOriginal}/` y se borran con ella, así que la copia quedaría apuntando a archivos inexistentes. Los bloques de archivos se copian vacíos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Foto de perfil (Storage)        | `usuarios/{uid}.foto`                                                             | Ruta fija `usuarios/{uid}/foto.jpg`: una foto nueva sobrescribe la anterior. Se sube y después se anota en el perfil; si la anotación falla y no había foto, se borra el archivo. Quitarla borra primero el archivo y después el campo ([`cambiarFoto` / `quitarFoto`](../src/lib/data.ts)). La regla exige esa ruta exacta.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Archivos de bloques del plan    | `clases.bloques[].archivos` (en `clases/{claseId}/`)                              | Cada archivo subido se agrega al plan y se **guarda al instante** (no espera al guardado automático), construyendo sobre el plan más reciente: si se suben varios seguidos, ninguno pisa al anterior. Quitar un archivo o un bloque borra primero los archivos. [`archivosDelPlan`](../src/lib/plan.ts) los suma a la cascada de la clase.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Archivos de Storage             | `clases.materiales` / `entregas.archivos`                                         | Si el archivo se sube pero no se puede anotar en Firestore, se borra ([`subirYAnotar`](../src/lib/files.ts), que usan la subida de archivos y la grabadora). Al quitar un archivo, primero se borra de Storage y después de Firestore.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

```
Authentication ──1:1── usuarios/{uid} ──1:1── documentos/{nro}
                           │
            ┌──────────────┼───────────────────┬──────────────────┐
            ▼              ▼                   ▼                  ▼
   inscripciones      clases (profesor)    entregas (alumno)   diario y records (alumno)
 (profesor+alumno)        │                    ▲
                          ├── materiales ──► Storage clases/{claseId}/…
                          └── 1:N ─────────────┘
                                               ├── archivos ──► Storage entregas/{claseId}/{alumnoId}/…
                                               └── devoluciones (dentro de la entrega, por archivo)
```

> **Pendiente (necesita Cloud Functions).** Borrar un usuario desde la consola de Authentication
> deja huérfanos sus `documentos`, `usuarios` y todo lo que cuelga de él. Hasta tener una función
> `onDelete` que haga la cascada, **no borres usuarios solo desde la consola** (ver
> [firebase.md, sección 5](firebase.md#5-revisar-y-limpiar-los-datos)).

### Borrar con "Deshacer" sin dejar huérfanos

El editor del plan y el perfil no piden confirmación: muestran un aviso con **Deshacer** durante
6 segundos. Mientras tanto el bloque, el archivo o la foto solo se **ocultan**: siguen en el
documento guardado y en Storage. Recién al vencer el plazo se borra (archivos primero, después el
documento). Si la persona cierra la pestaña antes, no se borró nada y todo sigue relacionado; si
navega a otra pantalla, los borrados pendientes se completan en ese momento. Nunca se quita la
referencia antes que el archivo.

## Datos duplicados (desnormalización)

Como no hay `JOIN`, algunos datos se copian para no hacer una lectura extra por fila. Una copia
desactualizada no es un huérfano, pero es el mismo tipo de error: dos registros que dicen cosas
distintas.

| Copia                                            | Original                       | Hoy                                                                                    |
| ------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------- |
| `inscripciones.profesorNombre`                   | `usuarios/{profesorId}.nombre` | La regla exige que coincida al crear.                                                  |
| `inscripciones.alumnoNombre`, `.alumnoDocumento` | `usuarios/{alumnoId}`          | La regla exige que coincidan al crear.                                                 |
| `clases.profesorNombre`                          | `usuarios/{profesorId}.nombre` | La regla exige que coincida al crear.                                                  |
| `entregas.alumnoNombre`                          | `usuarios/{alumnoId}.nombre`   | La regla exige que coincida al escribir.                                               |
| `entregas.profesorId`, `.instrumento`            | `clases/{claseId}`             | La regla exige que coincidan; la clase no puede cambiar de profesor ni de instrumento. |
| `usuarios.terminos`                              | `usuarios.nombre`              | Se recalcula en el mismo documento.                                                    |

Reglas:

- **Los ids nunca cambian** (`uid`, `nro_documento`, `rol`, `claseId`): referenciar por id es
  seguro. Solo se copian datos para mostrar (nombres).
- **El perfil solo permite agregar instrumentos** ([`agregarInstrumento`](../src/lib/data.ts),
  con `arrayUnion`), nunca quitarlos: quitar uno tendría que decidir qué pasa con sus
  `inscripciones`, `clases`, `diario` y `records`. No hay pantalla para cambiar el `nombre`; si se
  agrega, tiene que actualizar **en el mismo batch** todas las copias de la tabla (o hacerlo una
  Cloud Function).

## Diseñar una colección nueva

Antes de escribir código, responde y documenta:

1. **¿De qué depende?** Toda colección cuelga de otra (como mínimo, de `usuarios`). Guarda el id del
   padre como campo (`profesorId`, `claseId`…).
2. **Id del documento.** Si hay a lo sumo uno por combinación, usa un **id compuesto determinista**
   (`{claseId}_{alumnoId}`): evita duplicados y permite a las reglas comprobar el vínculo con un
   solo `exists()`.
3. **Creación.** Si se crea junto con otro registro, va en el mismo `writeBatch`, y su regla
   comprueba al padre con `exists()`/`get()` (o `existsAfter()`/`getAfter()` si nacen juntos).
4. **Borrado.** ¿Qué pasa con sus hijos y sus archivos al borrarlo? Implementa la cascada en
   [`data.ts`](../src/lib/data.ts) (archivos primero, luego un batch con los documentos) y da
   permiso de borrado en las reglas a quien la ejecuta. Si no debe borrarse nunca:
   `allow delete: if false`.
5. **Copias.** Si copia datos de otra colección, agrégalos a la tabla de datos duplicados y define
   cómo se mantienen al día.
6. **Consultas.** Firestore rechaza una consulta si las reglas no garantizan que **todos** los
   resultados son legibles: filtra siempre por el campo que la regla comprueba
   (`where("profesorId", "==", uid)`).
7. **Documenta**: modelo en [arquitectura.md](arquitectura.md#modelo-de-datos-firestore), su fila en
   _Relaciones actuales_ y, si aplica, en _Datos duplicados_.
8. **Publica las reglas** (`npm run deploy:reglas`) antes o junto con el código que las usa.

## Límites a tener en cuenta

| Límite                                    | Valor                             | Dónde afecta                                                                                   |
| ----------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Escrituras por `writeBatch` / transacción | 500                               | Cascadas grandes (borrar una clase con cientos de entregas).                                   |
| Lecturas `get()`/`exists()` por regla     | 10 (una escritura), 20 (un batch) | Reglas que encadenan muchas comprobaciones.                                                    |
| `getAfter()` / `existsAfter()`            | Solo dentro del mismo batch       | Validar dos documentos que nacen juntos.                                                       |
| Tamaño de un documento                    | 1 MiB                             | Listas dentro de un documento (`materiales`, máx. 30 por regla).                               |
| Storage y Firestore                       | Sin transacción común             | Por eso el orden: archivo primero al borrar, borrar el archivo si falla la anotación al subir. |

## Base de datos y dónde está cada cosa

La base se llama **`default`** (sin paréntesis): `getFirestore(app, "default")` en
[`firebase.ts`](../src/lib/firebase.ts), `"database": "default"` en
[`firebase.json`](../firebase.json) y `/databases/default/...` en
[`storage.rules`](../storage.rules).

| Archivo                                               | Qué tiene                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| [`firestore.rules`](../firestore.rules)               | Permisos y validación de cada colección, incluidas las relaciones           |
| [`storage.rules`](../storage.rules)                   | Permisos de archivos; consultan Firestore para saber de quién es cada clase |
| [`src/lib/auth.ts`](../src/lib/auth.ts)               | Registro (batch `documentos` + `usuarios`), login, cuenta incompleta        |
| [`src/lib/data.ts`](../src/lib/data.ts)               | Lecturas en vivo y escrituras, incluida la cascada de `eliminarClase`       |
| [`src/lib/files.ts`](../src/lib/files.ts)             | Subida y borrado de archivos (`borrarArchivo` solo ignora "ya no existe")   |
| [`firestore.indexes.json`](../firestore.indexes.json) | Índices compuestos (hoy ninguno)                                            |
