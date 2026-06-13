"use strict";

const crypto = require("crypto");
const cors = require("cors");
const Razorpay = require("razorpay");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { buildInvoiceDataFromPrebooking, buildInvoicePdfBuffer } = require("./invoiceUtils");
const { buildInvoiceEmailHtml } = require("./invoiceEmail");

// ─── Secrets ──────────────────────────────────────────────────────────────────

const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_FROM = defineSecret("SMTP_FROM");

// ─── Firebase init ────────────────────────────────────────────────────────────

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ─── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://plzpingme.com",
  "https://www.plzpingme.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "http://localhost:8081",
];

const isPrivateNetworkIP = (origin) => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
      return true;
    }
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)\d+\.\d+/.test(hostname)) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      ALLOWED_ORIGINS.indexOf(origin) !== -1 ||
      origin.endsWith(".web.app") ||
      origin.endsWith(".firebaseapp.com") ||
      isPrivateNetworkIP(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const NFC_PROFILES_COLLECTION = "nfcProfiles";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCount = async (collectionRef, queryConstraints = []) => {
  let queryRef = collectionRef;
  for (const constraint of queryConstraints) {
    queryRef = queryRef.where(constraint.field, constraint.op, constraint.value);
  }
  const snapshot = await queryRef.get();
  return snapshot.size;
};

const normalizeUsername = (value) => String(value || "").trim().toLowerCase();

const asOptionalText = (value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
};

const mapProjects = (projectsValue) => {
  if (!Array.isArray(projectsValue)) return undefined;
  const projects = projectsValue
    .filter((project) => project && typeof project === "object")
    .map((project) => {
      const name = asOptionalText(project.name);
      if (!name) return null;
      return {
        name,
        description: asOptionalText(project.description),
        link: asOptionalText(project.link),
        photo: asOptionalText(project.photo),
        type: asOptionalText(project.type),
      };
    })
    .filter(Boolean);
  return projects.length > 0 ? projects : undefined;
};

const mapDocuments = (documentsValue) => {
  if (!Array.isArray(documentsValue)) return undefined;
  const documents = documentsValue
    .filter((doc) => doc && typeof doc === "object")
    .map((doc) => {
      const title = asOptionalText(doc.title);
      const url = asOptionalText(doc.url);
      if (!title || !url) return null;
      return {
        title,
        url,
        type: asOptionalText(doc.type),
      };
    })
    .filter(Boolean);
  return documents.length > 0 ? documents : undefined;
};

const mapDocToPublicProfileCandidate = (docSnap) => {
  const data = docSnap.data() || {};
  const nfcProfile = data.nfcProfile && typeof data.nfcProfile === "object" ? data.nfcProfile : null;
  if (!nfcProfile) return null;

  const username = normalizeUsername(nfcProfile.username);
  if (!username) return null;

  const profile = {
    orderId: docSnap.id,
    username,
    name: asOptionalText(nfcProfile.name) || asOptionalText(data.fullName) || username,
    companyName: asOptionalText(nfcProfile.companyName),
    jobTitle: asOptionalText(nfcProfile.jobTitle),
    email: asOptionalText(nfcProfile.email) || asOptionalText(data.email),
    phone: asOptionalText(nfcProfile.phone) || asOptionalText(data.phone),
    bio: asOptionalText(nfcProfile.bio),
    businessOverview: asOptionalText(nfcProfile.businessOverview),
    businessTags: asOptionalText(nfcProfile.businessTags),
    website: asOptionalText(nfcProfile.website),
    address: asOptionalText(nfcProfile.address),
    companyAddress: asOptionalText(nfcProfile.companyAddress),
    googleMapsLink: asOptionalText(nfcProfile.googleMapsLink),
    linkedin: asOptionalText(nfcProfile.linkedin),
    twitter: asOptionalText(nfcProfile.twitter),
    instagram: asOptionalText(nfcProfile.instagram),
    youtube: asOptionalText(nfcProfile.youtube),
    facebook: asOptionalText(nfcProfile.facebook),
    profilePhoto: asOptionalText(nfcProfile.profilePhoto),
    upiId: asOptionalText(nfcProfile.upiId),
    razorpayLink: asOptionalText(nfcProfile.razorpayLink),
    appointmentBookingLink: asOptionalText(nfcProfile.appointmentBookingLink),
    projects: mapProjects(nfcProfile.projects),
    documents: mapDocuments(nfcProfile.documents),
  };

  return {
    orderId: docSnap.id,
    status: asOptionalText(data.status) || "pending",
    createdAtMillis: toMillis(data.createdAt),
    profile,
  };
};

// ─── Mail transporter ─────────────────────────────────────────────────────────

const getMailTransporter = () => {
  const host = (SMTP_HOST.value() || process.env.SMTP_HOST || "").trim();
  const port = Number((SMTP_PORT.value() || process.env.SMTP_PORT || "587").trim());
  const user = (SMTP_USER.value() || process.env.SMTP_USER || "").trim();
  const pass = (SMTP_PASS.value() || process.env.SMTP_PASS || "").trim();

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

// ─── NFC helpers ──────────────────────────────────────────────────────────────

const normalizeNfcUsername = (rawUsername = "") => rawUsername.trim().toLowerCase();

const sanitizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
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
    ...(profile?.businessOverview ? { businessOverview: sanitizeText(profile.businessOverview) } : {}),
    ...(profile?.businessTags ? { businessTags: sanitizeText(profile.businessTags) } : {}),
    ...(profile?.website ? { website: sanitizeText(profile.website) } : {}),
    ...(profile?.address ? { address: sanitizeText(profile.address) } : {}),
    ...(profile?.companyAddress ? { companyAddress: sanitizeText(profile.companyAddress) } : {}),
    ...(profile?.googleMapsLink ? { googleMapsLink: sanitizeText(profile.googleMapsLink) } : {}),
    ...(profile?.linkedin ? { linkedin: sanitizeText(profile.linkedin) } : {}),
    ...(profile?.twitter ? { twitter: sanitizeText(profile.twitter) } : {}),
    ...(profile?.instagram ? { instagram: sanitizeText(profile.instagram) } : {}),
    ...(profile?.youtube ? { youtube: sanitizeText(profile.youtube) } : {}),
    ...(profile?.facebook ? { facebook: sanitizeText(profile.facebook) } : {}),
    ...(profile?.profilePhoto ? { profilePhoto: sanitizeText(profile.profilePhoto) } : {}),
    ...(profile?.upiId ? { upiId: sanitizeText(profile.upiId) } : {}),
    ...(profile?.razorpayLink ? { razorpayLink: sanitizeText(profile.razorpayLink) } : {}),
    ...(profile?.appointmentBookingLink ? { appointmentBookingLink: sanitizeText(profile.appointmentBookingLink) } : {}),
    ...(Array.isArray(profile?.projects)
      ? {
        projects: profile.projects
          .filter((p) => p && sanitizeText(p.name))
          .map((p) => ({
            name: sanitizeText(p.name),
            ...(p.description ? { description: sanitizeText(p.description) } : {}),
            ...(p.link ? { link: sanitizeText(p.link) } : {}),
            ...(p.photo ? { photo: sanitizeText(p.photo) } : {}),
            ...(p.type ? { type: sanitizeText(p.type) } : {}),
          })),
      }
      : {}),
    ...(Array.isArray(profile?.documents)
      ? {
        documents: profile.documents
          .filter((d) => d && sanitizeText(d.title) && sanitizeText(d.url))
          .map((d) => ({
            title: sanitizeText(d.title),
            url: sanitizeText(d.url),
            ...(d.type ? { type: sanitizeText(d.type) } : {}),
          })),
      }
      : {}),
  };
};

