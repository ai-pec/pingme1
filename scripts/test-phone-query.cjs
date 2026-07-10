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
  const phoneStr = "9266519902";
  const phoneNum = 9266519902;

  console.log("--- Testing Booking Query by Phone String ---");
  const byStr = await db.collection("booking").where("phone", "==", phoneStr).get();
  console.log(`Booking docs matching string "${phoneStr}": ${byStr.size}`);
  for (const doc of byStr.docs) {
    console.log(`Found doc ID: ${doc.id}, phone type: ${typeof doc.data().phone}, phone val: "${doc.data().phone}"`);
  }

  console.log("\n--- Testing Booking Query by Phone Number ---");
  const byNum = await db.collection("booking").where("phone", "==", phoneNum).get();
  console.log(`Booking docs matching number ${phoneNum}: ${byNum.size}`);

  console.log("\n--- Testing Prebookings Query by Phone String ---");
  const prebyStr = await db.collection("prebookings").where("phone", "==", phoneStr).get();
  console.log(`Prebookings docs matching string "${phoneStr}": ${prebyStr.size}`);
}

run().catch(err => {
  console.error("Error running phone query test:", err);
});
