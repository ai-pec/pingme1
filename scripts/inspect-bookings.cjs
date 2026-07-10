const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: Missing service account file at scripts/serviceAccountKey.json");
  process.exit(1);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
admin.initializeApp();

const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();

async function run() {
  const ids = ["IDDRXiPEHhKGAqFvoqH4", "9MXAWwhQ9KfnoqZnqAzA"];
  for (const id of ids) {
    console.log(`\n--- Inspecting Booking: ${id} ---`);
    const doc = await db.collection("booking").doc(id).get();
    if (!doc.exists) {
      const legacyDoc = await db.collection("prebookings").doc(id).get();
      if (legacyDoc.exists) {
        console.log("Found in prebookings:");
        console.log(JSON.stringify(legacyDoc.data(), null, 2));
      } else {
        console.log("Not found in booking or prebookings collections.");
      }
    } else {
      console.log("Found in booking:");
      console.log(JSON.stringify(doc.data(), null, 2));
    }
  }
}

run().catch(err => {
  console.error("Error running inspect script:", err);
});
