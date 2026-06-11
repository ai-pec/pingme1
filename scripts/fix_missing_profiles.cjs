const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing service account file at scripts/serviceAccountKey.json");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

// ── Only the 4 users whose NFC profiles were never created ──────────────────
const buyers = [
  {
    fullName: "Muhammad Shahbaz",
    companyName: "Rezon Studio",
    jobTitle: "CEO, Brand Strategist",
    phone: "7696690079",
    email: "mhshahbazrzn@gmail.com",
    username: "muhammadshahbaz",
    linkedin: "https://www.linkedin.com/in/mh-shahbaz/",
  },
  {
    fullName: "Vikas Mittal",
    companyName: "ERC MAX Ventures Pvt Ltd",
    jobTitle: "Director",
    phone: "9216003333",
    email: "ercmaxworld@gmail.com",
    username: "vikasmittal",
    address: "SCO 69, level 2, Sector 17D Chandigarh 160017",
    instagram: "https://www.instagram.com/zoogolindia",
  },
  {
    fullName: "Appul Jot Virdi",
    companyName: "Kontent Kai",
    jobTitle: "Founder",
    phone: "9814700270",
    email: "appul.virdi@gmail.com",
    username: "appuljotvirdi",
  },
  {
    fullName: "Lovepreet Singh",
    companyName: "Erosius",
    jobTitle: "Founder & CEO",
    phone: "8168510617",
    email: "erophilous@gmail.com",
    username: "lovepreetsingh",
    instagram: "https://www.instagram.com/erosius_",
  },
];

const NFC_ITEM_ID = "nfc-card-default";
const NFC_ITEM_TITLE = "NFC Card";
const NFC_ITEM_PRICE = 349;

