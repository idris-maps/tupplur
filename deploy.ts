import serverHandler from "./server-handler.ts";

Deno.serve(await serverHandler());
