const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const snap = await db.collection("config").get();
  console.log(`Found ${snap.size} config documents in pingmereg:`);
  snap.docs.forEach(doc => {
    console.log(`Document ID: ${doc.id}, fields:`, Object.keys(doc.data()));
  });
  process.exit(0);
}

run().catch(console.error);
