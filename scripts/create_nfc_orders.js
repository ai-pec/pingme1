const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing service account file at scripts/serviceAccountKey.json");
  console.error("Create a service account JSON and place it at scripts/serviceAccountKey.json");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
const { credential } = require("firebase-admin");
admin.initializeApp({ credential: credential.cert(serviceAccount) });
const db = admin.firestore();

const buyers = [
  { fullName: "Tanu Sethi", companyName: "Suragraj Builders", jobTitle: "", phone: "7988080907", email: "sethitanu111@gmail.com", username: "tanusethi" },
  { fullName: "Vaibhav Tungal", companyName: "Tungal's Food production Unit", jobTitle: "Founder", phone: "6230413909", email: "solanse1999@gmail.com", username: "vaibhavtungal" },
  { fullName: "Avinash Kumar", companyName: "AA GROUP", jobTitle: "Founder", phone: "9679106661", email: "Avinashkumar361@gmail.com", username: "avinashkumar" },
  { fullName: "Sneha Goyal", companyName: "Atior Technologies", jobTitle: "", phone: "7888305641", email: "snehagoyal2690@gmail.com", username: "snehagoyal" },
  { fullName: "Nitin Goyal", companyName: "ITGripe Foundation", jobTitle: "", phone: "8427478157", email: "nitingoyal.er@gmail.com", username: "nitingoyal" },
  { fullName: "Harjeet Singh", companyName: "Falconview Management Pvt Ltd", jobTitle: "Founder", phone: "9212102877", email: "harjeetsingh@thefvm.in", username: "harjeetsingh" },
  { fullName: "Ayesha", companyName: "AK Resin Store", jobTitle: "Founder", phone: "7009461712", email: "ak.resinstore@gmail.com", username: "ayesha_akresinstore" },
  { fullName: "Puneet Madan", companyName: "—", jobTitle: "Artist", phone: "9888265500", email: "puneetkmadan@yahoo.com", username: "puneetmadan" },
  { fullName: "Krishan Kumar", companyName: "Eduplaccers and kkhometuition", jobTitle: "", phone: "7086169646", email: "kk9469530@gmail.com", username: "krishankumar" },
  { fullName: "Gaurav Sharma", companyName: "SHREE JI ENTERPRISES", jobTitle: "Prop", phone: "9872336699", email: "shreejienterprises77@yahoo.com", username: "gauravsharma" },
  { fullName: "Sandeep Ahluwalia", companyName: "Sanvi Capital LLP", jobTitle: "Partner", phone: "8360534656", email: "Investor@sanvicapital.com", username: "sandeepahluwalia" },
  { fullName: "Manish Kumar", companyName: "Kyntix Technology", jobTitle: "Founder", phone: "9478586699", email: "Manish.kyntix@gmail.com", username: "manishkumar" },
  { fullName: "Paramveer Singh", companyName: "Project X", jobTitle: "Co-Founder", phone: "9915366447", email: "pvsingh4747@gmail.com", username: "paramveersingh" },
  { fullName: "Muhammad Shahbaz", companyName: "Rezon Studio", jobTitle: "CEO, Brand Strategist", phone: "7696690079", email: "mhshahbazrzn@gmail.com", username: "muhammadshahbaz", linkedin: "https://www.linkedin.com/in/mh-shahbaz/" },
  { fullName: "Vikas Mittal", companyName: "ERC MAX Ventures Pvt Ltd", jobTitle: "Director", phone: "9216003333", email: "ercmaxworld@gmail.com", username: "vikasmittal", address: "SCO 69, level 2, Sector 17D Chandigarh 160017", instagram: "https://www.instagram.com/zoogolindia" },
  { fullName: "Appul Jot Virdi", companyName: "Kontent Kai", jobTitle: "Founder", phone: "9814700270", email: "appul.virdi@gmail.com", username: "appuljotvird" },
  { fullName: "Lovepreet Singh", companyName: "Erosius", jobTitle: "Founder & CEO", phone: "8168510617", email: "erophilous@gmail.com", username: "lovepreetsingh", instagram: "https://www.instagram.com/erosius_" },
  { fullName: "Neeta Basile", companyName: "", jobTitle: "", phone: "+1 (301) 514-0198", email: "", username: "neetabasile" },
  { fullName: "Inder Mohan Kahlon", companyName: "", jobTitle: "", phone: "+91 95606 76669", email: "indermohan.kahlon@gmail.com", username: "indermohankahlon", address: "SUA122, DLF THE SUMMIT, Park Drive, Sector 54, Gurgaon" },
  { fullName: "Simar Preet Kahlon", companyName: "Nestlé India Limited", jobTitle: "Market SHE Manager", phone: "+91-124-3321448", email: "simarpreet.kahlon@in.nestle.com", username: "simarpreetkahlon", address: "Nestlé House, Jacaranda Marg, 'M' Block, DLF City, Phase - II, Gurugram - 122002, Haryana" },
];

