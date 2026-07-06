const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: Missing service account file at scripts/serviceAccountKey.json");
  console.error("Please place your Firebase admin service account key JSON file there.");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const args = process.argv.slice(2);
  let uid = null;
  let phone = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--uid" && args[i + 1]) {
      uid = args[i + 1];
    } else if (args[i] === "--phone" && args[i + 1]) {
      phone = args[i + 1];
    }
  }

  if (!uid && !phone) {
    console.log("Usage:");
    console.log("  node scripts/make-admin.cjs --uid <firebase-uid>");
    console.log("  node scripts/make-admin.cjs --phone <phone-number>");
    process.exit(1);
  }

  let userRecord = null;
  if (uid) {
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch (err) {
      console.error(`Error: User with UID "${uid}" not found:`, err.message);
      process.exit(1);
    }
  } else if (phone) {
    try {
      userRecord = await admin.auth().getUserByPhoneNumber(phone);
    } catch (err) {
      console.error(`Error: User with phone number "${phone}" not found:`, err.message);
      process.exit(1);
    }
  }

  const targetUid = userRecord.uid;
  console.log(`Found user: ${userRecord.displayName || "No Name"} (${userRecord.phoneNumber || "No Phone"}) with UID: ${targetUid}`);

  // 1. Set Custom Claims admin: true
  console.log(`Setting custom user claim (admin = true) for user...`);
  await admin.auth().setCustomUserClaims(targetUid, { admin: true });
  console.log(`✔ Custom claims set successfully.`);

  // 2. Write to Firestore 'admins' collection
  console.log(`Writing fallback entry to Firestore 'admins/${targetUid}' collection...`);
  await db.collection("admins").doc(targetUid).set({
    granted: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    phoneNumber: userRecord.phoneNumber || "",
    displayName: userRecord.displayName || ""
  }, { merge: true });
  console.log(`✔ Firestore entry created successfully.`);

  console.log(`\n🎉 User is now an Admin! They should log out and log back in to refresh their session token.`);
}

run().catch(err => {
  console.error("An error occurred:", err);
  process.exit(1);
});
