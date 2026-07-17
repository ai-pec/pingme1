/**
 * Generate compressed WebP thumbnails for every image under products/ in the
 * plzping-me Firebase Storage bucket. Thumbnails are written to a parallel
 * products/thumbs/ prefix with ".webp" appended to the full original filename
 * (products/hero_i.PNG -> products/thumbs/hero_i.PNG.webp).
 *
 * The naming scheme must stay in lockstep with buildCompressedImageUrl()
 * in src/lib/productCatalog.ts.
 *
 * SAFETY
 *  - Dry-run by default. Pass --commit to write.
 *  - Idempotent — re-runs skip thumbs that are up to date; re-uploaded images
 *    (same name, new content) are detected via the stored sourceGeneration.
 *  - Never modifies or deletes originals.
 *
 * RUN
 *  node scripts/compress-product-images.cjs                  # dry run
 *  node scripts/compress-product-images.cjs --commit         # generate thumbs
 *  node scripts/compress-product-images.cjs --commit --force # regenerate all
 *  node scripts/compress-product-images.cjs --width 800 --quality 72
 *  node scripts/compress-product-images.cjs --only keychain  # filter by substring
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const COMMIT = process.argv.includes("--commit");
const FORCE = process.argv.includes("--force");

const argValue = (flag, fallback) => {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
};

const WIDTH = Number(argValue("--width", "800"));
const QUALITY = Number(argValue("--quality", "72"));
const ONLY = argValue("--only", "");

const KEY = path.join(__dirname, "appServiceAccountKey.json");
if (!fs.existsSync(KEY)) {
  console.error(`Missing service account at ${KEY}`);
  process.exit(1);
}
const account = require(KEY);
const BUCKET = process.env.BUCKET || `${account.project_id}.appspot.com`;

const SOURCE_PREFIX = "products/";
const THUMB_PREFIX = "products/thumbs/";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".bmp", ".tiff", ".tif"]);

const app = initializeApp({ credential: cert(account), storageBucket: BUCKET });
const bucket = getStorage(app).bucket();

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

async function run() {
  console.log(`\n=== Compress product images ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===`);
  console.log(`Bucket: gs://${BUCKET}`);
  console.log(`Settings: width<=${WIDTH}px, webp quality ${QUALITY}${FORCE ? ", FORCE regenerate" : ""}${ONLY ? `, only "${ONLY}"` : ""}\n`);

  const [files] = await bucket.getFiles({ prefix: SOURCE_PREFIX });

  // Index existing thumbs so freshness checks don't need per-file network calls.
  const thumbsByPath = new Map();
  for (const f of files) {
    if (f.name.startsWith(THUMB_PREFIX)) thumbsByPath.set(f.name, f);
  }

  let created = 0, fresh = 0, skipped = 0, failed = 0;
  let bytesBefore = 0, bytesAfter = 0;

  for (const file of files) {
    const name = file.name;
    if (name.startsWith(THUMB_PREFIX)) continue;
    if (name.endsWith("/") || Number(file.metadata.size) === 0) continue;
    if (ONLY && !name.includes(ONLY)) { skipped++; continue; }

    const ext = path.extname(name).toLowerCase();
    const contentType = file.metadata.contentType || "";
    const isImage = IMAGE_EXTENSIONS.has(ext) || (contentType.startsWith("image/") && contentType !== "image/gif");
    if (!isImage || contentType === "image/gif") {
      console.log(`  skip (not compressible): ${name} [${contentType || ext || "unknown"}]`);
      skipped++;
      continue;
    }

    const thumbPath = THUMB_PREFIX + name.slice(SOURCE_PREFIX.length) + ".webp";
    const generation = String(file.metadata.generation);
    const existingThumb = thumbsByPath.get(thumbPath);

    if (!FORCE && existingThumb && existingThumb.metadata.metadata?.sourceGeneration === generation) {
      fresh++;
      continue;
    }

    const originalSize = Number(file.metadata.size);

    if (!COMMIT) {
      console.log(`  would create: ${name} (${kb(originalSize)}) -> ${thumbPath}`);
      created++;
      bytesBefore += originalSize;
      continue;
    }

    try {
      const [buffer] = await file.download();
      const out = await sharp(buffer)
        .rotate()
        .resize({ width: WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();

      await bucket.file(thumbPath).save(out, {
        contentType: "image/webp",
        metadata: {
          cacheControl: "public, max-age=31536000, immutable",
          metadata: { source: name, sourceGeneration: generation },
        },
      });

      const pct = originalSize > 0 ? Math.round((1 - out.length / originalSize) * 100) : 0;
      console.log(`  created: ${name} ${kb(originalSize)} -> ${kb(out.length)} (-${pct}%)`);
      created++;
      bytesBefore += originalSize;
      bytesAfter += out.length;
    } catch (err) {
      console.error(`  FAILED: ${name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Created: ${created}${COMMIT ? "" : " (projected)"}`);
  console.log(`Up-to-date (skipped): ${fresh}`);
  console.log(`Skipped (non-image/filtered): ${skipped}`);
  console.log(`Failed: ${failed}`);
  if (COMMIT && bytesBefore > 0) {
    console.log(`Size: ${kb(bytesBefore)} -> ${kb(bytesAfter)} (saved ${Math.round((1 - bytesAfter / bytesBefore) * 100)}% on card renders)`);
  }
  if (!COMMIT) console.log(`\nDry run only — re-run with --commit to generate thumbnails.`);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
