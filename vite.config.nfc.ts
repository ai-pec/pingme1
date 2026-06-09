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
    },
  },
});
