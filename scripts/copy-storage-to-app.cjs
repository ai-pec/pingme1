/**
 * Copy all Firebase Storage files from the website project bucket (pingmereg.appspot.com)
 * to the app project bucket (plzping-me.appspot.com).
 *
 * SAFETY
 *  - Dry-run by default. Pass --commit to write.
 *  - Idempotent — safe to re-run.
 *  - Never deletes anything.
 *
 * RUN
 *  node scripts/copy-storage-to-app.cjs            # dry run (lists files only)
 *  node scripts/copy-storage-to-app.cjs --commit   # perform the copy
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const fs = require("fs");
const path = require("path");

const COMMIT = process.argv.includes("--commit");

const SOURCE_KEY = path.join(__dirname, "serviceAccountKey.json");
const TARGET_KEY = path.join(__dirname, "appServiceAccountKey.json");

for (const [label, p] of [["source", SOURCE_KEY], ["target (app)", TARGET_KEY]]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing ${label} service account at ${p}`);
    process.exit(1);
  }
}

// Read project IDs for buckets
const sourceAccount = require(SOURCE_KEY);
const targetAccount = require(TARGET_KEY);

// Source project (pingmereg) uses the newer format: pingmereg.firebasestorage.app
const SOURCE_BUCKET = process.argv.includes("--source-appspot") 
  ? `${sourceAccount.project_id}.appspot.com` 
  : `${sourceAccount.project_id}.firebasestorage.app`;

const TARGET_BUCKET = process.argv.includes("--target-firebasestorage")
  ? `${targetAccount.project_id}.firebasestorage.app`
  : `${targetAccount.project_id}.appspot.com`;

const sourceApp = initializeApp({
  credential: cert(sourceAccount),
  storageBucket: SOURCE_BUCKET
}, "source");

const targetApp = initializeApp({
  credential: cert(targetAccount),
  storageBucket: TARGET_BUCKET
}, "target");

const sourceBucket = getStorage(sourceApp).bucket();
const targetBucket = getStorage(targetApp).bucket();

async function run() {
  console.log(`\n=== Copy storage files ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===`);
  console.log(`Source: gs://${SOURCE_BUCKET}`);
  console.log(`Target: gs://${TARGET_BUCKET}\n`);

  const [files] = await sourceBucket.getFiles();

  if (files.length === 0) {
    console.log("No files found in the source bucket.");
    process.exit(0);
  }

  console.log(`Found ${files.length} files in source bucket.`);

  let copiedCount = 0;

  for (const file of files) {
    console.log(`- ${file.name} (${(file.metadata.size / 1024).toFixed(2)} KB)`);

    if (COMMIT) {
      const sourceFile = sourceBucket.file(file.name);
      const targetFile = targetBucket.file(file.name);

      // Check if file already exists in target with same size to avoid redundant downloads/uploads
      const [exists] = await targetFile.exists();
      if (exists) {
        const [targetMeta] = await targetFile.getMetadata();
        if (targetMeta.size === file.metadata.size) {
          console.log(`  -> Already exists in target (same size), skipping.`);
          continue;
        }
      }

      await new Promise((resolve, reject) => {
        sourceFile.createReadStream()
          .pipe(targetFile.createWriteStream({
            metadata: {
              contentType: file.metadata.contentType,
              cacheControl: file.metadata.cacheControl,
            }
          }))
          .on("finish", () => {
            console.log(`  -> Copied successfully ✅`);
            copiedCount++;
            resolve();
          })
          .on("error", (err) => {
            console.error(`  -> Error copying: ${err.message} ❌`);
            reject(err);
          });
      });
    }
  }

  console.log(`\nTotal files ${COMMIT ? "copied" : "to copy"}: ${COMMIT ? copiedCount : files.length}`);
  if (!COMMIT) {
    console.log("\nDry run only — re-run with --commit to write.");
  } else {
    console.log("\n✅ Storage copy completed.");
  }
  process.exit(0);
}

run().catch((e) => {
  console.error("Storage copy failed:", e);
  process.exit(1);
});
