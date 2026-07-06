/**
 * Migrate website orders (booking + prebookings) into the app project's unified
 * `orders` collection, transformed into the canonical nested schema.
 *
 * SAFETY
 *  - Dry-run by default. Pass --commit to actually write.
 *  - Never deletes anything from either project.
 *  - Idempotent: each source order maps to a deterministic target doc id
 *    (`web_<collection>_<sourceId>`), so re-running updates the same doc
 *    instead of creating duplicates.
 *
 * SETUP
 *  1. cd scripts && npm install            (installs firebase-admin)
 *  2. scripts/serviceAccountKey.json       -> SOURCE (website) project   [already present]
 *  3. scripts/appServiceAccountKey.json    -> TARGET (app) project        [you provide]
 *
 * RUN
 *  node scripts/migrate-orders-to-app.cjs            # dry run (no writes)
 *  node scripts/migrate-orders-to-app.cjs --commit   # perform the migration
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
const SOURCE_COLLECTIONS = ["booking", "prebookings"];

// ---- helpers ---------------------------------------------------------------

const last10 = (phone) => String(phone || "").replace(/\D/g, "").slice(-10);

const parsePrice = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isNfcId = (id) => typeof id === "string" && id.startsWith("nfc-");

/**
 * Build a phone(last-10-digits) -> app Auth UID map from every app collection
 * that ties a phone to a uid. This maximises the match rate without assuming
 * exactly where the app stores a user's phone number.
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
    add(u.phone || u.mobile || u.phoneNumber || u.contact, doc.id);
  });

  // App orders already carry customer.phone + customer.uid
  try {
    const orders = await targetDb.collection("orders").get();
    orders.forEach((doc) => {
      const o = doc.data() || {};
      if (o.customer) add(o.customer.phone, o.customer.uid);
    });
  } catch (_) { /* collection may not exist yet */ }

  // Articles carry ownerPhone + ownerId
  try {
    const articles = await targetDb.collection("articles").get();
    articles.forEach((doc) => {
      const a = doc.data() || {};
      add(a.ownerPhone, a.ownerId);
    });
  } catch (_) { /* ignore */ }

  return map;
}

function toCanonicalOrder(srcCollection, id, d, phoneUidMap) {
  const items = (Array.isArray(d.items) ? d.items : []).map((it) => {
    const o = {
      id: it.id || "",
      title: it.title || "Product",
      productType: isNfcId(it.id) ? "nfc_card" : "accessory",
      price: parsePrice(it.price),
      quantity: Math.min(Math.max(1, Number(it.quantity) || 1), 10),
    };
    if (it.originalPrice) o.originalPrice = it.originalPrice;
    if (it.image) o.image = it.image;
    if (it.emoji) o.emoji = it.emoji;
    return o;
  });

  const nfc = {};
  if (Array.isArray(d.nfcLineProfiles) && d.nfcLineProfiles.length) nfc.lineProfiles = d.nfcLineProfiles;
  if (d.nfcProfile) nfc.profile = d.nfcProfile;

  const phone = d.phone || "";
  const matchedUid = phoneUidMap.get(last10(phone));
  const resolvedUid = matchedUid || d.userId || null;
  const total = Number(d.totalAmount) || 0;

  return {
    source: "website",
    status: d.status || "pending",
    customer: {
      uid: resolvedUid,
      name: d.fullName || "",
      email: d.email || "",
      phone,
    },
    delivery: {
      address: d.address || "",
      city: d.city || "",
      state: d.state || "",
      pincode: d.pincode || "",
    },
    items,
    amount: { subtotal: total, discount: 0, shipping: 0, total, currency: "INR" },
    payment: d.payment
      ? {
          status: "paid",
          gateway: d.payment.gateway || null,
          orderId: d.payment.orderId || "",
          paymentId: d.payment.paymentId || "",
          signature: d.payment.signature || "",
          amount: d.payment.amount != null ? d.payment.amount : total,
          currency: d.payment.currency || "INR",
          ...(d.payment.paidAt ? { paidAt: d.payment.paidAt } : {}),
        }
      : { status: "pending", gateway: null },
    ...(Object.keys(nfc).length ? { nfc } : {}),
    // Preserve the original order date; fall back to now if missing.
    createdAt: d.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    migration: {
      sourceProject: SOURCE_PROJECT,
      sourceCollection: srcCollection,
      sourceId: id,
      originalUserId: d.userId || null,
      uidMatchedByPhone: Boolean(matchedUid),
      migratedAt: FieldValue.serverTimestamp(),
    },
  };
}

// ---- main ------------------------------------------------------------------

async function main() {
  console.log(`\n=== Order migration ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===`);
  console.log(`Source project: ${SOURCE_PROJECT}`);
  console.log(`Target project: ${targetAccount.project_id}\n`);

  console.log("Building phone -> app UID map…");
  const phoneUidMap = await buildPhoneUidMap();
  console.log(`  mapped ${phoneUidMap.size} phone numbers to app UIDs\n`);

  let total = 0;
  let matched = 0;
  let unmatched = 0;
  let writer = COMMIT ? targetDb.batch() : null;
  let inBatch = 0;
  const commits = [];

  for (const srcCollection of SOURCE_COLLECTIONS) {
    let snap;
    try {
      snap = await sourceDb.collection(srcCollection).get();
    } catch (e) {
      console.log(`  (skip ${srcCollection}: ${e.message})`);
      continue;
    }
    console.log(`Collection "${srcCollection}": ${snap.size} docs`);

    for (const doc of snap.docs) {
      const order = toCanonicalOrder(srcCollection, doc.id, doc.data() || {}, phoneUidMap);
      total += 1;
      if (order.migration.uidMatchedByPhone) matched += 1; else unmatched += 1;

      const targetId = `web_${srcCollection}_${doc.id}`;

      if (COMMIT) {
        writer.set(targetDb.collection("orders").doc(targetId), order, { merge: true });
        inBatch += 1;
        if (inBatch >= 400) {
          commits.push(writer.commit());
          writer = targetDb.batch();
          inBatch = 0;
        }
      } else if (total <= 3) {
        console.log(`  sample -> orders/${targetId}:`, JSON.stringify(order.customer), `items=${order.items.length}`);
      }
    }
  }

  if (COMMIT && inBatch > 0) commits.push(writer.commit());
  if (COMMIT) await Promise.all(commits);

  console.log(`\nSummary:`);
  console.log(`  total orders processed : ${total}`);
  console.log(`  uid matched by phone   : ${matched}`);
  console.log(`  uid NOT matched (kept original/flagged): ${unmatched}`);
  console.log(COMMIT ? `\n✅ Migration committed.` : `\nDry run only — re-run with --commit to write.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
