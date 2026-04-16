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

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const corsHandler = cors({ origin: true });

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
  secrets: [RAZORPAY_KEY_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM],
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
