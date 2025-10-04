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

const normalizeOrigin = (value = "") => {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return value.trim().replace(/\/$/, "");
  }
};

const parseOriginList = (value = "") =>
  String(value)
    .split(",")
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);

const ENV_CLIENT_ORIGINS = parseOriginList(process.env.CLIENT_ORIGINS);
const DEFAULT_DEV_ORIGIN_MATCHERS = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i,
];

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow non-CORS/SSR requests.
  const normalizedOrigin = normalizeOrigin(origin);
  if (ENV_CLIENT_ORIGINS.length) {
    return ENV_CLIENT_ORIGINS.some((allowed) => allowed === normalizedOrigin);
  }
  return DEFAULT_DEV_ORIGIN_MATCHERS.some((regex) => regex.test(normalizedOrigin));
};

const corsBaseOptions = {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-forwarded-for",
    "x-lahza-signature",
  ],
};

/* ---------- CORS ---------- */
app.use(
  cors((req, cb) => {
    const origin = req.headers.origin;
    const allowed = isOriginAllowed(origin);

    cb(null, {
      ...corsBaseOptions,
      origin: origin ? (allowed ? origin : false) : true,
      credentials: allowed,
    });
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
const Product = require("./models/Product");
const {
  normalizeMinorAmount,
  parseMetadata,
  mapVerificationPayload,
  resolveMinorAmount,
} = require("./utils/lahza");

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
        const order = await Order.findOne({ reference }).lean();
        if (!order) {
          console.warn("⚠️ Webhook: لم يتم العثور على طلب للمرجع", reference);
          return res.sendStatus(200);
        }

        const eventPayload = event.data || {};
        const eventMetadata = parseMetadata(eventPayload.metadata);
        const eventSnapshot = mapVerificationPayload({ ...eventPayload, metadata: eventMetadata });

        let verification;
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

          verification = mapVerificationPayload(data?.data || {});
          if (verification.status !== "success") {
            return res.sendStatus(200);
          }
        } catch (e) {
          console.warn("⚠️ فشل التحقق من Lahza:", e?.message || e);
          return res.sendStatus(200);
        }

        const verificationExpected = resolveMinorAmount({
          candidates: [
            verification.metadata?.expectedAmountMinor,
            verification.metadata?.amountMinor,
          ],
        });
        const eventExpected = resolveMinorAmount({
          candidates: [
            eventSnapshot.metadata?.expectedAmountMinor,
            eventSnapshot.metadata?.amountMinor,
            eventMetadata.expectedAmountMinor,
            eventMetadata.amountMinor,
          ],
        });
        const orderExpectedMinor = Math.round(Number(order.total || 0) * 100);
        const expectedHint = Number.isFinite(verificationExpected)
          ? verificationExpected
          : Number.isFinite(eventExpected)
          ? eventExpected
          : orderExpectedMinor;
        const amountMinor = resolveMinorAmount({
          candidates: [
            verification.amountMinor,
            eventSnapshot.amountMinor,
            eventPayload.amount_minor,
            eventPayload.amountMinor,
            eventPayload.amount,
            verification.metadata?.amountMinor,
            verification.metadata?.expectedAmountMinor,
            eventMetadata.amountMinor,
            eventMetadata.expectedAmountMinor,
          ],
          expectedMinor: expectedHint,
        });
        const verifiedCurrency = (verification.currency || eventSnapshot.currency || "")
          .toString()
          .trim()
          .toUpperCase();

        const expectedMinor = orderExpectedMinor;
        const storedCurrency = (order.paymentCurrency || "").toString().trim().toUpperCase();
        const fallbackCurrency = (eventMetadata.expectedCurrency || "")
          .toString()
          .trim()
          .toUpperCase();
        const expectedCurrency = storedCurrency || fallbackCurrency;

        const amountMatches =
          typeof amountMinor === "number" && Number.isFinite(amountMinor)
            ? amountMinor === expectedMinor
            : false;
        const currencyMatches =
          !expectedCurrency || !verifiedCurrency
            ? true
            : verifiedCurrency === expectedCurrency;

        const amountForStorage =
          typeof amountMinor === "number" && Number.isFinite(amountMinor)
            ? Number((amountMinor / 100).toFixed(2))
            : null;
        const transactionId = verification.transactionId || eventSnapshot.transactionId || null;

        if (!amountMatches || !currencyMatches) {
          console.error("🚫 Webhook: تعارض في مبلغ أو عملة الدفع", {
            reference,
            amountMinor,
            expectedMinor,
            verifiedCurrency,
            expectedCurrency,
          });

          const mismatchSet = {};
          if (amountForStorage !== null) mismatchSet.paymentVerifiedAmount = amountForStorage;
          if (verifiedCurrency) mismatchSet.paymentVerifiedCurrency = verifiedCurrency;
          if (transactionId) mismatchSet.paymentTransactionId = String(transactionId);
          if (Object.keys(mismatchSet).length) {
            await Order.updateOne({ _id: order._id }, { $set: mismatchSet });
          }
          return res.sendStatus(200);
        }

        const baseSet = {
          paymentStatus: "paid",
          status: "waiting_confirmation",
        };
        if (amountForStorage !== null) baseSet.paymentVerifiedAmount = amountForStorage;
        if (verifiedCurrency) baseSet.paymentVerifiedCurrency = verifiedCurrency;
        if (transactionId) baseSet.paymentTransactionId = String(transactionId);
        if (!storedCurrency && verifiedCurrency) {
          baseSet.paymentCurrency = verifiedCurrency;
        }

        const updated = await Order.findOneAndUpdate(
          { _id: order._id, paymentStatus: { $ne: "paid" } },
          { $set: baseSet },
          { new: true }
        ).lean();

        if (!updated) {
          await Order.updateOne({ _id: order._id }, { $set: baseSet });
        }

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
  .then(async () => {
    console.log("✅ MongoDB connected");

    try {
      const dropped = await Product.syncIndexes();
      if (Array.isArray(dropped) && dropped.length) {
        console.log(
          "🔁 Product indexes synchronized (dropped):",
          dropped.join(", ")
        );
      } else {
        console.log("🔁 Product indexes synchronized");
      }
    } catch (err) {
      console.error("⚠️ Failed to sync Product indexes:", err?.message || err);
    }
  })
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
