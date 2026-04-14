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

const getExpectedDeliveryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date;
};

const formatExpectedDeliveryDate = (date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatItems = (items = []) =>
  items
    .map((item) => {
      const title = item?.title || "Item";
      const quantity = item?.quantity || 1;
      return `${title} x${quantity}`;
    })
    .join(", ");

const normalizeIndianPhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length >= 11 && digits.startsWith("0")) {
    return `+91${digits.slice(-10)}`;
  }

  if (String(phone).trim().startsWith("+")) {
    return String(phone).trim();
  }

  return null;
};

const getMailTransporter = () => {
  const host = SMTP_HOST.value() || process.env.SMTP_HOST;
  const port = Number(SMTP_PORT.value() || process.env.SMTP_PORT || 587);
  const user = SMTP_USER.value() || process.env.SMTP_USER;
  const pass = SMTP_PASS.value() || process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

const sendConfirmationEmail = async ({
  orderId,
  email,
  fullName,
  itemsLabel,
  expectedDeliveryLabel,
}) => {
  if (!email) {
    return { sent: false, reason: "missing_email" };
  }

  const transporter = getMailTransporter();
  const fromEmail = SMTP_FROM.value() || SMTP_USER.value() || process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transporter || !fromEmail) {
    console.warn("Order confirmation email skipped due to missing SMTP configuration.");
    return { sent: false, reason: "missing_smtp_config" };
  }

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `Order Confirmed - ${orderId}`,
    text: [
      `Hi ${fullName || "Customer"},`,
      "",
      `Your order with Order ID ${orderId} has been confirmed.`,
      `Items: ${itemsLabel || "-"}`,
      `Expected delivery date: ${expectedDeliveryLabel}`,
      "",
      "Thank you for shopping with PingME.",
    ].join("\n"),
    html: `
      <p>Hi ${fullName || "Customer"},</p>
      <p>Your order with <strong>Order ID ${orderId}</strong> has been confirmed.</p>
      <p><strong>Items:</strong> ${itemsLabel || "-"}</p>
      <p><strong>Expected delivery date:</strong> ${expectedDeliveryLabel}</p>
      <p>Thank you for shopping with PingME.</p>
    `,
  });

  return { sent: true };
};

const sendConfirmationPhoneMessage = async ({
  orderId,
  phone,
  itemsLabel,
  expectedDeliveryLabel,
}) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const whatsappFromNumber = process.env.TWILIO_WHATSAPP_FROM;
  const whatsappContentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
  const toNumber = normalizeIndianPhone(phone);

  if (!toNumber) {
    return { sent: false, reason: "missing_or_invalid_phone" };
  }

  if (!accountSid || !authToken) {
    console.warn("Order confirmation phone message skipped due to missing Twilio configuration.");
    return { sent: false, reason: "missing_twilio_config" };
  }

  const client = twilio(accountSid, authToken);

  const messageBody = `Your order ${orderId} is confirmed. Items: ${itemsLabel || "-"}. Expected delivery: ${expectedDeliveryLabel}.`;

  // Prefer WhatsApp if configured, otherwise fallback to SMS.
  if (whatsappFromNumber) {
    if (whatsappContentSid) {
      await client.messages.create({
        from: whatsappFromNumber,
        to: `whatsapp:${toNumber}`,
        contentSid: whatsappContentSid,
        contentVariables: JSON.stringify({
          1: orderId,
          2: itemsLabel || "-",
          3: expectedDeliveryLabel,
        }),
      });

      return { sent: true, channel: "whatsapp" };
    }

    await client.messages.create({
      from: whatsappFromNumber,
      to: `whatsapp:${toNumber}`,
      body: messageBody,
    });

    return { sent: true, channel: "whatsapp" };
  }

  if (!fromNumber) {
    console.warn("Order confirmation SMS skipped due to missing TWILIO_PHONE_NUMBER.");
    return { sent: false, reason: "missing_twilio_phone_number" };
  }

  await client.messages.create({
    from: fromNumber,
    to: toNumber,
    body: messageBody,
  });

  return { sent: true, channel: "sms" };
};

const getRazorpayClient = () => {
  const keyId = RAZORPAY_KEY_ID.value() || process.env.RAZORPAY_KEY_ID;
  const keySecret = RAZORPAY_KEY_SECRET.value() || process.env.RAZORPAY_KEY_SECRET;

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

exports.verifyPayment = onRequest({
  region: "asia-south1",
  secrets: [RAZORPAY_KEY_SECRET],
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

      const keySecret = RAZORPAY_KEY_SECRET.value() || process.env.RAZORPAY_KEY_SECRET;
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
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const prebookingRef = await db.collection("prebookings").add(prebookingData);

      res.status(200).json({
        success: true,
        prebookingId: prebookingRef.id,
      });
    } catch (error) {
      console.error("verifyPayment error", error);
      res.status(500).send("Failed to verify payment.");
    }
  });
});

exports.notifyOrderConfirmed = onDocumentUpdated(
  {
    document: "prebookings/{orderId}",
    region: "asia-south1",
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM],
  },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!beforeData || !afterData) {
      return;
    }

    if (beforeData.status === afterData.status) {
      return;
    }

    if (afterData.status !== "confirmed") {
      return;
    }

    const orderId = event.params.orderId;
    const expectedDate = getExpectedDeliveryDate();
    const expectedDeliveryLabel = formatExpectedDeliveryDate(expectedDate);
    const itemsLabel = formatItems(afterData.items || []);

    const [emailResult, phoneMessageResult] = await Promise.allSettled([
      sendConfirmationEmail({
        orderId,
        email: afterData.email,
        fullName: afterData.fullName,
        itemsLabel,
        expectedDeliveryLabel,
      }),
      sendConfirmationPhoneMessage({
        orderId,
        phone: afterData.phone,
        itemsLabel,
        expectedDeliveryLabel,
      }),
    ]);

    const emailSent = emailResult.status === "fulfilled" && emailResult.value.sent;
    const phoneMessageSent =
      phoneMessageResult.status === "fulfilled" && phoneMessageResult.value.sent;
    const phoneMessageChannel =
      phoneMessageResult.status === "fulfilled" ? phoneMessageResult.value.channel || null : null;

    if (emailResult.status === "rejected") {
      console.error("Failed to send order confirmation email", {
        orderId,
        error: emailResult.reason,
      });
    }

    if (phoneMessageResult.status === "rejected") {
      console.error("Failed to send order confirmation phone message", {
        orderId,
        error: phoneMessageResult.reason,
      });
    }

    await event.data.after.ref.set(
      {
        notifications: {
          confirmationEmailSent: emailSent,
          confirmationPhoneMessageSent: phoneMessageSent,
          confirmationMessageChannel: phoneMessageChannel,
          confirmationWhatsAppSent: phoneMessageSent && phoneMessageChannel === "whatsapp",
          confirmationSmsSent: phoneMessageSent && phoneMessageChannel === "sms",
          confirmationAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
          expectedDeliveryDate: admin.firestore.Timestamp.fromDate(expectedDate),
        },
      },
      { merge: true }
    );
  }
);
