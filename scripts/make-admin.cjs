/**
 * make-admin.cjs
 * Grants admin rights to a user on a Firebase project.
 *
 * Compatible with firebase-admin v12+ (modular API).
 *
 * Usage:
 *   node scripts/make-admin.cjs --uid <firebase-uid>
 *   node scripts/make-admin.cjs --uid <firebase-uid> --project app
 *   node scripts/make-admin.cjs --phone <phone-number>
 *   node scripts/make-admin.cjs --phone <phone-number> --project app
 *
 *   --project app  → targets plzping-me   (appServiceAccountKey.json)
 *   (default)      → targets pingmereg    (serviceAccountKey.json)
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");

// ── Determine which project / service account to use ──────────────────────────
const projectArg = process.argv.find((a, i) => process.argv[i - 1] === "--project");
const useAppProject = projectArg === "app";
const serviceAccountFile = useAppProject ? "appServiceAccountKey.json" : "serviceAccountKey.json";
const serviceAccountPath = path.join(__dirname, serviceAccountFile);

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Error: Missing service account file at scripts/${serviceAccountFile}`);
  console.error("Please place your Firebase admin service account key JSON file there.");
  process.exit(1);
}

console.log(`Using service account: ${serviceAccountFile}`);
const serviceAccount = require(serviceAccountPath);

// ── Initialize Firebase Admin ──────────────────────────────────────────────────
const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);
const db = getFirestore(app);

// ── Main logic ─────────────────────────────────────────────────────────────────
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
    console.log("  node scripts/make-admin.cjs --uid <firebase-uid> --project app");
    console.log("  node scripts/make-admin.cjs --phone <phone-number>");
    console.log("  node scripts/make-admin.cjs --phone <phone-number> --project app");
    console.log("");
    console.log("  --project app  → targets plzping-me  (appServiceAccountKey.json)");
    console.log("  (default)      → targets pingmereg   (serviceAccountKey.json)");
    process.exit(1);
  }

  let userRecord = null;
  if (uid) {
    try {
      userRecord = await auth.getUser(uid);
    } catch (err) {
      console.error(`Error: User with UID "${uid}" not found:`, err.message);
      process.exit(1);
    }
  } else if (phone) {
    try {
      userRecord = await auth.getUserByPhoneNumber(phone);
    } catch (err) {
      console.error(`Error: User with phone number "${phone}" not found:`, err.message);
      process.exit(1);
    }
  }

  const targetUid = userRecord.uid;
  console.log(`Found user: ${userRecord.displayName || "No Name"} (${userRecord.phoneNumber || "No Phone"}) → UID: ${targetUid}`);

  // 1. Set custom auth claim: admin = true
  console.log("Setting custom user claim (admin = true)...");
  await auth.setCustomUserClaims(targetUid, { admin: true });
  console.log("✔ Custom claims set successfully.");

  // 2. Write fallback document to Firestore 'admins' collection
  console.log(`Writing fallback entry to Firestore 'admins/${targetUid}'...`);
  await db.collection("admins").doc(targetUid).set({
    granted: true,
    updatedAt: FieldValue.serverTimestamp(),
    phoneNumber: userRecord.phoneNumber || "",
    displayName: userRecord.displayName || "",
  }, { merge: true });
  console.log("✔ Firestore entry created successfully.");

  console.log("\n🎉 User is now an Admin! Log out of the website and log back in to refresh the session token.");
}

run().catch(err => {
  console.error("An error occurred:", err);
  process.exit(1);
});
