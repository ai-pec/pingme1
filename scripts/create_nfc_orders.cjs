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
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
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
  { fullName: "Radhika Gandhi", companyName: "ARB Technologies Export", jobTitle: "", phone: "8968579049", email: "r60921@gmail.com", username: "radhikagandhi" },
  { fullName: "Sukhveer Kaur", companyName: "Kyntix Technology", jobTitle: "Co-Founder", phone: "7743038233", email: "sukhveer.kyntix@gmail.com", username: "sukhveenskaur" },
  { fullName: "Tarun Sadana", companyName: "Kimoha Technologies Pvt Ltd", jobTitle: "CEO CUM FOUNDER", phone: "9888989333", email: "tarunsadana27@gmail.com", username: "tarunsadana" },
  { fullName: "Sukhveer Singh", companyName: "Punjab National Bank", jobTitle: "Chief Faculty", phone: "9910572007", email: "sukhveersingh@pnb.bank.in", username: "sukhveersingh" },
  { fullName: "Sahil Singhal", companyName: "Arium Spaces P. Ltd", jobTitle: "Founder", phone: "9779117666", email: "sahil@ariumspaces.com", username: "sahilsinghal" },
  { fullName: "Arjun Sharma", companyName: "Future Estates", jobTitle: "", phone: "7092087755", email: "arjun1998sharma@gmail.com", username: "arjunsharma" },
  { fullName: "Chandan Sanwal", companyName: "Chandigarh Bytes and Social Watch", jobTitle: "Founder and CEO", phone: "7888862176", email: "sanwal@socialwatch.io", username: "chandansanwal" },
  { fullName: "Raheesh Puri", companyName: "RN Associates", jobTitle: "Tax Professional", phone: "9041109399", email: "rnassociates156@gmail.com", username: "raheeshpuri" },
  { fullName: "Suresh Chawla", companyName: "Indicore Infocomm Pvt Ltd", jobTitle: "CEO", phone: "7355111456", email: "Suresh@indicore.in", username: "sureshchawla" },
  { fullName: "Keshav Nabh", companyName: "Project X", jobTitle: "Co-founder", phone: "9115775586", email: "keshav.nabh.123@gmail.com", username: "keshavnabh" },
  { fullName: "Jasmine Sharma", companyName: "", jobTitle: "PhD student and marketing strategist", phone: "7973203927", email: "Jasmine.sharma.career@gmail.com", username: "jasminesharma" },
  {
    fullName: "Adarsh Kumar Pandey",
    companyName: "Coding Bits Pvt Ltd / RURBOO / BrandCrexa",
    jobTitle: "Founder & CEO",
    phone: "8810220691",
    email: "adarshpandey@codingbits.in",
    username: "adarshkumarpandey",
  },
  { fullName: "Gaurav Sethi", companyName: "PATFUTURE", jobTitle: "Founder", phone: "9354836779", email: "patfuture.pt@gmail.com", username: "gauravsethi" },
  { fullName: "Saddam Hashmi", companyName: "Pragma Quant", jobTitle: "Consultant", phone: "7089919929", email: "saddam@pragmaquant.com", username: "saddamhashmi" },
  { fullName: "Ujjwal Dhawan", companyName: "StartWell Nutrition", jobTitle: "", phone: "8264480902", email: "ujjwaldhawan1003@gmail.com", username: "ujjwaldhawan" },
  { fullName: "Shivam Kumar", companyName: "Challenge App", jobTitle: "Co founder", phone: "7061617414", email: "shivam.friendly@gmail.com", username: "shivamkumar" },
  { fullName: "Tarandeep Singh", companyName: "Unique Scince Class, Mansa", jobTitle: "Professor", phone: "9517173841", email: "", username: "tarandeepsingh" },
  { fullName: "Sachin Singh", companyName: "PASAPI Tech Solutions Pvt Ltd / Tbonyds - Tricity Businesses On Your Doors", jobTitle: "Founder/Director", phone: "7710611913", email: "sachin.singh@pasapi.com", username: "sachinsingh" },
  { fullName: "Dr. Pawan Garg", companyName: "Education & Career Counciling", jobTitle: "Mentor", phone: "9466068185", email: "dr.pawangarg12@gmail.com", username: "drpawangarg" },
  { fullName: "Dr. Asha Garg", companyName: "Education & Career Counciling", jobTitle: "Mentor", phone: "9416167565", email: "ashagarg16@gmail.com", username: "drashagarg" },
  { fullName: "Muhammad Shahbaz", companyName: "Rezon Studio", jobTitle: "CEO, Brand Strategist", phone: "7696690079", email: "mhshahbazrzn@gmail.com", username: "muhammadshahbaz", linkedin: "https://www.linkedin.com/in/mh-shahbaz/" },
  { fullName: "Vikas Mittal", companyName: "ERC MAX Ventures Pvt Ltd", jobTitle: "Director", phone: "9216003333", email: "ercmaxworld@gmail.com", username: "vikasmittal", address: "SCO 69, level 2, Sector 17D Chandigarh 160017", instagram: "https://www.instagram.com/zoogolindia" },
  { fullName: "Appul Jot Virdi", companyName: "Kontent Kai", jobTitle: "Founder", phone: "9814700270", email: "appul.virdi@gmail.com", username: "appuljotvirdi" },
  { fullName: "Lovepreet Singh", companyName: "Erosius", jobTitle: "Founder & CEO", phone: "8168510617", email: "erophilous@gmail.com", username: "lovepreetsingh", instagram: "https://www.instagram.com/erosius_" },
];

