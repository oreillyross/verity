import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {db} from "./db/client"

import { registerApi } from "./api.js";
import { mountViteDevMiddleware } from "./vite.js";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { Context } from "@/server/trpc/core.js";
import { appRouter } from "@/server/trpc/router.js";
import { bootstrapDatabase } from "./db/bootstrap.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));

const createContext = async ({
  req,
  res,
}: {
  req: express.Request;
  res: express.Response;
}): Promise<Context> => {
  return {db};
};

await bootstrapDatabase()

const port = Number(process.env.PORT ?? 3000);
const httpServer = http.createServer(app);

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

registerApi(app);

if (process.env.NODE_ENV !== "production") {
  // DEV: Express owns the port; Vite is middleware
  await mountViteDevMiddleware(httpServer, app);
} else {
  // PROD: serve built client + API from same domain
  const publicDir = path.resolve(__dirname, "../dist/public");
  app.use(express.static(publicDir));
  app.get("*", (req, res) => {
    if (req.originalUrl.startsWith("/api")) return res.status(404).end();
    if (req.originalUrl.startsWith("/trpc")) return res.status(404).end();
    
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

httpServer.listen(port, "0.0.0.0", () => {
  console.log(
    `server listening on :${port} (${process.env.NODE_ENV ?? "development"})`,
  );
});
