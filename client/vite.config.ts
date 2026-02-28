import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: true
  }
});