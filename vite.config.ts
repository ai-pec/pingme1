import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080, // Changed from 8080 — Firebase authorized domains allows localhost
    // without a port (covers 5173). Port 8080 was causing auth/invalid-app-credential
    // because Firebase does not support localhost:8080 as an authorized domain.
    hmr: {
      overlay: false,
    },
    proxy: {
      "/nfc": {
        target: "http://localhost:8080",
        rewrite: (path) => path.replace(/^\/nfc/, ""),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split big vendors into stable chunks so they download in parallel
        // and stay cached across deploys (only app chunks change hash).
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("firebase")) return "vendor-firebase";
          if (id.includes("react-router")) return "vendor-router";
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          return undefined;
        },
      },
    },
  },
}));