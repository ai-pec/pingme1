const crypto = require("crypto");
const cors = require("cors");
const Razorpay = require("razorpay");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");

const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_FROM = defineSecret("SMTP_FROM");
const NFC_CARD_PROJECT_ID = defineSecret("NFC_CARD_PROJECT_ID");
const NFC_CARD_DATABASE_URL = defineSecret("NFC_CARD_DATABASE_URL");
const NFC_CARD_COLLECTION = defineSecret("NFC_CARD_COLLECTION");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const corsHandler = cors({ origin: true });
let nfcCardDb = null;

const getCount = async (collectionRef, queryConstraints = []) => {
  let queryRef = collectionRef;
  for (const constraint of queryConstraints) {
    queryRef = queryRef.where(constraint.field, constraint.op, constraint.value);
  }

  const snapshot = await queryRef.get();
  return snapshot.size;
};


const getMailTransporter = () => {
  const host = (SMTP_HOST.value() || process.env.SMTP_HOST || "").trim();
  const port = Number((SMTP_PORT.value() || process.env.SMTP_PORT || "587").trim());
  const user = (SMTP_USER.value() || process.env.SMTP_USER || "").trim();
  const pass = (SMTP_PASS.value() || process.env.SMTP_PASS || "").trim();

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const normalizeNfcUsername = (rawUsername = "") => rawUsername.trim().toLowerCase();

const sanitizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const getNfcCardCollectionName = () => {
  const fromSecret = (NFC_CARD_COLLECTION.value() || process.env.NFC_CARD_COLLECTION || "").trim();
  return fromSecret || "publicNfcProfiles";
};

const getNfcCardFirestore = () => {
  if (nfcCardDb) {
    return nfcCardDb;
  }

  const projectId = (NFC_CARD_PROJECT_ID.value() || process.env.NFC_CARD_PROJECT_ID || "").trim();
  const databaseURL = (NFC_CARD_DATABASE_URL.value() || process.env.NFC_CARD_DATABASE_URL || "").trim();

  if (!projectId) {
    throw new Error("NFC Card project id is not configured.");
  }

  const appName = "nfc-card-project";
  const existing = admin.apps.find((app) => app.name === appName);
  const app = existing || admin.initializeApp(
    {
      projectId,
      ...(databaseURL ? { databaseURL } : {}),
    },
    appName
  );

  nfcCardDb = app.firestore();
  return nfcCardDb;
};

const buildPublicNfcProfilePayload = ({ profileId, profile }) => {
  const normalizedUsername = normalizeNfcUsername(profile?.username || "");
  const fallbackUsername = normalizeNfcUsername(`profile-${String(profileId || "").slice(0, 8)}`);
  const username = normalizedUsername || fallbackUsername;

  return {
    orderId: sanitizeText(String(profileId || "")),
    username,
    name: sanitizeText(profile?.name || ""),
    ...(profile?.companyName ? { companyName: sanitizeText(profile.companyName) } : {}),
    ...(profile?.jobTitle ? { jobTitle: sanitizeText(profile.jobTitle) } : {}),
    ...(profile?.email ? { email: sanitizeText(profile.email) } : {}),
    ...(profile?.phone ? { phone: sanitizeText(profile.phone) } : {}),
    ...(profile?.bio ? { bio: sanitizeText(profile.bio) } : {}),
    ...(profile?.businessTags ? { businessTags: sanitizeText(profile.businessTags) } : {}),
    ...(profile?.website ? { website: sanitizeText(profile.website) } : {}),
    ...(profile?.address ? { address: sanitizeText(profile.address) } : {}),
    ...(profile?.linkedin ? { linkedin: sanitizeText(profile.linkedin) } : {}),
    ...(profile?.twitter ? { twitter: sanitizeText(profile.twitter) } : {}),
    ...(profile?.instagram ? { instagram: sanitizeText(profile.instagram) } : {}),
    ...(profile?.youtube ? { youtube: sanitizeText(profile.youtube) } : {}),
    ...(profile?.facebook ? { facebook: sanitizeText(profile.facebook) } : {}),
    ...(profile?.profilePhoto ? { profilePhoto: sanitizeText(profile.profilePhoto) } : {}),
    ...(Array.isArray(profile?.projects)
      ? {
          projects: profile.projects
            .filter((project) => project && sanitizeText(project.name))
            .map((project) => ({
              name: sanitizeText(project.name),
              ...(project.description ? { description: sanitizeText(project.description) } : {}),
              ...(project.link ? { link: sanitizeText(project.link) } : {}),
              ...(project.photo ? { photo: sanitizeText(project.photo) } : {}),
            })),
        }
      : {}),
  };
};

const syncProfileToNfcCardProject = async ({ profileId, profile, source = "unknown" }) => {
  if (!profileId || !profile) {
    return { synced: false, reason: "Missing profileId or profile" };
  }

  const payload = buildPublicNfcProfilePayload({ profileId, profile });
  if (!payload.name) {
    return { synced: false, reason: "Profile name is required" };
  }

  const targetDb = getNfcCardFirestore();
  const targetCollection = getNfcCardCollectionName();
  const targetRef = targetDb.collection(targetCollection).doc(String(profileId));

  await targetRef.set(
    {
      ...payload,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedSource: source,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { synced: true, username: payload.username };
};

const sendBookingConfirmationEmail = async ({ email, fullName, bookingId, items, totalAmount }) => {
  if (!email) {
    return;
  }

  const transporter = getMailTransporter();
  const fromEmail = (
    SMTP_FROM.value() ||
    SMTP_USER.value() ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    ""
  ).trim();

  if (!transporter || !fromEmail) {
    console.warn("Booking confirmation email skipped due to missing SMTP configuration.");
    return;
  }

  const itemsLabel = Array.isArray(items) && items.length
    ? items.map((item) => `${item?.title || "Item"} x${item?.quantity || 1}`).join(", ")
    : "-";

  const totalLabel = Number(totalAmount || 0).toFixed(2);

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `Booking Confirmed - ${bookingId}`,
    text: [
      `Hi ${fullName || "Customer"},`,
      "",
      "Your booking is confirmed.",
      `Booking ID: ${bookingId}`,
      `Items: ${itemsLabel}`,
      `Total Paid: INR ${totalLabel}`,
      "",
      "Thank you for choosing PingME.",
    ].join("\n"),
    html: `
      <p>Hi ${fullName || "Customer"},</p>
      <p>Your booking is confirmed.</p>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      <p><strong>Items:</strong> ${itemsLabel}</p>
      <p><strong>Total Paid:</strong> INR ${totalLabel}</p>
      <p>Thank you for choosing PingME.</p>
    `,
  });
};

const getRazorpayClient = () => {
  const keyId = (RAZORPAY_KEY_ID.value() || process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (RAZORPAY_KEY_SECRET.value() || process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured in Cloud Functions env.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

exports.createOrder = onRequest({
  region: "asia-south1",
  secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET],
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { amount, currency = "INR", receipt, notes = {} } = req.body || {};

      if (!amount || Number.isNaN(Number(amount))) {
        res.status(400).send("Valid amount is required.");
        return;
      }

      const razorpay = getRazorpayClient();
      const order = await razorpay.orders.create({
        amount: Number(amount),
        currency,
        receipt: receipt || `pingme_${Date.now()}`,
        notes,
      });

      res.status(200).json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      });
    } catch (error) {
      console.error("createOrder error", error);
      res.status(500).send("Failed to create order.");
    }
  });
});