const normalizeUsername = (s) =>
  String(s || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
const normalizeEmail = (e) => String(e || "").trim().toLowerCase();

const crypto = require("crypto");
const importResultsPath = path.join(__dirname, "import-results.csv");

const generateTempPassword = () => {
  return crypto.randomBytes(6).toString("base64").replace(/\W/g, "A") + "1a!";
};

async function ensureAuthUser(email, fullName) {
  if (!email) return { uid: null, created: false, password: null };
  try {
    const user = await auth.getUserByEmail(email);
    console.log(`  → Auth user already exists (UID: ${user.uid})`);
    return { uid: user.uid, created: false, password: null };
  } catch (err) {
    const tempPassword = generateTempPassword();
    const userRecord = await auth.createUser({
      email,
      emailVerified: false,
      password: tempPassword,
      displayName: fullName || undefined,
    });
    return { uid: userRecord.uid, created: true, password: tempPassword };
  }
}

async function createFor(buyer) {
  const email = normalizeEmail(buyer.email || "");
  const username = normalizeUsername(buyer.username || buyer.fullName || "user");

  // Check by email first
  if (email) {
    const byEmail = await db
      .collection("booking")
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!byEmail.empty) {
      const doc = byEmail.docs[0];
      const data = doc.data() || {};
      console.log(`  → Booking already exists (by email), orderId: ${doc.id}`);
      return {
        skipped: true,
        orderId: doc.id,
        username: normalizeUsername(data?.nfcProfile?.username || username),
        auth: { uid: data.userId || null, created: false, password: null },
      };
    }
  }

  // Check by username
  const byUsername = await db
    .collection("booking")
    .where("nfcProfile.username", "==", username)
    .limit(1)
    .get();
  if (!byUsername.empty) {
    const doc = byUsername.docs[0];
    const data = doc.data() || {};
    console.log(`  → Booking already exists (by username), orderId: ${doc.id}`);
    return {
      skipped: true,
      orderId: doc.id,
      username: normalizeUsername(data?.nfcProfile?.username || username),
      auth: { uid: data.userId || null, created: false, password: null },
    };
  }

  // Create auth user
  const authResult = await ensureAuthUser(email, buyer.fullName || "");

  const items = [{ id: NFC_ITEM_ID, title: NFC_ITEM_TITLE, price: `₹${NFC_ITEM_PRICE}`, quantity: 1 }];

  const bookingData = {
    items,
    totalAmount: NFC_ITEM_PRICE,
    fullName: buyer.fullName || "",
    email: email || "",
    phone: buyer.phone || "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    status: "confirmed",
    userId: authResult.uid || null,
    nfcProfile: {
      username,
      name: buyer.fullName || "",
      companyName: buyer.companyName || "",
      jobTitle: buyer.jobTitle || "",
      email: email || null,
      phone: buyer.phone || null,
      ...(buyer.linkedin ? { linkedin: buyer.linkedin } : {}),
      ...(buyer.instagram ? { instagram: buyer.instagram } : {}),
      ...(buyer.address ? { address: buyer.address } : {}),
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedSource: "adminImport",
  };

  const bookingRef = await db.collection("booking").add(bookingData);

  const publicProfile = {
    orderId: bookingRef.id,
    username: bookingData.nfcProfile.username,
    name: bookingData.nfcProfile.name,
    companyName: bookingData.nfcProfile.companyName || null,
    jobTitle: bookingData.nfcProfile.jobTitle || null,
    email: bookingData.nfcProfile.email || null,
    phone: bookingData.nfcProfile.phone || null,
    ...(bookingData.nfcProfile.linkedin ? { linkedin: bookingData.nfcProfile.linkedin } : {}),
    ...(bookingData.nfcProfile.instagram ? { instagram: bookingData.nfcProfile.instagram } : {}),
    ...(bookingData.nfcProfile.address ? { address: bookingData.nfcProfile.address } : {}),
    status: "confirmed",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedSource: "adminImport",
  };

  await db.collection("nfcProfiles").doc(bookingRef.id).set(publicProfile, { merge: true });

  return { orderId: bookingRef.id, username, auth: authResult };
}

function appendImportResult(row) {
  const line = [row.name, row.email, row.phone, row.username, row.company, row.jobTitle, row.address, row.linkedin, row.instagram, row.publicUrl, row.uid, row.tempPassword].join(",") + "\n";

  if (!fs.existsSync(importResultsPath)) {
    fs.writeFileSync(importResultsPath, "Name,Email,Phone,Username,Company,Job Title,Address,LinkedIn,Instagram,Public link,UID,Temp password\n" + line, "utf8");
    return;
  }

  const current = fs.readFileSync(importResultsPath, "utf8");
  // Update existing empty row if present, otherwise append
  const lines = current.split("\n");
  const idx = lines.findIndex(
    (l) => l.includes(row.username) && (l.endsWith(",,") || l.split(",").slice(-2).join("") === "")
  );
  if (idx !== -1) {
    lines[idx] = line.trimEnd();
    fs.writeFileSync(importResultsPath, lines.join("\n"), "utf8");
    console.log(`  → Updated existing row in import-results.csv`);
  } else if (!current.includes(row.username)) {
    fs.appendFileSync(importResultsPath, line, "utf8");
    console.log(`  → Appended new row to import-results.csv`);
  } else {
    console.log(`  → Row already present in import-results.csv, skipping write`);
  }
}

(async () => {
  try {
    console.log("=== Fix Missing NFC Profiles ===\n");
    for (const buyer of buyers) {
      console.log(`----------------------------------------`);
      console.log(`Processing: ${buyer.fullName}`);

      const result = await createFor(buyer);
      const publicUrl = `http://nfc.plzpingme.com/${result.username}`;

      console.log(`  Username : ${result.username}`);
      console.log(`  Public   : ${publicUrl}`);
      if (result.auth?.created) {
        console.log(`  UID      : ${result.auth.uid}  [NEW]`);
        console.log(`  Password : ${result.auth.password}`);
      } else if (result.auth?.uid) {
        console.log(`  UID      : ${result.auth.uid}  [existing]`);
      }
      if (result.skipped) {
        console.log(`  Status   : SKIPPED (already existed)`);
      } else {
        console.log(`  Status   : CREATED ✓`);
        appendImportResult({
          name: buyer.fullName,
          email: normalizeEmail(buyer.email || ""),
          phone: buyer.phone || "",
          username: result.username,
          company: buyer.companyName || "",
          jobTitle: buyer.jobTitle || "",
          address: buyer.address || "",
          linkedin: buyer.linkedin || "",
          instagram: buyer.instagram || "",
          publicUrl,
          uid: result.auth?.uid || "",
          tempPassword: result.auth?.created ? result.auth.password : "",
        });
      }
    }
    console.log("\n=== All done. ===");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