const isConfirmedNfcProfileRecord = (data) => {
  if (!data || typeof data !== "object") return false;
  if (data.status === "confirmed") return true;
  return data.updatedSource && data.updatedSource !== "prePaymentDraft";
};

const syncProfileToNfcProfilesCollection = async ({
  profileId,
  profile,
  source = "unknown",
  status = "confirmed",
}) => {
  if (!profileId || !profile) return { synced: false, reason: "Missing profileId or profile" };

  const payload = buildPublicNfcProfilePayload({ profileId, profile });
  if (!payload.name) return { synced: false, reason: "Profile name is required" };

  const targetRef = db.collection(NFC_PROFILES_COLLECTION).doc(String(profileId));
  await targetRef.set(
    {
      ...payload,
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedSource: source,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { synced: true, username: payload.username };
};

// ─── Booking confirmation email (rich HTML + proper PDF) ──────────────────────

const sendBookingConfirmationEmail = async ({
  email,
  fullName,
  bookingId,
  items,
  totalAmount,
  payment,
  billingAddress,
}) => {
  if (!email) return;

  const transporter = getMailTransporter();
  const fromEmail = (
    SMTP_FROM.value() || SMTP_USER.value() ||
    process.env.SMTP_FROM || process.env.SMTP_USER || ""
  ).trim();

  if (!transporter || !fromEmail) {
    console.warn("Booking confirmation email skipped due to missing SMTP configuration.");
    return;
  }

  // Parse billing address back into parts (best-effort)
  // billingAddress arrives as "street, city, state - pincode"
  const addrParts = (billingAddress || "").split(",").map((s) => s.trim());
  const street = addrParts[0] || "";
  const cityState = addrParts[1] || "";
  const [city = "", statePin = ""] = cityState.split(/\s+-\s+/);
  const [state = "", pincode = ""] = statePin.split(/\s+/);

  // Build structured invoice object
  const prebooking = {
    fullName: fullName || "Customer",
    address: street,
    city: city.trim(),
    state: state.trim(),
    pincode: pincode.trim(),
    items: (items || []).map((item) => ({
      title: item?.title || "Item",
      price: item?.price || 0,
      originalPrice: item?.price || 0,
      quantity: item?.quantity || 1,
    })),
    payment: {
      currency: payment?.currency || "INR",
      orderId: payment?.orderId || bookingId,
      paidAt: new Date().toISOString(),
    },
  };

  const invoice = buildInvoiceDataFromPrebooking(prebooking, {
    invoiceNumber: bookingId,
    paymentMode: payment?.gateway || "Razorpay",
  });

  // Override with actual booking data
  invoice.contact.email = email;
  invoice.billTo.name = fullName || "Customer";
  invoice.shipTo.name = fullName || "Customer";

  const html = buildInvoiceEmailHtml(invoice);
  const pdfBuffer = await buildInvoicePdfBuffer(invoice);

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `Booking Confirmed — ${bookingId}`,
    text: [
      `Hi ${fullName || "Customer"},`,
      "",
      "Your booking is confirmed.",
      `Booking ID: ${bookingId}`,
      `Total Paid: INR ${Number(totalAmount || 0).toFixed(2)}`,
      "",
      "Please find your invoice attached to this email.",
      "",
      "Thank you for choosing PingME.",
    ].join("\n"),
    html,
    attachments: [{
      filename: `pingme-invoice-${bookingId}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    }],
  });
};

// ─── Razorpay client ──────────────────────────────────────────────────────────

const getRazorpayClient = () => {
  const keyId = (RAZORPAY_KEY_ID.value() || process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (RAZORPAY_KEY_SECRET.value() || process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured in Cloud Functions env.");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// ─── Auth helper ──────────────────────────────────────────────────────────────

const authenticate = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const idToken = authHeader.split("Bearer ")[1];
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Authentication failed:", error);
    return null;
  }
};

// ─── Cloud Functions ──────────────────────────────────────────────────────────

exports.createOrder = onRequest({
  region: "asia-south1",
  secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET],
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    let decodedToken = null;
    try {
      decodedToken = await authenticate(req);
    } catch (authErr) {
      console.warn("createOrder: authentication failed, proceeding as guest", authErr);
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
        notes: {
          ...notes,
          userId: decodedToken ? decodedToken.uid : "guest",
          userEmail: decodedToken ? (decodedToken.email || "") : "",
        },
      });

      res.status(200).json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        keyId: (RAZORPAY_KEY_ID.value() || process.env.RAZORPAY_KEY_ID || "").trim(),
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
      const [happyCustomers, vehiclesProtected, installCount] = await Promise.all([
        getCount(db.collection("users")),
        getCount(db.collection("booking"), [
          { field: "status", op: "==", value: "confirmed" },
        ]),
        getCount(db.collection("installs")),
      ]);

      res.status(200).json({
        happyCustomers,
        vehiclesProtected,
        citiesCovered: 0,
        googleRating: 0,
        installCount,
      });
    } catch (error) {
      console.error("getPublicStats error", error);
      res.status(500).send("Failed to load public stats.");
    }
  });
});

exports.trackInstall = onRequest({
  region: "asia-south1",
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const decodedToken = await authenticate(req);
    if (!decodedToken) {
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const { installedAt, userAgent } = req.body || {};

      await db.collection("installs").add({
        installedAt: asOptionalText(installedAt) || new Date().toISOString(),
        userAgent: asOptionalText(userAgent) || "unknown",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("trackInstall error", error);
      res.status(500).send("Failed to track install.");
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
  ],
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const decodedToken = await authenticate(req);
    if (!decodedToken) {
      res.status(401).send("Unauthorized");
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

      if (Array.isArray(prebooking?.nfcLineProfiles) && prebooking.nfcLineProfiles.length > 0) {
        for (const line of prebooking.nfcLineProfiles) {
          if (!line?.lineKey || !line?.nfcProfile) continue;
          try {
            await syncProfileToNfcProfilesCollection({
              profileId: `${orderId}_${line.lineKey}`,
              profile: line.nfcProfile,
              source: "verifyPayment",
            });
          } catch (syncErr) {
            console.error("verifyPayment nfc line sync error", line.lineKey, syncErr);
          }
        }
      } else if (prebooking?.nfcProfile) {
        try {
          await syncProfileToNfcProfilesCollection({
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
          payment: paymentData,
          billingAddress: `${prebooking?.address || ""}, ${prebooking?.city || ""}, ${prebooking?.state || ""} - ${prebooking?.pincode || ""}`,
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
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const decodedToken = await authenticate(req);
    if (!decodedToken) {
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const { profileId, nfcProfile } = req.body || {};

      if (!profileId || !nfcProfile) {
        res.status(400).send("profileId and nfcProfile are required.");
        return;
      }

      const result = await syncProfileToNfcProfilesCollection({
        profileId,
        profile: nfcProfile,
        source: "prePaymentDraft",
        status: "draft",
      });

      if (!result.synced) {
        res.status(400).send(result.reason || "Unable to sync profile.");
        return;
      }

      res.status(200).json({ success: true, username: result.username });
    } catch (error) {
      console.error("syncNfcProfileDraft error", error);
      res.status(500).send("Failed to sync NFC profile.");
    }
  });
});

exports.deleteNfcProfileDraft = onRequest({
  region: "asia-south1",
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const decodedToken = await authenticate(req);
    if (!decodedToken) {
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const { profileId } = req.body || {};

      if (!profileId) {
        res.status(400).send("profileId is required.");
        return;
      }

      const draftRef = db.collection(NFC_PROFILES_COLLECTION).doc(String(profileId));
      const draftSnap = await draftRef.get();

      if (!draftSnap.exists) {
        res.status(200).json({ success: true, deleted: false });
        return;
      }

      const draftData = draftSnap.data() || {};
      const isConfirmed = draftData.status === "confirmed" && draftData.updatedSource !== "prePaymentDraft";

      if (isConfirmed) {
        res.status(200).json({ success: true, deleted: false, reason: "confirmed profile preserved" });
        return;
      }

      await draftRef.delete();
      res.status(200).json({ success: true, deleted: true });
    } catch (error) {
      console.error("deleteNfcProfileDraft error", error);
      res.status(500).send("Failed to delete NFC draft.");
    }
  });
});

exports.getPublicNfcProfile = onRequest({
  region: "asia-south1",
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

      const snapshot = await db
        .collection(NFC_PROFILES_COLLECTION)
        .where("username", "==", username)
        .get();

      if (snapshot.empty) {
        res.status(404).send("Profile not found.");
        return;
      }

      const confirmedDoc = snapshot.docs.find((docSnap) => isConfirmedNfcProfileRecord(docSnap.data()));

      if (!confirmedDoc) {
        res.status(404).send("Profile not found.");
        return;
      }

      const profile = confirmedDoc.data();
      res.status(200).json({
        profile: { ...profile, orderId: confirmedDoc.id },
      });
    } catch (error) {
      console.error("getPublicNfcProfile error", error);
      res.status(500).send("Failed to load public NFC profile.");
    }
  });
});

// ─── Firestore triggers ───────────────────────────────────────────────────────

const syncBookingNfcProfilesFromDocument = async (after, bookingId) => {
  const paymentOrderId = after?.payment?.orderId || bookingId;
  if (!paymentOrderId) return;

  if (Array.isArray(after?.nfcLineProfiles) && after.nfcLineProfiles.length > 0) {
    for (const line of after.nfcLineProfiles) {
      if (!line?.lineKey || !line?.nfcProfile) continue;
      await syncProfileToNfcProfilesCollection({
        profileId: `${paymentOrderId}_${line.lineKey}`,
        profile: line.nfcProfile,
        source: "bookingUpdateTrigger",
      });
    }
    return;
  }

  if (after?.nfcProfile) {
    await syncProfileToNfcProfilesCollection({
      profileId: paymentOrderId,
      profile: after.nfcProfile,
      source: "bookingUpdateTrigger",
    });
  }
};

exports.syncBookingNfcProfileToNfcCard = onDocumentUpdated({
  document: "booking/{bookingId}",
  region: "asia-south1",
}, async (event) => {
  const after = event.data?.after?.data();
  if (!after?.nfcProfile && !(Array.isArray(after?.nfcLineProfiles) && after.nfcLineProfiles.length > 0)) {
    return;
  }
  try {
    await syncBookingNfcProfilesFromDocument(after, event.params?.bookingId);
  } catch (error) {
    console.error("syncBookingNfcProfileToNfcCard error", error);
  }
});

exports.syncLegacyPrebookingNfcProfileToNfcCard = onDocumentUpdated({
  document: "prebookings/{prebookingId}",
  region: "asia-south1",
}, async (event) => {
  const after = event.data?.after?.data();
  if (!after?.nfcProfile && !(Array.isArray(after?.nfcLineProfiles) && after.nfcLineProfiles.length > 0)) {
    return;
  }
  try {
    await syncBookingNfcProfilesFromDocument(after, event.params?.prebookingId);
  } catch (error) {
    console.error("syncLegacyPrebookingNfcProfileToNfcCard error", error);
  }
});