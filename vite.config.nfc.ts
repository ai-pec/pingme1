import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { writeFileSync, renameSync } from "fs";

// Standalone NFC subdomain build — outputs to dist-nfc/
// Deploy the contents of dist-nfc/ to nfc.plzpingme.com
export default defineConfig({
  plugins: [
    react(),
    {
      // Produce a standalone entry point and Apache fallback for direct /:username visits.
      name: "rename-nfc-html",
      closeBundle() {
        const outDir = path.resolve(__dirname, "dist-nfc");
        try {
          renameSync(`${outDir}/nfc.html`, `${outDir}/index.html`);
        } catch (e) {
          // already index.html or doesn't exist
        }
        writeFileSync(
          `${outDir}/.htaccess`,
          [
            "# Disable caching for HTML files so browser always fetches the latest built assets",
            "<FilesMatch \"\\.(html|htm)$\">",
            "  <IfModule mod_headers.c>",
            "    Header set Cache-Control \"no-cache, no-store, must-revalidate\"",
            "    Header set Pragma \"no-cache\"",
            "    Header set Expires 0",
            "  </IfModule>",
            "</FilesMatch>",
            "",
            "# Hashed build assets — cache forever",
            "<FilesMatch \"\\.(js|mjs|css|woff2?|ttf|otf)$\">",
            "  <IfModule mod_headers.c>",
            "    Header set Cache-Control \"public, max-age=31536000, immutable\"",
            "  </IfModule>",
            "</FilesMatch>",
            "",
            "<FilesMatch \"\\.(jpe?g|png|webp|avif|gif|svg|ico|mp4|webm)$\">",
            "  <IfModule mod_headers.c>",
            "    Header set Cache-Control \"public, max-age=2592000\"",
            "  </IfModule>",
            "</FilesMatch>",
            "",
            "<IfModule mod_deflate.c>",
            "  AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml",
            "  AddOutputFilterByType DEFLATE application/javascript application/x-javascript text/javascript",
            "  AddOutputFilterByType DEFLATE application/json application/xml image/svg+xml",
            "</IfModule>",
            "",
            "RewriteEngine On",
            "RewriteBase /",
            "RewriteCond %{REQUEST_FILENAME} -f [OR]",
            "RewriteCond %{REQUEST_FILENAME} -d",
            "RewriteRule ^ - [L]",
            "RewriteRule ^ index.html [L]",
            "",
          ].join("\n"),
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-nfc",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "nfc.html"),
      output: {
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
});
