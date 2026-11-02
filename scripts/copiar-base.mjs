// Copies every Firestore document from the named database "default" to "(default)", the only one
// Storage rules can read (docs/firebase.md, "Base (default)"). Uses the `firebase login` session.
//
//   node scripts/copiar-base.mjs            # only counts the documents in each database
//   node scripts/copiar-base.mjs --copiar   # copies (same ids and fields; safe to run again)
//
// Writes go through the Firestore API as the project owner, so they skip the security rules.
// Nothing is deleted: "default" stays as it is until it is removed by hand.
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const lib = path.join(path.dirname(require.resolve("firebase-tools/package.json")), "lib");
const { configstore } = require(path.join(lib, "configstore.js"));
const { requireAuth } = require(path.join(lib, "requireAuth.js"));
const { Client } = require(path.join(lib, "apiv2.js"));

const PROYECTO = "beat-master-practice";
const ORIGEN = "default";
const DESTINO = "(default)";
const copiar = process.argv.includes("--copiar");

const base = (id) => `projects/${PROYECTO}/databases/${id}`;
const api = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });

// References keep pointing at the same document, now in the destination database.
function moverReferencias(valor) {
  if (valor.referenceValue)
    return { referenceValue: valor.referenceValue.replace(base(ORIGEN), base(DESTINO)) };
  if (valor.mapValue) return { mapValue: { fields: moverCampos(valor.mapValue.fields) } };
  if (valor.arrayValue)
    return { arrayValue: { values: (valor.arrayValue.values ?? []).map(moverReferencias) } };
  return valor;
}

function moverCampos(campos = {}) {
  return Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, moverReferencias(v)]));
}

async function subcolecciones(padre) {
  const ids = [];
  let pageToken;
  do {
    const { body } = await api.post(`/${padre}:listCollectionIds`, { pageSize: 300, pageToken });
    ids.push(...(body.collectionIds ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return ids;
}

// Commits in groups: at most 500 writes and well under the 10 MiB request limit.
let pendientes = [];
let bytes = 0;
async function escribir(write) {
  const tamano = JSON.stringify(write).length;
  if (pendientes.length === 400 || bytes + tamano > 8_000_000) await vaciar();
  pendientes.push(write);
  bytes += tamano;
}
async function vaciar() {
  if (pendientes.length === 0) return;
  await api.post(`/${base(DESTINO)}/documents:commit`, { writes: pendientes });
  pendientes = [];
  bytes = 0;
}

// Walks a collection and its subcollections; returns how many documents it has.
async function recorrer(padre, coleccion) {
  let total = 0;
  let pageToken;
  do {
    const { body } = await api.get(`/${padre}/${coleccion}`, {
      queryParams: { pageSize: "300", showMissing: "true", ...(pageToken && { pageToken }) },
    });
    for (const doc of body.documents ?? []) {
      // "Missing" documents only exist as parents of a subcollection: nothing to copy.
      if (doc.createTime) {
        total += 1;
        if (copiar)
          await escribir({
            update: {
              name: doc.name.replace(base(ORIGEN), base(DESTINO)),
              fields: moverCampos(doc.fields),
            },
          });
      }
      for (const sub of await subcolecciones(doc.name)) total += await recorrer(doc.name, sub);
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return total;
}

async function contar(id, coleccion) {
  const { body } = await api.post(`/${base(id)}/documents:runAggregationQuery`, {
    structuredAggregationQuery: {
      structuredQuery: { from: [{ collectionId: coleccion }] },
      aggregations: [{ alias: "n", count: {} }],
    },
  });
  return Number(body[0]?.result?.aggregateFields?.n?.integerValue ?? 0);
}

async function main() {
  await requireAuth({ user: configstore.get("user"), tokens: configstore.get("tokens") });

  const { status } = await api.get(`/${base(DESTINO)}`, { resolveOnHTTPError: true });
  const existe = status !== 404;
  if (copiar && !existe) {
    console.error(
      `La base ${DESTINO} no existe. Créala primero:\n` +
        `  npx firebase firestore:databases:create "(default)" --location nam5`,
    );
    process.exit(1);
  }

  const raiz = `${base(ORIGEN)}/documents`;
  const colecciones = await subcolecciones(raiz);
  console.log(copiar ? `Copiando ${ORIGEN} → ${DESTINO}...` : "Solo cuenta (agrega --copiar):");
  const filas = [];
  for (const coleccion of colecciones) {
    // With subcollections, "con subcolecciones" is larger than the plain count.
    const conSubcolecciones = await recorrer(raiz, coleccion);
    await vaciar();
    filas.push({
      coleccion,
      [ORIGEN]: await contar(ORIGEN, coleccion),
      [DESTINO]: existe ? await contar(DESTINO, coleccion) : "no existe",
      "con subcolecciones": conSubcolecciones,
    });
  }
  console.table(filas);
  const faltan = filas.filter((f) => f[DESTINO] < f[ORIGEN]);
  if (copiar && faltan.length > 0) {
    console.error("Quedaron colecciones con menos documentos en el destino: vuelve a correrlo.");
    process.exit(1);
  }
  console.log(copiar ? "Copia completa." : "Nada se escribió.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
