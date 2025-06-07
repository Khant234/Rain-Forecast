import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import tailwind from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    port: 3000,
    open: true,
    // Remove HTTPS for now - localhost should work with HTTP for GPS
    proxy: {
      "/api": {
        target: "http://localhost:3001", // Updated to match backend server port
        changeOrigin: true,
        secure: false,
        // Don't rewrite the path - backend expects /api/weather
      },
    },
  },
  base: "",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
