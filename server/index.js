/* ===========================
 *  madina-ecommerce — server/index.js
 *  Express + MongoDB + Lahza Webhooks (CJS)
 * =========================== */

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ---------- CORS ---------- */
app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-forwarded-for",
      "x-lahza-signature",
    ],
    credentials: true,
  })
);

/* ---------- Trust Proxy (قبل استخدام IP) ---------- */
app.set("trust proxy", 1);

/* =====================================================
 *  WEBHOOK: Lahza  (ضروري يكون قبل express.json)
 *  - يستقبل RAW JSON
 *  - يتحقق من x-lahza-signature (HMAC-SHA256 على الـ raw body)
 *  - عند charge.success: يخصم مخزون أصناف الطلب، ويعلّم الطلب مدفوع
 *  - يرجع 200 بسرعة لتجنّب إعادة المحاولات الطويلة
 * ===================================================== */

const LAHZA_SECRET_KEY = process.env.LAHZA_SECRET_KEY || "";
const WEBHOOK_IP_WHITELIST =
  String(process.env.WEBHOOK_IP_WHITELIST || "true") === "true";
const WEBHOOK_ALLOWED_IPS = (
  process.env.WEBHOOK_ALLOWED_IPS || "161.35.20.140,165.227.134.20"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ⚠️ موديلات مستخدمة داخل الـ webhook
const Order = require("./models/Order");
const Variant = require("./models/Variant");

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || req.ip || "";
}

async function decrementStockByOrderItems(items = []) {
  await Promise.all(
    (items || []).map((ci) =>
      Variant.updateOne(
        { _id: ci.variantId, "stock.inStock": { $gte: ci.quantity } },
        { $inc: { "stock.inStock": -ci.quantity } }
      )
    )
  );
}

app.post(
  "/api/webhooks/lahza",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      if (!LAHZA_SECRET_KEY) {
        console.error("⚠️ LAHZA_SECRET_KEY غير معرّف في .env");
        return res.sendStatus(200);
      }

      if (WEBHOOK_IP_WHITELIST && WEBHOOK_ALLOWED_IPS.length) {
        const ip = getClientIp(req);
        const pass = WEBHOOK_ALLOWED_IPS.some((a) => ip === a);
        if (!pass) {
          console.warn("🚫 Webhook مرفوض من IP غير مسموح:", ip);
          return res.sendStatus(200);
        }
      }

      const signature = req.get("x-lahza-signature") || "";
      let computed;
      try {
        computed = crypto
          .createHmac("sha256", LAHZA_SECRET_KEY)
          .update(req.body)
          .digest("hex");
      } catch (e) {
        console.error("❌ فشل إنشاء HMAC:", e.message);
        return res.sendStatus(200);
      }

      let verified = false;
      try {
        verified = crypto.timingSafeEqual(
          Buffer.from(computed, "hex"),
          Buffer.from(signature, "hex")
        );
      } catch {
        verified = false;
      }

      if (!verified) {
        console.warn("⚠️ توقيع Webhook غير صالح");
        return res.sendStatus(200);
      }

      let event;
      try {
        event = JSON.parse(req.body.toString("utf8"));
      } catch (e) {
        console.error("❌ جسم Webhook ليس JSON صالح");
        return res.sendStatus(200);
      }

      // إذا كان حدث نجاح الدفع
      if (event?.event === "charge.success" && event?.data?.reference) {
        const reference = String(event.data.reference).trim();

        // تأكيد من Lahza (تحقق ثانوي)
        try {
          const url = `https://api.lahza.io/transaction/verify/${encodeURIComponent(
            reference
          )}`;
          const { data } = await axios.get(url, {
            headers: {
              Authorization: `Bearer ${LAHZA_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 15000,
          });

          if (String(data?.data?.status || "").toLowerCase() !== "success") {
            return res.sendStatus(200);
          }
        } catch (e) {
          console.warn("⚠️ فشل التحقق من Lahza:", e?.message || e);
          return res.sendStatus(200);
        }

        // تحديث الطلب (Idempotent): إن كان غير مدفوع -> مدفوع ثم خصم المخزون
        const updated = await Order.findOneAndUpdate(
          { reference, paymentStatus: { $ne: "paid" } },
          { $set: { paymentStatus: "paid", status: "waiting_confirmation" } },
          { new: true }
        ).lean();

        if (updated) {
          await decrementStockByOrderItems(updated.items || []);
        }
      }

      return res.sendStatus(200);
    } catch (e) {
      console.error("🔥 Webhook handler error:", e);
      return res.sendStatus(200);
    }
  }
);

/* ---------- JSON parsers بعد الـ webhook ---------- */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Mongo ---------- */
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    family: 4,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ Mongo error:", err);
    process.exit(1);
  });

/* ---------- Routes ---------- */
app.use("/api/contact", require("./routes/contact"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/variants", require("./routes/variants"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/users", require("./routes/user"));
app.use("/api/discount-rules", require("./routes/discountRules"));
app.use("/api/discounts", require("./routes/discounts"));
app.use("/api/home-collections", require("./routes/homeCollections"));
app.use("/api/recaptcha", require("./routes/recaptcha"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/orders", require("./routes/order-status"));

/* ---------- health ---------- */
app.get("/healthz", (_req, res) => res.json({ ok: true }));

/* ---------- boot ---------- */
const server = app.listen(PORT, () => console.log(`🚀 Server on :${PORT}`));

/* ---------- Graceful Shutdown ---------- */
const shutdown = () => {
  console.log("🛑 Shutting down...");
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("🔌 MongoDB connection closed");
      process.exit(0);
    });
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
