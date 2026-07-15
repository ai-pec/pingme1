const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "appServiceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing service account file at scripts/appServiceAccountKey.json");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.appspot.com`
});

const db = getFirestore();
const bucket = getStorage().bucket();

const NEW_DESIGN_NAMES = [
  "Smart KeyChain Tag - Brushed Onyx",
  "Smart KeyChain Tag - Desert Sand",
  "Smart KeyChain Tag - Lavender Mist",
  "Smart KeyChain Tag - Coral Blush",
  "Smart KeyChain Tag - Olive Grove",
  "Smart KeyChain Tag - Cobalt Wave",
  "Smart KeyChain Tag - Stellar Dust"
];

async function run() {
  const newDir = path.join(__dirname, "../public/new");

  if (!fs.existsSync(newDir)) {
    console.error("new folder not found in public/!");
    process.exit(1);
  }

  // Get all JPEG/JPG files
  const files = fs.readdirSync(newDir).filter(f => f.toLowerCase().endsWith(".jpeg") || f.toLowerCase().endsWith(".jpg"));
  console.log(`Found ${files.length} new photos to upload.`);

  if (files.length === 0) {
    console.error("No JPEGs found in public/new!");
    process.exit(1);
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const localPath = path.join(newDir, file);
    const fileBuffer = fs.readFileSync(localPath);

    // Give it a clean and unique name in Firebase Storage
    const timestamp = Date.now();
    const safeFileName = `smart_keychain_new_${i + 1}_${timestamp}.jpeg`;
    const storagePath = `products/smart-keychain-tags/${safeFileName}`;

    console.log(`Uploading ${file} to Firebase Storage as ${storagePath}...`);

    const fileRef = bucket.file(storagePath);
    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public,max-age=31536000,immutable"
      }
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

    const designName = NEW_DESIGN_NAMES[i] || `Smart KeyChain Tag - Premium Design ${i + 1}`;
    const productId = db.collection("products").doc().id;

    console.log(`Saving product document: "${designName}"...`);
    await db.collection("products").doc(productId).set({
      id: productId,
      categorySlug: "smart-keychain-tags",
      title: designName,
      price: "₹149",
      originalPrice: "₹299",
      image: downloadUrl,
      images: [downloadUrl],
      emoji: "🔑",
      popular: false,
      features: [
        "Durable waterproof build",
        "Scratch-resistant high-gloss finish",
        "No app required to scan or register",
        "Encrypted owner messaging system"
      ],
      disabled: false,
      createdAt: FieldValue.serverTimestamp()
    });
  }

  console.log("\nSuccessfully added all new keychain products!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
