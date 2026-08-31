import path from "node:path";
// vitest/config re-exports vite's defineConfig with the `test` field typed
// (this file doubles as both the Vite build config and the Vitest config).
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  test: {
    setupFiles: ["./src/test-setup.ts"],
  },
});
