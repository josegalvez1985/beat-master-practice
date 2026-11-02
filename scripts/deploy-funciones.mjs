// Deploys the Cloud Functions: npm run deploy:funciones (extra arguments go to firebase deploy,
// e.g. -- --only functions:verBackend). Firebase loads functions/ to see what to deploy and gives
// up after 10 s ("User code failed to load... Timeout after 10000"); the first load from a
// OneDrive folder can take longer, so it gets 60 s here.
import { spawnSync } from "node:child_process";

const extra = process.argv.slice(2);
const resultado = spawnSync(
  "npx",
  ["firebase", "deploy", ...(extra.length ? extra : ["--only", "functions"])],
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: "60" },
  },
);
process.exit(resultado.status ?? 1);
