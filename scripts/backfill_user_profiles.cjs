const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const importResultsPath = path.join(__dirname, "import-results.csv");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing service account file at scripts/serviceAccountKey.json");
  process.exit(1);
}

if (!fs.existsSync(importResultsPath)) {
  console.error("Missing import results at scripts/import-results.csv");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

const parseCsv = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  const lines = raw.split(/\r?\n/);
  const headers = lines.shift().split(",");

  return lines.map((line) => {
    const values = line.split(",");
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || "";
      return acc;
    }, {});
  });
};

const rows = parseCsv(importResultsPath);

async function backfill() {
  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  for (const row of rows) {
    const uid = String(row.UID || "").trim();
    const email = String(row.Email || "").trim().toLowerCase();
    const displayName = String(row.Name || "").trim();

    if (!uid || !email || !displayName) {
      continue;
    }

    const userRef = db.collection("users").doc(uid);
    batch.set(userRef, {
      uid,
      email,
      emailVerified: false,
      displayName,
      mobile: "",
      photoURL: null,
      authProvider: "email",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      addresses: [],
      savedCards: [],
    }, { merge: true });

    count += 1;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
  }

  const sampleUid = String(rows[0]?.UID || "").trim();
  const sampleSnap = sampleUid ? await db.collection("users").doc(sampleUid).get() : null;

  console.log(`Backfilled ${count} user profile documents.`);
  if (sampleSnap && sampleSnap.exists) {
    console.log(`Sample profile created for UID ${sampleUid}:`, sampleSnap.data());
  }
}

backfill().then(() => process.exit(0)).catch((error) => {
  console.error("Failed to backfill user profiles:", error);
  process.exit(1);
});
