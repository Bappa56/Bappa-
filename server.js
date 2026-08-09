const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");

const app = express();
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// Put your Firebase service-account JSON path in GOOGLE_APPLICATION_CREDENTIALS.
// Example: export GOOGLE_APPLICATION_CREDENTIALS="/path/serviceAccount.json"
if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://console.firebase.google.com/u/1/project/ff-hun/database/ff-hun-default-rtdb/data/~2F"
  });
}
const db = admin.database();

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

app.post("/razorpay/webhook", async (req, res) => {
  try {
    if (!WEBHOOK_SECRET) return res.status(500).json({ error: "Webhook secret not configured" });

    const signature = req.get("X-Razorpay-Signature") || "";
    const expected = crypto.createHmac("sha256", WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.body.event;
    if (!["payment.captured", "order.paid"].includes(event)) {
      return res.json({ ok: true, ignored: true });
    }

    const payment = req.body.payload?.payment?.entity;
    if (!payment?.id) return res.status(400).json({ error: "Payment data missing" });

    const paymentId = payment.id;
    const amount = Number(payment.amount || 0) / 100;

    // Idempotency: same payment ID is stored only once.
    const ref = db.ref(`payments/${paymentId}`);
    const snap = await ref.once("value");
    if (!snap.exists()) {
      await ref.set({
        paymentId,
        amount,
        currency: payment.currency || "INR",
        status: payment.status || "captured",
        method: payment.method || "",
        email: payment.email || "",
        contact: payment.contact || "",
        createdAt: Date.now(),
        voicePlayed: false
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.get("/firebase-test", async (req, res) => {
  try {
    await db.ref("system/test").set({
      message: "Firebase connection successful",
      time: new Date().toISOString()
    });

    res.json({
      success: true,
      message: "Firebase Realtime Database working"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(port, () => console.log(`Server listening on ${port}`));
