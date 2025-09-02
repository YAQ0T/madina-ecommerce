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
const allowedOrigins = [
  "http://localhost:5173",
  "https://madina-ecommerce.vercel.app",
  "https://dikori.com",
  "https://www.dikori.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
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
        const pass = WEBHOOK_ALLOWED_IPS.some((a) => ip.includes(a));
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
        const a = Buffer.from(computed, "utf8");
        const b = Buffer.from(signature, "utf8");
        verified = a.length === b.length && crypto.timingSafeEqual(a, b);
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

      const type = event?.type || "";
      const data = event?.data || {};

      if (type === "charge.success") {
        const reference =
          data?.reference || data?.ref || data?.transaction_ref || null;

        if (reference) {
          try {
            const url = `https://api.lahza.io/transaction/verify/${encodeURIComponent(
              reference
            )}`;
            const resp = await axios.get(url, {
              headers: {
                Authorization: `Bearer ${LAHZA_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
              timeout: 15000,
            });

            const v = resp?.data || {};
            const status = v?.data?.status;

            if (String(status).toLowerCase() === "success") {
              const order = await Order.findOne({ reference }).lean();
              if (!order) {
                console.warn("⚠️ لا يوجد طلب مرتبط بهذا المرجع:", reference);
              } else {
                if (order.paymentStatus !== "paid") {
                  await decrementStockByOrderItems(order.items || []);
                  await Order.findByIdAndUpdate(order._id, {
                    $set: {
                      paymentStatus: "paid",
                      status: "waiting_confirmation",
                    },
                  }).lean();
                  console.log("✅ تم وسم الطلب مدفوعًا:", order._id);
                } else {
                  console.log("ℹ️ الطلب مدفوع مسبقًا:", order._id);
                }
              }
            } else {
              console.warn(
                "⚠️ verify لم يرجع success لهذه المعاملة:",
                reference,
                status
              );
            }
          } catch (err) {
            console.error(
              "❌ فشل Verify/تحديث الطلب:",
              err?.response?.data || err.message
            );
          }
        }
      }

      return res.sendStatus(200);
    } catch (e) {
      console.error("🔥 Webhook handler error:", e);
      return res.sendStatus(200);
    }
  }
);

/* ---------- Core Middleware (بعد الويبهوك) ---------- */
app.use(express.json({ limit: "1mb" }));

/* ---------- DB Connection ---------- */
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ DB Error:", err));

/* ---------- Health / Test ---------- */
app.get("/healthz", (req, res) => res.status(200).json({ ok: true }));
app.get("/test", (req, res) => res.send("🚀 السيرفر شغال تمام"));

/* ---------- Routes ---------- */
const productRoutes = require("./routes/products");
const variantsRoutes = require("./routes/variants");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth");
const contactRoute = require("./routes/contact");
const userRoutes = require("./routes/user");
const discountRulesRoutes = require("./routes/discountRules");
const discountsRoutes = require("./routes/discounts");

/* 🔎 راوتر المنتجات المحدّثة */
const productsRecentUpdatesRoutes = require("./routes/products.recent-updates");

/* ✅ راوتر المدفوعات الجديد */
const paymentsRoutes = require("./routes/payments");

/* ✅ جديد: راوتر reCAPTCHA */
const recaptchaRoutes = require("./routes/recaptcha");

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentsRoutes);

/* ✅ مهم: اربط recent-updates قبل راوتر المنتجات الأساسي */
app.use("/api/products", productsRecentUpdatesRoutes);
app.use("/api/products", productRoutes);

app.use("/api/variants", variantsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoute);
app.use("/api/users", userRoutes);
app.use("/api/discount-rules", discountRulesRoutes);
app.use("/api/discounts", discountsRoutes);

/* ✅ ربط reCAPTCHA v3 */
app.use("/api/recaptcha", recaptchaRoutes);

/* ---------- 404 ---------- */
app.use((req, res, next) => {
  res.status(404).json({ error: "الصفحة غير موجودة" });
});

/* ---------- Error Handler ---------- */
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "خطأ في الخادم" });
});

/* ---------- Server ---------- */
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

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
