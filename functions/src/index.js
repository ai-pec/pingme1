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

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // Exact match in ALLOWED_ORIGINS
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      return true;
    }

    // Allow plzpingme.com and all its subdomains
    if (hostname === "plzpingme.com" || hostname.endsWith(".plzpingme.com")) {
      return true;
    }

    // Allow localhost and all its subdomains
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]") {
      return true;
    }

    // Allow Firebase domains
    if (hostname.endsWith(".web.app") || hostname.endsWith(".firebaseapp.com")) {
      return true;
    }

    // Allow private network IPs
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
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const NFC_PROFILES_COLLECTION = "nfcProfiles";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseUserAgent = (userAgent) => {
  const ua = userAgent || "";
  let device = "Desktop";
  let os = "Unknown";
  let browser = "Unknown";

  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device = "Tablet";
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|webos/i.test(ua)) {
    device = "Mobile";
  }

  if (/ipad|iphone|ipod/i.test(ua)) {
    os = "iOS";
  } else if (/android/i.test(ua)) {
    os = "Android";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
  } else if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua) && !/opr/i.test(ua)) {
    browser = "Chrome";
  } else if (/safari/i.test(ua) && !/chrome|crios|chromium/i.test(ua)) {
    browser = "Safari";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/edg/i.test(ua)) {
    browser = "Edge";
  } else if (/opr|opera/i.test(ua)) {
    browser = "Opera";
  }

  return { device, os, browser };
};

