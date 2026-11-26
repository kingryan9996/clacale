import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import swBuildId from "./vite.sw-plugin.js";

export default defineConfig({
  plugins: [react(), swBuildId()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
