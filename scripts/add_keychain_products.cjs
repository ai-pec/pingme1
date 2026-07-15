
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing service account file at scripts/serviceAccountKey.json");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
});

const db = getFirestore();
const bucket = getStorage().bucket();

const DESIGN_NAMES = [
  "Smart KeyChain Tag - Classic Gold",
  "Smart KeyChain Tag - Noir Onyx",
  "Smart KeyChain Tag - Royal Navy",
  "Smart KeyChain Tag - Crimson Velvet",
  "Smart KeyChain Tag - Emerald Silk",
  "Smart KeyChain Tag - Marble Blush",
  "Smart KeyChain Tag - Midnight Stellar",
  "Smart KeyChain Tag - Sage Mist",
  "Smart KeyChain Tag - Amber Horizon",
  "Smart KeyChain Tag - Arctic Frost",
  "Smart KeyChain Tag - Shadow Matte",
  "Smart KeyChain Tag - Aurora Glow"
];

async function run() {
  const keychainDir = path.join(__dirname, "../public/keychain");

  if (!fs.existsSync(keychainDir)) {
    console.error("keychain folder not found in public/");
    process.exit(1);
  }

  // Get all files
  const files = fs.readdirSync(keychainDir).filter(f => f.toLowerCase().endsWith(".jpeg") || f.toLowerCase().endsWith(".jpg"));
  console.log(`Found ${files.length} photos to upload.`);

  if (files.length === 0) {
    console.error("No JPEGs found in public/keychain!");
    process.exit(1);
  }

  console.log("Setting up category: smart-keychain-tags...");
  await db.collection("productCategories").doc("smart-keychain-tags").set({
    name: "Smart KeyChain Tags",
    slug: "smart-keychain-tags",
    description: "Attach to your keys, wallet, or backpack. A quick scan allows finders to reach you instantly and privately.",
    icon: "🔑",
    gradient: "linear-gradient(135deg, #c9a96e 0%, #1a1410 100%)"
  }, { merge: true });

  let firstImageUrl = "";

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const localPath = path.join(keychainDir, file);
    const fileBuffer = fs.readFileSync(localPath);

    const indexStr = String(i + 1).padStart(2, "0");
    const safeFileName = `smart_keychain_${indexStr}.jpeg`;
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

    if (i === 0) {
      firstImageUrl = downloadUrl;
    }

    const designName = DESIGN_NAMES[i] || `Smart KeyChain Tag - Design ${i + 1}`;
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
      popular: i === 0 || i === 2 || i === 5,
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

  if (firstImageUrl) {
    console.log("Setting category cover image...");
    await db.collection("productCategories").doc("smart-keychain-tags").update({
      coverImage: firstImageUrl
    });
  }

  console.log("\nSuccessfully completed all product creations!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
