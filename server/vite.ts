import type { Express } from "express";
import type { Server as HttpServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function mountViteDevMiddleware(httpServer: HttpServer, app: Express) {
  const clientRoot = path.resolve(__dirname, "../client");

  const vite = await createViteServer({
    root: clientRoot,
    logLevel: "info",
    server: {
      middlewareMode: true,
      hmr: {
        server: httpServer,
        // keeps HMR working when the main server owns the port
        path: "/vite-hmr"
      }
    },
    appType: "custom"
  });

  // Vite dev middlewares handle module requests + HMR
  app.use(vite.middlewares);

  // Serve index.html through Vite (so it injects HMR + transforms)
  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;

      // Let API routes pass through
      if (url.startsWith("/api")) return next();

      const indexPath = path.resolve(clientRoot, "index.html");
      let html = await vite.ssrLoadModule("/index.html").then(() => null).catch(() => null); // keep vite "warm" (optional)
      let template = await vite
        .transformIndexHtml(url, await (await import("node:fs/promises")).readFile(indexPath, "utf-8"));

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}