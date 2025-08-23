const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
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

/* ---------- Core Middleware ---------- */
app.use(express.json({ limit: "1mb" }));
app.set("trust proxy", 1);

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

app.use("/api/auth", authRoutes);

/* ✅ مهم: اربط recent-updates قبل راوتر المنتجات الأساسي */
app.use("/api/products", productsRecentUpdatesRoutes);
app.use("/api/products", productRoutes);

app.use("/api/variants", variantsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoute);
app.use("/api/users", userRoutes);

app.use("/api/discount-rules", discountRulesRoutes);
app.use("/api/discounts", discountsRoutes);

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