const generateLeadIntelligence = async (ownerProfile, visitorDetails, apiKey) => {
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY configuration");
  }

  const cardOwnerName = ownerProfile?.name || "Card Owner";
  const ownerBio = ownerProfile?.bio || "";
  const ownerCompany = ownerProfile?.companyName || "";
  const ownerJobTitle = ownerProfile?.jobTitle || "";
  const ownerBusinessOverview = ownerProfile?.businessOverview || "";

  const visitorName = visitorDetails?.visitorName || "Visitor";
  const visitorEmail = visitorDetails?.visitorEmail || "";
  const visitorPhone = visitorDetails?.visitorPhone || "";
  const visitorCompany = visitorDetails?.visitorCompany || "";

  const prompt = `
You are an AI Lead Assistant for PingME, a smart NFC business card platform.
A visitor has scanned an NFC card and shared their contact details. Your goal is to analyze the lead and draft a personalized outreach email for the card owner to send to the visitor.

--- CARD OWNER BUSINESS PROFILE ---
Name: ${cardOwnerName}
Bio: ${ownerBio || "Not specified"}
Services/Offerings: ${ownerBusinessOverview || ownerBio || "Not specified"}
Company/Organization: ${ownerCompany || "Not specified"}
Role: ${ownerJobTitle || "Not specified"}

--- VISITOR LEAD DETAILS ---
Name: ${visitorName}
Email: ${visitorEmail}
Phone: ${visitorPhone || "Not specified"}
Company: ${visitorCompany || "Not specified"}

Instructions:
1. Generate a brief "leadAssessment" (max 30 words) summarizing why this lead is valuable or what a good angle for collaboration might be.
2. Generate a "personalizedEmailSubject" that is professional, catchy, and references their meeting/scan context.
3. Generate a "personalizedEmailBody" in HTML format (use standard tags like <p>, <br>, <strong>). Address it from the owner (${cardOwnerName}) to the visitor (${visitorName}). Do not include any HTML markdown wrappers like \`\`\`html. Output pure HTML tags.
`;

  const makeRequest = async (model, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                leadAssessment: { type: "STRING" },
                personalizedEmailSubject: { type: "STRING" },
                personalizedEmailBody: { type: "STRING" }
              },
              required: ["leadAssessment", "personalizedEmailSubject", "personalizedEmailBody"]
            }
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) {
          throw new Error(`Empty response from Gemini API (${model})`);
        }
        return JSON.parse(textContent);
      }

      const errorText = await response.text();
      // Retry on rate limit (429) or server overload (503) with exponential backoff
      if ((response.status === 429 || response.status === 503) && attempt < retries) {
        const delay = Math.pow(2, attempt) * 3000; // 6s, 12s
        console.warn(`Gemini API (${model}) returned ${response.status} on attempt ${attempt}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(`Gemini API (${model}) returned error: ${response.status} - ${errorText}`);
    }
  };

  try {
    console.log("Attempting AI generation with gemini-2.0-flash...");
    return await makeRequest("gemini-2.0-flash");
  } catch (error) {
    console.warn(`Primary model gemini-2.0-flash failed: ${error.message}. Retrying with gemini-2.0-flash-lite...`);
    return await makeRequest("gemini-2.0-flash-lite");
  }
};

const getGeminiApiKey = async () => {
  try {
    const docSnap = await db.collection("config").doc("gemini").get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return data?.apiKey || data?.apikey || null;
    }
  } catch (err) {
    console.error("Failed to fetch GEMINI_API_KEY from Firestore config:", err);
  }
  return null;
};

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

  // Override customer name in bill/ship sections
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

exports.sendReverseContactEmail = onRequest({
  region: "asia-south1",
  timeoutSeconds: 120,
  secrets: [
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

    try {
      const {
        cardOwnerUsername,
        cardOwnerName,
        visitorName,
        visitorEmail,
        visitorPhone,
        visitorCompany,
      } = req.body || {};

      if (!cardOwnerUsername || !visitorName || !visitorEmail) {
        res.status(400).send("cardOwnerUsername, visitorName, and visitorEmail are required.");
        return;
      }

      // 1. Fetch card owner's email
      const username = normalizeNfcUsername(cardOwnerUsername);
      const snapshot = await db
        .collection(NFC_PROFILES_COLLECTION)
        .where("username", "==", username)
        .get();

      if (snapshot.empty) {
        res.status(404).send("Card owner profile not found.");
        return;
      }

      const confirmedDoc = snapshot.docs.find((docSnap) => isConfirmedNfcProfileRecord(docSnap.data()));
      if (!confirmedDoc) {
        res.status(404).send("Card owner profile not found.");
        return;
      }

      const profile = confirmedDoc.data();
      const orderId = confirmedDoc.id;

      // Robust owner email resolution:
      // Try resolving via booking -> users collection
      let ownerEmail = null;
      let ownerUid = null;
      if (orderId) {
        const bookingId = orderId.includes("_") ? orderId.split("_")[0] : orderId;
        try {
          const bookingDoc = await db.collection("booking").doc(bookingId).get();
          if (bookingDoc.exists) {
            const bookingData = bookingDoc.data();
            const userId = bookingData?.userId;
            if (userId && userId !== "guest") {
              ownerUid = userId;
              const userDoc = await db.collection("users").doc(userId).get();
              if (userDoc.exists) {
                ownerEmail = userDoc.data()?.email;
              }
            }
            if (!ownerEmail) {
              ownerEmail = bookingData?.email;
            }
          }
        } catch (dbErr) {
          console.error("Error fetching booking/user for owner email", dbErr);
        }
      }

      // Fallback to profile email
      if (!ownerEmail) {
        ownerEmail = profile.email;
      }

      // If ownerUid wasn't resolved by bookingId, try to lookup by ownerEmail in users collection
      if (!ownerUid && ownerEmail) {
        try {
          const userSnap = await db.collection("users").where("email", "==", ownerEmail).limit(1).get();
          if (!userSnap.empty) {
            ownerUid = userSnap.docs[0].id;
          }
        } catch (dbErr) {
          console.error("Error matching owner email to user UID:", dbErr);
        }
      }

      if (!ownerEmail) {
        res.status(400).send("Card owner has not configured an email address.");
        return;
      }

      // 2. Send email to card owner
      const transporter = getMailTransporter();
      const fromEmail = (
        SMTP_FROM.value() || SMTP_USER.value() ||
        process.env.SMTP_FROM || process.env.SMTP_USER || ""
      ).trim();

      if (!transporter || !fromEmail) {
        console.warn("sendReverseContactEmail skipped due to missing SMTP configuration.");
        res.status(500).send("Email configuration error on server.");
        return;
      }

      // Generate AI lead intelligence & outreach drafts if API key is configured
      let aiSectionHtml = "";
      let aiSectionText = "";
      let aiResult = null;

      try {
        const apiKey = await getGeminiApiKey();
        if (apiKey) {
          aiResult = await generateLeadIntelligence(profile, {
            visitorName,
            visitorEmail,
            visitorPhone,
            visitorCompany
          }, apiKey);

          if (aiResult) {
            aiSectionHtml = `
              <div style="margin-top: 30px; padding: 20px; background-color: #fff9e6; border: 1px solid #ffe89e; border-radius: 12px; font-family: Arial, sans-serif;">
                <h3 style="margin-top: 0; color: #d97706; font-size: 16px; display: flex; align-items: center; gap: 6px;">
                  ✨ AI Lead Assistant Insights
                </h3>
                <p style="font-size: 13px; color: #444; line-height: 1.6; margin-bottom: 15px;">
                  <strong>Lead Fit Assessment:</strong> ${aiResult.leadAssessment}
                </p>
                <div style="background-color: #ffffff; border: 1px dashed #d97706; padding: 15px; border-radius: 8px; font-size: 13px;">
                  <p style="margin-top: 0; margin-bottom: 8px; font-weight: bold; color: #333;">
                    Personalized Follow-up Draft:
                  </p>
                  <p style="margin-top: 0; margin-bottom: 12px; font-size: 12px; color: #666;">
                    <strong>Subject:</strong> ${aiResult.personalizedEmailSubject}
                  </p>
                  <div style="border-top: 1px solid #eee; padding-top: 12px; color: #222; font-size: 13px; line-height: 1.5;">
                    ${aiResult.personalizedEmailBody}
                  </div>
                </div>
              </div>
            `;

            aiSectionText = `
\n\n=== ✨ AI Lead Assistant Insights ===
Lead Fit Assessment: ${aiResult.leadAssessment}

Personalized Follow-up Draft:
Subject: ${aiResult.personalizedEmailSubject}
Body:
${aiResult.personalizedEmailBody.replace(/<[^>]*>/g, "")}
`;
          }
        }
      } catch (aiErr) {
        console.error("AI Lead Intelligence generation failed:", aiErr);
      }

      const subject = `${visitorName} shared their contact info with you!`;
      const text = [
        `Hi ${cardOwnerName || "there"},`,
        "",
        `${visitorName} recently scanned your PingME NFC card and shared their contact details with you:`,
        "",
        `Name: ${visitorName}`,
        `Email: ${visitorEmail}`,
        visitorPhone ? `Phone: ${visitorPhone}` : "",
        visitorCompany ? `Company: ${visitorCompany}` : "",
        aiSectionText,
        "",
        "Best regards,",
        "Team PingME"
      ].filter(Boolean).join("\n");

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #333;">New Contact Information Shared!</h2>
          <p>Hi <strong>${cardOwnerName || "there"}</strong>,</p>
          <p><strong>${visitorName}</strong> scanned your PingME NFC card and shared their contact details with you:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; width: 120px;">Name:</td>
              <td style="padding: 10px;">${visitorName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Email:</td>
              <td style="padding: 10px;"><a href="mailto:${visitorEmail}">${visitorEmail}</a></td>
            </tr>
            ${visitorPhone ? `
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold;">Phone:</td>
              <td style="padding: 10px;"><a href="tel:${visitorPhone}">${visitorPhone}</a></td>
            </tr>
            ` : ""}
            ${visitorCompany ? `
            <tr>
              <td style="padding: 10px; font-weight: bold;">Company:</td>
              <td style="padding: 10px;">${visitorCompany}</td>
            </tr>
            ` : ""}
          </table>
          ${aiSectionHtml}
          <p style="margin-top: 30px;">Best regards,<br><strong>Team PingME</strong></p>
        </div>
      `;

      await transporter.sendMail({
        from: fromEmail,
        to: ownerEmail,
        subject,
        text,
        html,
      });

      // Save lead details to Firestore nfcLeads collection
      try {
        const leadData = {
          cardOwnerUsername: username,
          cardOwnerUid: ownerUid || null,
          cardOwnerEmail: ownerEmail || null,
          visitorName: visitorName || "",
          visitorEmail: visitorEmail || "",
          visitorPhone: visitorPhone || "",
          visitorCompany: visitorCompany || "",
          leadAssessment: aiResult?.leadAssessment || "N/A",
          personalizedEmailSubject: aiResult?.personalizedEmailSubject || "N/A",
          personalizedEmailBody: aiResult?.personalizedEmailBody || "N/A",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection("nfcLeads").add(leadData);
        console.log(`Lead saved successfully in Firestore nfcLeads for username: ${username}`);
      } catch (dbErr) {
        console.error("Error saving lead details to Firestore:", dbErr);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("sendReverseContactEmail error", error);
      res.status(500).send("Failed to send contact information.");
    }
  });
});