exports.getPublicStats = onRequest({
  region: "asia-south1",
}, async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const [happyCustomers, vehiclesProtected] = await Promise.all([
        getCount(db.collection("users")),
        getCount(db.collection("booking"), [
          { field: "status", op: "==", value: "confirmed" },
        ]),
      ]);

      res.status(200).json({
        happyCustomers,
        vehiclesProtected,
        citiesCovered: 0,
        googleRating: 0,
        installCount: 0,
      });
    } catch (error) {
      console.error("getPublicStats error", error);
      res.status(500).send("Failed to load public stats.");
    }
  });
});

exports.verifyPayment = onRequest({
  region: "asia-south1",
  secrets: [
    RAZORPAY_KEY_SECRET,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    NFC_CARD_PROJECT_ID,
    NFC_CARD_DATABASE_URL,
    NFC_CARD_COLLECTION,
  ],
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { orderId, paymentId, signature, prebooking } = req.body || {};

      if (!orderId || !paymentId || !signature || !prebooking) {
        res.status(400).send("Missing required payment verification fields.");
        return;
      }

      const keySecret = (RAZORPAY_KEY_SECRET.value() || process.env.RAZORPAY_KEY_SECRET || "").trim();
      if (!keySecret) {
        res.status(500).send("Razorpay secret is not configured.");
        return;
      }

      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (expectedSignature !== signature) {
        res.status(400).send("Invalid payment signature.");
        return;
      }

      const paymentData = {
        orderId,
        paymentId,
        signature,
        gateway: "razorpay",
        amount: prebooking?.payment?.amount || null,
        currency: prebooking?.payment?.currency || "INR",
        userId: prebooking?.userId || null,
        email: prebooking?.email || null,
        status: "captured",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("payments").add(paymentData);

      const prebookingData = {
        ...prebooking,
        status: "confirmed",
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const bookingRef = db.collection("booking").doc();
      const legacyPrebookingRef = db.collection("prebookings").doc(bookingRef.id);

      await Promise.all([
        bookingRef.set(prebookingData),
        legacyPrebookingRef.set(prebookingData, { merge: true }),
      ]);

      if (prebooking?.nfcProfile) {
        try {
          await syncProfileToNfcCardProject({
            profileId: orderId,
            profile: prebooking.nfcProfile,
            source: "verifyPayment",
          });
        } catch (syncErr) {
          console.error("verifyPayment nfc sync error", syncErr);
        }
      }

      try {
        await sendBookingConfirmationEmail({
          email: prebooking?.email,
          fullName: prebooking?.fullName,
          bookingId: bookingRef.id,
          items: prebooking?.items,
          totalAmount: prebooking?.totalAmount,
        });
      } catch (mailErr) {
        console.error("booking confirmation email error", mailErr);
      }

      res.status(200).json({
        success: true,
        prebookingId: bookingRef.id,
      });
    } catch (error) {
      console.error("verifyPayment error", error);
      res.status(500).send("Failed to verify payment.");
    }
  });
});

