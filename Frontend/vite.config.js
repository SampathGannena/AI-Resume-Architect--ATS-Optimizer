import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      "localhost",
      "carrerforge.up.railway.app",
      ".up.railway.app"
    ]
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    css: true,
    globals: true
  }
});
