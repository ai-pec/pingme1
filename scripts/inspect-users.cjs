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
  console.log("--- Searching Firebase Auth Users ---");
  
  // 1. Search Auth by Email
  try {
    const userByEmail = await admin.auth().getUserByEmail("shubham11726@gmail.com");
    console.log(`Auth user by email: UID="${userByEmail.uid}", phone="${userByEmail.phoneNumber}"`);
  } catch (err) {
    console.log(`No Auth user found for email shubham11726@gmail.com: ${err.message}`);
  }

  // 2. Search Auth by Phone
  try {
    const userByPhone = await admin.auth().getUserByPhoneNumber("+919266519902");
    console.log(`Auth user by phone: UID="${userByPhone.uid}", email="${userByPhone.email}"`);
  } catch (err) {
    console.log(`No Auth user found for phone +919266519902: ${err.message}`);
  }

  console.log("\n--- Searching Firestore 'users' collection ---");
  const usersSnapshot = await db.collection("users").get();
  console.log(`Total users in Firestore: ${usersSnapshot.size}`);
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    if (data.email === "shubham11726@gmail.com" || data.mobile === "9266519902" || doc.id === "7zCv95yVFYabOdFuNZkadIjjL4N2") {
      console.log(`User Doc: ID="${doc.id}"`);
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

run().catch(err => {
  console.error("Error running user inspect script:", err);
});