exports.trackNfcVisit = onRequest({
  region: "asia-south1",
}, (req, res) => {
  corsHandler(req, res, async () => {
    // Accept both GET and POST
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const username = normalizeNfcUsername(String(req.query?.username || req.body?.username || ""));
      if (!username) {
        res.status(400).send("username is required.");
        return;
      }

      const uaString = req.headers["user-agent"] || "";
      const parsedUa = parseUserAgent(uaString);

      // Increment profile visit count if the profile exists
      const snapshot = await db
        .collection(NFC_PROFILES_COLLECTION)
        .where("username", "==", username)
        .get();

      const confirmedDoc = snapshot.docs.find((docSnap) => isConfirmedNfcProfileRecord(docSnap.data()));
      if (confirmedDoc) {
        await confirmedDoc.ref.update({
          visitCount: admin.firestore.FieldValue.increment(1)
        });
      }

      // Record the visit detail log
      await db.collection("nfcVisits").add({
        username,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: uaString,
        device: parsedUa.device,
        os: parsedUa.os,
        browser: parsedUa.browser
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("trackNfcVisit error", error);
      res.status(500).send("Failed to track visit.");
    }
  });
});

exports.getNfcVisitAnalytics = onRequest({
  region: "asia-south1",
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const decodedToken = await authenticate(req);
    if (!decodedToken) {
      res.status(401).send("Unauthorized");
      return;
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email || null;

    try {
      const ownedUsernames = new Set();

      const processBookingDoc = (docSnap) => {
        const data = docSnap.data();
        if (!data) return;

        if (data.nfcProfile?.username) {
          ownedUsernames.add(normalizeNfcUsername(data.nfcProfile.username));
        }
        if (Array.isArray(data.nfcLineProfiles)) {
          for (const line of data.nfcLineProfiles) {
            if (line?.nfcProfile?.username) {
              ownedUsernames.add(normalizeNfcUsername(line.nfcProfile.username));
            }
          }
        }
      };

      // Query bookings by userId
      const [bookingsByUid, legacyByUid] = await Promise.all([
        db.collection("booking").where("userId", "==", userId).get(),
        db.collection("prebookings").where("userId", "==", userId).get(),
      ]);
      bookingsByUid.docs.forEach(processBookingDoc);
      legacyByUid.docs.forEach(processBookingDoc);

      // Query bookings by email if available
      if (userEmail) {
        const [bookingsByEmail, legacyByEmail] = await Promise.all([
          db.collection("booking").where("email", "==", userEmail).get(),
          db.collection("prebookings").where("email", "==", userEmail).get(),
        ]);
        bookingsByEmail.docs.forEach(processBookingDoc);
        legacyByEmail.docs.forEach(processBookingDoc);
      }

      const usernamesArr = Array.from(ownedUsernames);

      if (usernamesArr.length === 0) {
        res.status(200).json({
          ownedUsernames: [],
          selectedUsername: null,
          analytics: {
            totalVisits: 0,
            deviceBreakdown: {},
            osBreakdown: {},
            browserBreakdown: {},
            trafficOverTime: [],
            recentVisits: []
          }
        });
        return;
      }

      // Optional username filter
      const requestedUsername = req.query?.username ? normalizeNfcUsername(String(req.query.username)) : null;
      let selectedUsername = null;
      let queryRef = db.collection("nfcVisits");

      if (requestedUsername) {
        if (!ownedUsernames.has(requestedUsername)) {
          res.status(403).send("Forbidden: You do not own this profile.");
          return;
        }
        selectedUsername = requestedUsername;
        queryRef = queryRef.where("username", "==", requestedUsername);
      } else {
        selectedUsername = "all";
        // Limit query to first 30 owned usernames due to 'in' clause limit
        queryRef = queryRef.where("username", "in", usernamesArr.slice(0, 30));
      }

      const visitsSnapshot = await queryRef.get();

      // Process and aggregate in memory to avoid composite index requirements
      const visits = visitsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          username: data.username,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          device: data.device || "Unknown",
          os: data.os || "Unknown",
          browser: data.browser || "Unknown"
        };
      });

      // Sort in memory (descending order)
      visits.sort((a, b) => b.timestamp - a.timestamp);

      // Aggregate statistics
      const totalVisits = visits.length;
      const deviceBreakdown = {};
      const osBreakdown = {};
      const browserBreakdown = {};

      // Initialize the last 30 days traffic map with 0s
      const trafficMap = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        trafficMap[dateStr] = 0;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      visits.forEach(v => {
        deviceBreakdown[v.device] = (deviceBreakdown[v.device] || 0) + 1;
        osBreakdown[v.os] = (osBreakdown[v.os] || 0) + 1;
        browserBreakdown[v.browser] = (browserBreakdown[v.browser] || 0) + 1;

        if (v.timestamp >= thirtyDaysAgo) {
          const dateStr = v.timestamp.toISOString().split("T")[0];
          if (trafficMap[dateStr] !== undefined) {
            trafficMap[dateStr]++;
          }
        }
      });

      const trafficOverTime = Object.keys(trafficMap).map(date => ({
        date,
        count: trafficMap[date]
      }));

      const recentVisits = visits.slice(0, 15).map(v => ({
        id: v.id,
        username: v.username,
        timestamp: v.timestamp.toISOString(),
        device: v.device,
        os: v.os,
        browser: v.browser
      }));

      res.status(200).json({
        ownedUsernames: usernamesArr,
        selectedUsername,
        analytics: {
          totalVisits,
          deviceBreakdown,
          osBreakdown,
          browserBreakdown,
          trafficOverTime,
          recentVisits
        }
      });
    } catch (error) {
      console.error("getNfcVisitAnalytics error", error);
      res.status(500).send("Failed to get analytics.");
    }
  });
});

