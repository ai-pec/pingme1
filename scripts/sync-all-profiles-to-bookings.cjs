const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: Missing service account file at scripts/serviceAccountKey.json");
  console.error("Please place your Firebase admin service account key JSON file there.");
  process.exit(1);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
admin.initializeApp();

const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const db = getFirestore();

const parseProfileId = (profileId) => {
  const str = String(profileId || "");
  if (str.startsWith("order_")) {
    const match = str.match(/^(order_[^_]+)(?:_(.+))?$/);
    if (match) {
      return { id: match[1], lineKey: match[2] || null };
    }
  }
  const match = str.match(/^([^_]+)(?:_(.+))?$/);
  if (match) {
    return { id: match[1], lineKey: match[2] || null };
  }
  return { id: str, lineKey: null };
};

async function run() {
  console.log("Fetching all documents from 'nfcProfiles' collection...");
  const snapshot = await db.collection("nfcProfiles").get();
  console.log(`Found ${snapshot.size} profiles to sync.`);

  let successCount = 0;
  let skippedCount = 0;

  for (const docSnap of snapshot.docs) {
    const profileId = docSnap.id;
    const nfcProfile = docSnap.data();

    // Skip drafts or empty name profiles
    if (!nfcProfile.name || nfcProfile.status === "draft") {
      skippedCount++;
      continue;
    }

    console.log(`\nSyncing profile "${profileId}" (username: "${nfcProfile.username}", name: "${nfcProfile.name}")...`);
    const { id: resolvedId, lineKey } = parseProfileId(profileId);

    // 1. Direct document ID lookup
    let bookingDoc = await db.collection("booking").doc(resolvedId).get();
    let legacyDoc = await db.collection("prebookings").doc(resolvedId).get();
    let bookingRef = bookingDoc.exists ? bookingDoc.ref : null;
    let legacyRef = legacyDoc.exists ? legacyDoc.ref : null;
    let bookingData = bookingDoc.exists ? bookingDoc.data() : (legacyDoc.exists ? legacyDoc.data() : null);

    // 2. Query lookup by payment.orderId if direct lookup failed
    if (!bookingData) {
      const [bookingQuery, legacyQuery] = await Promise.all([
        db.collection("booking").where("payment.orderId", "==", resolvedId).get(),
        db.collection("prebookings").where("payment.orderId", "==", resolvedId).get()
      ]);

      if (!bookingQuery.empty) {
        bookingDoc = bookingQuery.docs[0];
        bookingRef = bookingDoc.ref;
        bookingData = bookingDoc.data();
      }
      if (!legacyQuery.empty) {
        legacyDoc = legacyQuery.docs[0];
        legacyRef = legacyDoc.ref;
        if (!bookingData) {
          bookingData = legacyDoc.data();
        }
      }
    }

    if (!bookingData) {
      console.log(`⚠️  Could not find any booking or prebooking document for ID "${resolvedId}". Skipping sync back.`);
      skippedCount++;
      continue;
    }

    // Sync back to booking & prebookings collections
    try {
      const updateDocWithProfile = async (docRef, docData) => {
        if (!docRef || !docData) return;
        const updatePayload = {};

        if (lineKey) {
          let updated = false;
          let nfcLineProfiles = docData.nfcLineProfiles || [];
          if (Array.isArray(nfcLineProfiles)) {
            nfcLineProfiles = nfcLineProfiles.map(item => {
              if (item?.lineKey === lineKey) {
                updated = true;
                return {
                  ...item,
                  nfcProfile: {
                    ...(item.nfcProfile || {}),
                    ...nfcProfile
                  }
                };
              }
              return item;
            });
          }
          if (!updated) {
            nfcLineProfiles.push({
              lineKey,
              itemId: lineKey.split("__")[0] || "nfc-legacy",
              title: "NFC Card",
              nfcProfile: nfcProfile
            });
          }
          updatePayload.nfcLineProfiles = nfcLineProfiles;
        } else {
          updatePayload.nfcProfile = {
            ...(docData.nfcProfile || {}),
            ...nfcProfile
          };
        }

        updatePayload.updatedAt = FieldValue.serverTimestamp();
        await docRef.set(updatePayload, { merge: true });
      };

      await Promise.all([
        updateDocWithProfile(bookingRef, bookingData),
        updateDocWithProfile(legacyRef, legacyRef ? (legacyDoc.exists ? legacyDoc.data() : bookingData) : null)
      ]);

      console.log(`✅ Successfully synced profile back to booking document ID: "${bookingRef ? bookingRef.id : resolvedId}"`);
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to sync back: ${err.message}`);
      skippedCount++;
    }
  }

  console.log(`\n🎉 Sync complete! Successes: ${successCount}, Skipped/Failed: ${skippedCount}`);
}

run().catch(err => {
  console.error("An error occurred during sync run:", err);
  process.exit(1);
});