const NFC_ITEM_ID = "nfc-card-default";
const NFC_ITEM_TITLE = "NFC Card";
const NFC_ITEM_PRICE = 349;

const normalizeUsername = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
const normalizeEmail = (e) => String(e || "").trim().toLowerCase();

const crypto = require('crypto');
const importResultsPath = path.join(__dirname, 'import-results.csv');

const generateTempPassword = () => {
  return crypto.randomBytes(6).toString('base64').replace(/\W/g, 'A') + '1a!';
};

async function ensureAuthUser(email, fullName) {
  if (!email) return { uid: null, created: false, password: null };
  try {
    const user = await admin.auth().getUserByEmail(email);
    return { uid: user.uid, created: false, password: null };
  } catch (err) {
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

  const existingBookingByEmail = await db.collection('booking').where('email', '==', email).limit(1).get();
  if (!existingBookingByEmail.empty) {
    const existingDoc = existingBookingByEmail.docs[0];
    const existingData = existingDoc.data() || {};
    return {
      skipped: true,
      orderId: existingDoc.id,
      username: normalizeUsername(existingData?.nfcProfile?.username || username),
      auth: { uid: existingData.userId || null, created: false, password: null },
    };
  }

  const existingBookingByUsername = await db.collection('booking').where('nfcProfile.username', '==', username).limit(1).get();
  if (!existingBookingByUsername.empty) {
    const existingDoc = existingBookingByUsername.docs[0];
    const existingData = existingDoc.data() || {};
    return {
      skipped: true,
      orderId: existingDoc.id,
      username: normalizeUsername(existingData?.nfcProfile?.username || username),
      auth: { uid: existingData.userId || null, created: false, password: null },
    };
  }

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

function appendImportResult(row) {
  const header = 'Name,Email,Username,Public link,UID,Temp password\n';
  const line = [
    row.name,
    row.email,
    row.username,
    row.publicUrl,
    row.uid,
    row.tempPassword,
  ].join(',') + '\n';

  if (!fs.existsSync(importResultsPath)) {
    fs.writeFileSync(importResultsPath, header + line, 'utf8');
    return;
  }

  const current = fs.readFileSync(importResultsPath, 'utf8');
  if (!current.includes(line.trim())) {
    fs.appendFileSync(importResultsPath, line, 'utf8');
  }
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
      } else if (result.auth && result.auth.uid && result.skipped) {
        console.log(`Existing auth user — UID: ${result.auth.uid}`);
      } else if (result.auth && result.auth.uid) {
        console.log(`Existing auth user — UID: ${result.auth.uid}`);
      }
      if (!result.skipped) {
        appendImportResult({
          name: buyer.fullName,
          email: normalizeEmail(buyer.email || ''),
          username: result.username,
          publicUrl,
          uid: result.auth && result.auth.uid ? result.auth.uid : '',
          tempPassword: result.auth && result.auth.created ? result.auth.password : '',
        });
      }
    }
    console.log('All done.');
    process.exit(0);
  } catch (err) {
    console.error('Error importing buyers:', err);
    process.exit(1);
  }
})();
