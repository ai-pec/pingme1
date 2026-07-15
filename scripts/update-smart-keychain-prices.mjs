import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

// Initialize Firebase (replace with your config)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateSmartKeychainPrices() {
  try {
    console.log('Starting price update for Smart Keychain Tags...');

    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('categorySlug', '==', 'smart-keychain-tags'));
    const snapshot = await getDocs(q);

    console.log(`Found ${snapshot.size} Smart Keychain Tag products`);

    const batch = writeBatch(db);
    let updateCount = 0;

    snapshot.forEach((docSnapshot) => {
      const productRef = doc(db, 'products', docSnapshot.id);
      batch.update(productRef, {
        price: '₹499',
        updatedAt: serverTimestamp(),
      });
      updateCount++;
      console.log(`  ✓ Updated: ${docSnapshot.data().title}`);
    });

    await batch.commit();
    console.log(`\n✅ Successfully updated ${updateCount} products to ₹499`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating prices:', error);
    process.exit(1);
  }
}

updateSmartKeychainPrices();
