import { loadEnv, readArgs } from "./deps.ts";
import serverHandler from "./server-handler.ts";

const args = readArgs();
const env = await loadEnv();

const isString = (d: unknown): d is string => String(d) === d;

if (args.help) {
  console.log(`
  [TUPPLUR]
  Start local server:

  \`\`\`
  deno run --unstable --allow-net --allow-read --allow-write local.ts
  \`\`\`

  arguments:

  --superUserKey=KEY
      to set super user key
      required if not defined as SUPER_USER_KEY environment variable

  --dbPath=my-data.db
      set deno kv path
      optional, defaults to global kv store, can be DB_PATH environment variable

  --port=8888
      set port
      optional, defaults to 3333, can be PORT environment variable
  `);
} else {
  let port = 3333;
  if (Number.isInteger(Number(env.PORT))) {
    port = Number(env.PORT);
  }
  if (Number.isInteger(Number(args.port))) {
    port = Number(args.port);
  }

  let dbPath: string | undefined = undefined;
  if (env.DB_PATH) {
    dbPath = env.DB_PATH;
  }
  if (isString(args.dbPath)) {
    dbPath = args.dbPath;
  }

  if (env.SUPER_USER_KEY) {
    Deno.env.set("SUPER_USER_KEY", env.SUPER_USER_KEY);
  }
  if (isString(args.superUserKey)) {
    Deno.env.set("SUPER_USER_KEY", args.superUserKey);
  }
  if (!Deno.env.get("SUPER_USER_KEY")) {
    throw "SUPER_USER_KEY is not defined";
  }
  Deno.serve({ port }, await serverHandler({ dbPath }));
}
