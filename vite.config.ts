import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [import("@replit/vite-plugin-cartographer").then((m) => m.cartographer())]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // Point to your src folder
      "@shared": path.resolve(__dirname, "shared"), // Adjust if used
      "@assets": path.resolve(__dirname, "attached_assets"), // Adjust if used
    },
  },
  root: path.resolve(__dirname, "."), // Use project root
  build: {
    outDir: path.resolve(__dirname, "dist/public"), // Keep build output
    emptyOutDir: true,
  },
  server: {
    port: 5173, // Default Vite port
    proxy: {
      "/api": {
        target: "http://localhost:5000", // Match server/index.ts port
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});