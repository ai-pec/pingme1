const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Missing service account file at scripts/serviceAccountKey.json');
  console.error('Create a service account JSON and place it at scripts/serviceAccountKey.json');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

async function run() {
  // Unique test email so repeated runs don't collide
  const testEmail = `test.link.${Date.now()}@example.com`;

  console.log('Using test email:', testEmail);

  // Create a booking without userId
  const bookingData = {
    items: [{ id: 'nfc-card-default', title: 'NFC Card', price: '₹349', quantity: 1 }],
    totalAmount: 349,
    fullName: 'Test Link User',
    email: testEmail,
    phone: '9999999999',
    address: '',
    city: '',
    state: '',
    pincode: '',
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedSource: 'test_helper',
  };

  const bookingRef = await db.collection('booking').add(bookingData);
  console.log('Created booking', bookingRef.id);

  // Create an auth user with same email
  const userRecord = await auth.createUser({
    email: testEmail,
    emailVerified: false,
    password: 'TestPass123!',
  });
  console.log('Created auth user', userRecord.uid);

  // Simulate linking logic: find bookings by email and set userId
  const snapshot = await db.collection('booking').where('email', '==', testEmail).get();
  if (snapshot.empty) {
    console.error('No bookings found for test email');
  } else {
    const batch = db.batch();
    snapshot.forEach((doc) => batch.update(doc.ref, { userId: userRecord.uid }));
    await batch.commit();
    console.log(`Linked ${snapshot.size} booking(s) to user ${userRecord.uid}`);
  }

  // Verify
  const updated = await db.collection('booking').doc(bookingRef.id).get();
  console.log('Updated booking data:', updated.data());

  // Cleanup: remove booking and delete user
  await db.collection('booking').doc(bookingRef.id).delete();
  await auth.deleteUser(userRecord.uid);
  console.log('Cleanup done. Test successful.');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
