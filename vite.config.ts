import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

// __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));


export default defineConfig({
  plugins: [
    react(),
    // ...existing code...
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  // Root defaults to project directory (index.html at project root)
  build: {
  outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Proxy API and auth to Spring Boot backend to keep same-origin cookies in dev
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        // Ensure Set-Cookie from backend works at dev origin
        cookieDomainRewrite: "",
      },
      "/auth": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "",
      },
      "/oauth2": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "",
      },
      
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
