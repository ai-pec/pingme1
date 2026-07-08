const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "appServiceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: Missing service account file");
  process.exit(1);
}

const admin = require("../functions/node_modules/firebase-admin");

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixUserId() {
  const uid = "EgcEMY5czUabFyJsc4FhqN0UIFo1";

  console.log(`=== FIXING 'id' FIELD FOR USER UID: ${uid} ===\n`);

  const userRef = db.collection("users").doc(uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    console.error(`User document with UID ${uid} not found!`);
    process.exit(1);
  }

  console.log("Current document state:", JSON.stringify(doc.data(), null, 2));

  console.log(`Updating document to set 'id' field to '${uid}'...`);
  await userRef.update({
    id: uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const updatedDoc = await userRef.get();
  console.log("\nNew document state:", JSON.stringify(updatedDoc.data(), null, 2));

  console.log("\n=== FIX COMPLETED ===");
  process.exit(0);
}

fixUserId().catch(err => {
  console.error(err);
  process.exit(1);
});
