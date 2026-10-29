import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createAdminDevMiddleware } from "./scripts/admin-dev-middleware.mjs";

export default defineConfig(({ isSsrBuild, command }) => ({
  plugins: [
    react(),
    ...(command === "serve"
      ? [
          {
            name: "admin-dev-api-server",
            configureServer(server: any) {
              server.middlewares.use(createAdminDevMiddleware());
            },
          },
        ]
      : []),
  ],
  ...(!isSsrBuild ? { build: { rollupOptions: { output: { manualChunks: { react: ["react", "react-dom", "react-router-dom"] } } } } } : {}),
}));
