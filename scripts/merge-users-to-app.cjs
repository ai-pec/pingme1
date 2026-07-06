/**
 * Merge website user profiles into the app project's `users` collection,
 * matched by phone number. Companion to migrate-orders-to-app.cjs.
 *
 * SAFETY (non-destructive by design)
 *  - Dry-run by default. Pass --commit to write.
 *  - For a MATCHED app user, all website profile data is attached under a
 *    namespaced `website` sub-object via merge — it can NEVER overwrite an
 *    existing app field (fullName, email, medical info, roles, etc.).
 *  - For an UNMATCHED website user, the profile is imported as a fresh doc
 *    keyed by the website UID (cannot collide with app Auth UIDs) and flagged.
 *  - Nothing is ever deleted from either project. Idempotent (safe to re-run).
 *
 * SETUP
 *  1. cd scripts && npm install
 *  2. scripts/serviceAccountKey.json      -> SOURCE (website) project   [present]
 *  3. scripts/appServiceAccountKey.json   -> TARGET (app) project        [you provide]
 *
 * RUN
 *  node scripts/merge-users-to-app.cjs            # dry run
 *  node scripts/merge-users-to-app.cjs --commit   # perform the merge
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
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

const sourceAccount = require(SOURCE_KEY);
const targetAccount = require(TARGET_KEY);

const sourceApp = initializeApp({ credential: cert(sourceAccount) }, "source");
const targetApp = initializeApp({ credential: cert(targetAccount) }, "target");

const sourceDb = getFirestore(sourceApp);
const targetDb = getFirestore(targetApp);

const SOURCE_PROJECT = sourceAccount.project_id;

const last10 = (phone) => String(phone || "").replace(/\D/g, "").slice(-10);

/**
 * Build a phone(last-10) -> app UID map from every app collection that links a
 * phone to a uid, so we match regardless of exactly where the app stores phone.
 */
async function buildPhoneUidMap() {
  const map = new Map();
  const add = (phone, uid) => {
    const key = last10(phone);
    if (key.length === 10 && uid && !map.has(key)) map.set(key, uid);
  };

  const users = await targetDb.collection("users").get();
  users.forEach((doc) => {
    const u = doc.data() || {};
    // try the likely primary-phone fields (NOT emergencyPhone — that's a 3rd party)
    add(u.phone || u.mobile || u.phoneNumber || u.contact, doc.id);
  });

  try {
    const orders = await targetDb.collection("orders").get();
    orders.forEach((doc) => {
      const o = doc.data() || {};
      if (o.customer) add(o.customer.phone, o.customer.uid);
    });
  } catch (_) { /* ignore */ }

  try {
    const articles = await targetDb.collection("articles").get();
    articles.forEach((doc) => {
      const a = doc.data() || {};
      add(a.ownerPhone, a.ownerId);
    });
  } catch (_) { /* ignore */ }

  return map;
}

function websitePayload(uid, u) {
  // All website-specific profile data, kept intact.
  const website = {
    uid,
    displayName: u.displayName || "",
    email: u.email || "",
    mobile: u.mobile || u.phone || "",
    photoURL: u.photoURL || null,
    authProvider: u.authProvider || "email",
    emailVerified: Boolean(u.emailVerified),
  };
  if (Array.isArray(u.addresses)) website.addresses = u.addresses;
  if (Array.isArray(u.savedCards)) website.savedCards = u.savedCards;
  if (u.createdAt) website.createdAt = u.createdAt;
  return website;
}

async function main() {
  console.log(`\n=== Users merge ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===`);
  console.log(`Source: ${SOURCE_PROJECT}  ->  Target: ${targetAccount.project_id}\n`);

  console.log("Building phone -> app UID map…");
  const phoneUidMap = await buildPhoneUidMap();
  console.log(`  mapped ${phoneUidMap.size} phone numbers\n`);

  const snap = await sourceDb.collection("users").get();
  console.log(`Website users: ${snap.size}\n`);

  let matched = 0;
  let imported = 0;
  let writer = COMMIT ? targetDb.batch() : null;
  let inBatch = 0;
  const commits = [];

  const flush = () => {
    if (inBatch >= 400) { commits.push(writer.commit()); writer = targetDb.batch(); inBatch = 0; }
  };

  for (const doc of snap.docs) {
    const u = doc.data() || {};
    const websiteUid = doc.id;
    const phoneKey = last10(u.mobile || u.phone);
    const appUid = phoneUidMap.get(phoneKey);

    if (appUid) {
      matched += 1;
      if (COMMIT) {
        writer.set(
          targetDb.collection("users").doc(appUid),
          {
            website: websitePayload(websiteUid, u),
            migration: {
              sourceProject: SOURCE_PROJECT,
              websiteUid,
              matchedByPhone: true,
              mergedAt: FieldValue.serverTimestamp(),
            },
          },
          { merge: true } // never overwrites existing app fields
        );
        inBatch += 1; flush();
      } else if (matched <= 3) {
        console.log(`  match  ${websiteUid} -> app ${appUid} (attach under .website)`);
      }
    } else {
      imported += 1;
      if (COMMIT) {
        // Fresh doc keyed by website UID (cannot collide with app Auth UIDs).
        writer.set(
          targetDb.collection("users").doc(websiteUid),
          {
            ...u,
            source: "website-import",
            migration: {
              sourceProject: SOURCE_PROJECT,
              websiteUid,
              matchedByPhone: false,
              importedAt: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
        inBatch += 1; flush();
      } else if (imported <= 3) {
        console.log(`  import ${websiteUid} (no phone match) -> new users/${websiteUid}`);
      }
    }
  }

  if (COMMIT && inBatch > 0) commits.push(writer.commit());
  if (COMMIT) await Promise.all(commits);

  console.log(`\nSummary:`);
  console.log(`  matched to existing app users : ${matched}`);
  console.log(`  imported as new docs          : ${imported}`);
  console.log(COMMIT ? `\n✅ Users merge committed.` : `\nDry run only — re-run with --commit to write.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Users merge failed:", err);
    process.exit(1);
  });