exports.syncNfcProfileDraft = onRequest({
  region: "asia-south1",
  secrets: [
    NFC_CARD_PROJECT_ID,
    NFC_CARD_DATABASE_URL,
    NFC_CARD_COLLECTION,
  ],
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { profileId, nfcProfile } = req.body || {};

      if (!profileId || !nfcProfile) {
        res.status(400).send("profileId and nfcProfile are required.");
        return;
      }

      const result = await syncProfileToNfcCardProject({
        profileId,
        profile: nfcProfile,
        source: "prePaymentDraft",
      });

      if (!result.synced) {
        res.status(400).send(result.reason || "Unable to sync profile.");
        return;
      }

      res.status(200).json({
        success: true,
        username: result.username,
      });
    } catch (error) {
      console.error("syncNfcProfileDraft error", error);
      res.status(500).send("Failed to sync NFC profile.");
    }
  });
});

exports.getPublicNfcProfile = onRequest({
  region: "asia-south1",
  secrets: [
    NFC_CARD_PROJECT_ID,
    NFC_CARD_DATABASE_URL,
    NFC_CARD_COLLECTION,
  ],
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const username = normalizeNfcUsername(String(req.query?.username || ""));
      if (!username) {
        res.status(400).send("username query param is required.");
        return;
      }

      const targetDb = getNfcCardFirestore();
      const targetCollection = getNfcCardCollectionName();
      const snapshot = await targetDb
        .collection(targetCollection)
        .where("username", "==", username)
        .limit(1)
        .get();

      if (snapshot.empty) {
        res.status(404).send("Profile not found.");
        return;
      }

      const profile = snapshot.docs[0].data();
      res.status(200).json({ profile });
    } catch (error) {
      console.error("getPublicNfcProfile error", error);
      res.status(500).send("Failed to load public NFC profile.");
    }
  });
});

exports.syncBookingNfcProfileToNfcCard = onDocumentUpdated({
  document: "booking/{bookingId}",
  region: "asia-south1",
  secrets: [
    NFC_CARD_PROJECT_ID,
    NFC_CARD_DATABASE_URL,
    NFC_CARD_COLLECTION,
  ],
}, async (event) => {
  const after = event.data?.after?.data();
  if (!after?.nfcProfile) return;

  const profileId = after?.payment?.orderId || event.params?.bookingId;
  if (!profileId) return;

  try {
    await syncProfileToNfcCardProject({
      profileId,
      profile: after.nfcProfile,
      source: "bookingUpdateTrigger",
    });
  } catch (error) {
    console.error("syncBookingNfcProfileToNfcCard error", error);
  }
});

exports.syncLegacyPrebookingNfcProfileToNfcCard = onDocumentUpdated({
  document: "prebookings/{prebookingId}",
  region: "asia-south1",
  secrets: [
    NFC_CARD_PROJECT_ID,
    NFC_CARD_DATABASE_URL,
    NFC_CARD_COLLECTION,
  ],
}, async (event) => {
  const after = event.data?.after?.data();
  if (!after?.nfcProfile) return;

  const profileId = after?.payment?.orderId || event.params?.prebookingId;
  if (!profileId) return;

  try {
    await syncProfileToNfcCardProject({
      profileId,
      profile: after.nfcProfile,
      source: "legacyPrebookingUpdateTrigger",
    });
  } catch (error) {
    console.error("syncLegacyPrebookingNfcProfileToNfcCard error", error);
  }
});
