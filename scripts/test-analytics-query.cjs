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

const normalizeNfcUsername = (val) => {
  return String(val || "").trim().toLowerCase();
};

async function run() {
  const userId = "7zCv95yVFYabOdFuNZkadIjjL4N2";
  const userEmail = "shubham11726@gmail.com";

  console.log(`Simulating getNfcVisitAnalytics for userId: "${userId}" and email: "${userEmail}"`);

  const ownedUsernames = new Set();

  const processBookingDoc = (docSnap) => {
    const data = docSnap.data();
    if (!data) return;

    if (data.nfcProfile?.username) {
      const norm = normalizeNfcUsername(data.nfcProfile.username);
      console.log(`Found username in nfcProfile: "${norm}" (doc ID: ${docSnap.id})`);
      ownedUsernames.add(norm);
    }
    if (Array.isArray(data.nfcLineProfiles)) {
      for (const line of data.nfcLineProfiles) {
        if (line?.nfcProfile?.username) {
          const norm = normalizeNfcUsername(line.nfcProfile.username);
          console.log(`Found username in nfcLineProfiles: "${norm}" (doc ID: ${docSnap.id}, lineKey: ${line?.lineKey})`);
          ownedUsernames.add(norm);
        }
      }
    }
  };

  // Query bookings by userId
  console.log("Querying bookings by userId...");
  const [bookingsByUid, legacyByUid] = await Promise.all([
    db.collection("booking").where("userId", "==", userId).get(),
    db.collection("prebookings").where("userId", "==", userId).get(),
  ]);
  console.log(`Found ${bookingsByUid.size} in booking and ${legacyByUid.size} in prebookings.`);
  bookingsByUid.docs.forEach(processBookingDoc);
  legacyByUid.docs.forEach(processBookingDoc);

  // Query bookings by email
  console.log("Querying bookings by email...");
  const [bookingsByEmail, legacyByEmail] = await Promise.all([
    db.collection("booking").where("email", "==", userEmail).get(),
    db.collection("prebookings").where("email", "==", userEmail).get(),
  ]);
  console.log(`Found ${bookingsByEmail.size} in booking and ${legacyByEmail.size} in prebookings.`);
  bookingsByEmail.docs.forEach(processBookingDoc);
  legacyByEmail.docs.forEach(processBookingDoc);

  const usernamesArr = Array.from(ownedUsernames);
  console.log("\nOwned Usernames:", usernamesArr);

  if (usernamesArr.length === 0) {
    console.log("❌ No owned usernames found. Dashboards will display: 'No NFC cards registered'.");
    return;
  }

  // Get visits analytics
  console.log("\nQuerying nfcVisits...");
  // Limit to first 30 owned usernames
  const queryRef = db.collection("nfcVisits").where("username", "in", usernamesArr.slice(0, 30));
  const visitsSnapshot = await queryRef.get();
  console.log(`Found ${visitsSnapshot.size} total visits in nfcVisits.`);

  // Get leads
  console.log("\nQuerying nfcLeads...");
  const leadsQueryRef = db.collection("nfcLeads").where("cardOwnerUsername", "in", usernamesArr.slice(0, 30));
  const leadsSnapshot = await leadsQueryRef.get();
  console.log(`Found ${leadsSnapshot.size} total leads in nfcLeads.`);
}

run().catch(err => {
  console.error("Error running query simulation:", err);
});