const NFC_ITEM_ID = "nfc-card-default";
const NFC_ITEM_TITLE = "NFC Card";
const NFC_ITEM_PRICE = 349;

const normalizeUsername = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
const normalizeEmail = (e) => String(e || "").trim().toLowerCase();

const crypto = require('crypto');

const generateTempPassword = () => {
  return crypto.randomBytes(6).toString('base64').replace(/\W/g, 'A') + '1a!';
};

async function ensureAuthUser(email, fullName) {
  if (!email) return { uid: null, created: false, password: null };
  try {
    const user = await admin.auth().getUserByEmail(email);
    return { uid: user.uid, created: false, password: null };
  } catch (err) {
    // create user
    const tempPassword = generateTempPassword();
    const userRecord = await admin.auth().createUser({
      email,
      emailVerified: false,
      password: tempPassword,
      displayName: fullName || undefined,
    });
    return { uid: userRecord.uid, created: true, password: tempPassword };
  }
}

async function createFor(buyer) {
  const email = normalizeEmail(buyer.email || '');
  const username = normalizeUsername(buyer.username || buyer.fullName || 'user');

  const authResult = await ensureAuthUser(email, buyer.fullName || '');

  const items = [
    {
      id: NFC_ITEM_ID,
      title: NFC_ITEM_TITLE,
      price: `₹${NFC_ITEM_PRICE}`,
      quantity: 1,
    },
  ];

  const totalAmount = NFC_ITEM_PRICE;

  const bookingData = {
    items,
    totalAmount,
    fullName: buyer.fullName || '',
    email: email || '',
    phone: buyer.phone || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    status: 'confirmed',
    userId: authResult.uid || null,
    nfcProfile: {
      username,
      name: buyer.fullName || '',
      companyName: buyer.companyName || '',
      jobTitle: buyer.jobTitle || '',
      email: email || null,
      phone: buyer.phone || null,
      ...(buyer.linkedin ? { linkedin: buyer.linkedin } : {}),
      ...(buyer.instagram ? { instagram: buyer.instagram } : {}),
      ...(buyer.address ? { address: buyer.address } : {}),
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedSource: 'adminImport',
  };

  const bookingRef = await db.collection('booking').add(bookingData);

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
    status: 'confirmed',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedSource: 'adminImport',
  };

  await db.collection('nfcProfiles').doc(bookingRef.id).set(publicProfile, { merge: true });

  return { orderId: bookingRef.id, username: bookingData.nfcProfile.username, auth: authResult };
}

(async () => {
  try {
    for (const buyer of buyers) {
      const result = await createFor(buyer);
      const publicUrl = `https://plzpingme.com/${result.username}`;
      console.log('----------------------------------------');
      console.log(`Name: ${buyer.fullName}`);
      console.log(`Email: ${normalizeEmail(buyer.email || '')}`);
      console.log(`Username: ${result.username}`);
      console.log(`Public link: ${publicUrl}`);
      if (result.auth && result.auth.created) {
        console.log(`Auth user created — UID: ${result.auth.uid} — Temp password: ${result.auth.password}`);
      } else if (result.auth && result.auth.uid) {
        console.log(`Existing auth user — UID: ${result.auth.uid}`);
      }
    }
    console.log('All done.');
    process.exit(0);
  } catch (err) {
    console.error('Error importing buyers:', err);
    process.exit(1);
  }
})();