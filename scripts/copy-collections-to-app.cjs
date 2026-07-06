/**
 * Copy website-only collections as-is from the website project into the app
 * project, preserving document IDs. These collections have no app equivalent
 * (catalog, NFC profiles, content, dashboards), so no transform is needed.
 *
 * SAFETY
 *  - Dry-run by default. Pass --commit to write.
 *  - Preserves document IDs; idempotent (set with merge) — safe to re-run.
 *  - Never deletes anything. Skips orders/users (already migrated separately).
 *
 * RUN
 *  node scripts/copy-collections-to-app.cjs            # dry run (counts only)
 *  node scripts/copy-collections-to-app.cjs --commit   # perform the copy
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const COMMIT = process.argv.includes("--commit");

const SOURCE_KEY = path.join(__dirname, "serviceAccountKey.json");
const TARGET_KEY = path.join(__dirname, "appServiceAccountKey.json");
for (const [label, p] of [["source", SOURCE_KEY], ["target (app)", TARGET_KEY]]) {
  if (!fs.existsSync(p)) { console.error(`Missing ${label} service account at ${p}`); process.exit(1); }
}

const sourceDb = getFirestore(initializeApp({ credential: cert(require(SOURCE_KEY)) }, "source"));
const targetDb = getFirestore(initializeApp({ credential: cert(require(TARGET_KEY)) }, "target"));

// Website-only collections to copy as-is (orders/users handled by other scripts).
// `admins` is included but flagged: doc ids are WEBSITE auth UIDs and will NOT
// match app auth UIDs, so copying does not by itself grant admin in the app —
// see the note printed at the end.
const COLLECTIONS = [
  "products",
  "productCategories",
  "faqs",
  "blogPosts",
  "nfcProfiles",
  "nfc_consents",
  "nfcLeads",
  "nfcVisits",
  "payments",
  "installs",
  "admins",
  "adminAccess",
];

async function copyCollection(name) {
  let snap;
  try {
    snap = await sourceDb.collection(name).get();
  } catch (e) {
    console.log(`  ${name.padEnd(18)} (skip: ${e.message})`);
    return 0;
  }
  if (snap.empty) { console.log(`  ${name.padEnd(18)} 0 docs (nothing to copy)`); return 0; }

  if (!COMMIT) { console.log(`  ${name.padEnd(18)} ${snap.size} docs -> would copy`); return snap.size; }

  let batch = targetDb.batch();
  let inBatch = 0;
  const commits = [];
  for (const doc of snap.docs) {
    batch.set(targetDb.collection(name).doc(doc.id), doc.data(), { merge: true });
    if (++inBatch >= 400) { commits.push(batch.commit()); batch = targetDb.batch(); inBatch = 0; }
  }
  if (inBatch > 0) commits.push(batch.commit());
  await Promise.all(commits);
  console.log(`  ${name.padEnd(18)} ${snap.size} docs -> copied ✅`);
  return snap.size;
}

(async () => {
  console.log(`\n=== Copy website-only collections ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===\n`);
  let total = 0;
  for (const name of COLLECTIONS) total += await copyCollection(name);
  console.log(`\nTotal docs ${COMMIT ? "copied" : "to copy"}: ${total}`);
  console.log(
    `\nNOTE: 'admins' doc ids are website UIDs and won't match app UIDs. To regain\n` +
    `admin access, grant admin to your app-project UID (admins/<appUid> doc or a\n` +
    `custom claim). Tell me your app UID and I'll set it.`
  );
  console.log(COMMIT ? "\n✅ Done." : "\nDry run only — re-run with --commit to write.");
  process.exit(0);
})().catch((e) => { console.error("Copy failed:", e.message); process.exit(1); });