exports.getNfcLeads = onRequest({
  region: "asia-south1",
}, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const decodedToken = await authenticate(req);
    if (!decodedToken) {
      res.status(401).send("Unauthorized");
      return;
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email || null;

    try {
      const ownedUsernames = new Set();

      const processBookingDoc = (docSnap) => {
        const data = docSnap.data();
        if (!data) return;

        if (data.nfcProfile?.username) {
          ownedUsernames.add(normalizeNfcUsername(data.nfcProfile.username));
        }
        if (Array.isArray(data.nfcLineProfiles)) {
          for (const line of data.nfcLineProfiles) {
            if (line?.nfcProfile?.username) {
              ownedUsernames.add(normalizeNfcUsername(line.nfcProfile.username));
            }
          }
        }
      };

      // Query bookings by userId
      const [bookingsByUid, legacyByUid] = await Promise.all([
        db.collection("booking").where("userId", "==", userId).get(),
        db.collection("prebookings").where("userId", "==", userId).get(),
      ]);
      bookingsByUid.docs.forEach(processBookingDoc);
      legacyByUid.docs.forEach(processBookingDoc);

      // Query bookings by email if available
      if (userEmail) {
        const [bookingsByEmail, legacyByEmail] = await Promise.all([
          db.collection("booking").where("email", "==", userEmail).get(),
          db.collection("prebookings").where("email", "==", userEmail).get(),
        ]);
        bookingsByEmail.docs.forEach(processBookingDoc);
        legacyByEmail.docs.forEach(processBookingDoc);
      }

      const usernamesArr = Array.from(ownedUsernames);

      if (usernamesArr.length === 0) {
        res.status(200).json({
          ownedUsernames: [],
          selectedUsername: null,
          leads: []
        });
        return;
      }

      // Optional username filter
      const requestedUsername = req.query?.username ? normalizeNfcUsername(String(req.query.username)) : null;
      let selectedUsername = null;
      let queryRef = db.collection("nfcLeads");

      if (requestedUsername) {
        if (!ownedUsernames.has(requestedUsername)) {
          res.status(403).send("Forbidden: You do not own this profile.");
          return;
        }
        selectedUsername = requestedUsername;
        queryRef = queryRef.where("cardOwnerUsername", "==", requestedUsername);
      } else {
        selectedUsername = "all";
        // Limit query to first 30 owned usernames due to 'in' clause limit
        queryRef = queryRef.where("cardOwnerUsername", "in", usernamesArr.slice(0, 30));
      }

      const leadsSnapshot = await queryRef.get();
      const leads = leadsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          cardOwnerUsername: data.cardOwnerUsername,
          visitorName: data.visitorName || "",
          visitorEmail: data.visitorEmail || "",
          visitorPhone: data.visitorPhone || "",
          visitorCompany: data.visitorCompany || "",
          leadAssessment: data.leadAssessment || "N/A",
          personalizedEmailSubject: data.personalizedEmailSubject || "N/A",
          personalizedEmailBody: data.personalizedEmailBody || "N/A",
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        };
      });

      // Sort leads in memory (descending order, newest first)
      leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.status(200).json({
        ownedUsernames: usernamesArr,
        selectedUsername,
        leads
      });
    } catch (error) {
      console.error("getNfcLeads error", error);
      res.status(500).send("Failed to get leads.");
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