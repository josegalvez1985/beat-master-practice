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

| Registro                 | Depende de                                       | Cómo se evita el huérfano                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cuenta de Authentication | `usuarios/{uid}`                                 | El registro borra la cuenta si falla la escritura del perfil. Si aun así queda una cuenta sin perfil, la pantalla "Tu cuenta no terminó de crearse" la borra al tocar **Salir** (tras confirmar en el servidor que no tiene perfil).         |
| `documentos/{nro}`       | `usuarios/{uid}` (y viceversa)                   | Se crean juntos en un batch; cada regla de `create` exige con `getAfter()` que el otro exista y apunte de vuelta. Ninguno se puede borrar desde la app.                                                                                      |
| `inscripciones`          | `usuarios` del profesor y del alumno             | La regla comprueba que ambos existan y sus roles. Los `usuarios` no se borran.                                                                                                                                                               |
| `clases`                 | `usuarios` del profesor                          | La regla exige que quien crea sea profesor. Borrar una clase ([`eliminarClase`](../src/lib/data.ts)) borra sus materiales, sus `entregas` y los archivos de esas entregas.                                                                   |
| `entregas`               | `clases`, `usuarios` del alumno, `inscripciones` | La regla lee la clase y la inscripción. Se borran con la clase; quitar el último archivo borra la entrega. Quitar a un alumno de la lista **no** borra sus entregas: siguen apuntando a una clase y a un alumno que existen (son historial). |
| Archivos de Storage      | `clases.materiales` / `entregas.archivos`        | Si el archivo se sube pero no se puede anotar en Firestore, se borra ([`Materials.tsx`](../src/components/Materials.tsx)). Al quitar un archivo, primero se borra de Storage y después de Firestore.                                         |

```
Authentication ──1:1── usuarios/{uid} ──1:1── documentos/{nro}
                           │
            ┌──────────────┼───────────────────┐
            ▼              ▼                   ▼
   inscripciones      clases (profesor)    entregas (alumno)
 (profesor+alumno)        │                    ▲
                          ├── materiales ──► Storage clases/{claseId}/…
                          └── 1:N ─────────────┘
                                               └── archivos ──► Storage entregas/{claseId}/{alumnoId}/…
```

> **Pendiente (necesita Cloud Functions).** Borrar un usuario desde la consola de Authentication
> deja huérfanos sus `documentos`, `usuarios` y todo lo que cuelga de él. Hasta tener una función
> `onDelete` que haga la cascada, **no borres usuarios solo desde la consola** (ver
> [firebase.md, sección 5](firebase.md#5-revisar-y-limpiar-los-datos)).

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
- **Hoy no hay pantalla para editar el perfil**, pero las reglas permiten cambiar `nombre` e
  `instrumentos`. Si se agrega esa pantalla, el cambio de `nombre` tiene que actualizar **en el
  mismo batch** todas las copias de la tabla (o hacerlo una Cloud Function), y quitar un
  instrumento tiene que decidir qué pasa con sus `inscripciones` y `clases`.

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
