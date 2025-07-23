const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json()); // VERY IMPORTANT

// DB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ DB Error:", err));
// TEST: Check if the connection is successful
app.get("/test", (req, res) => {
  res.send("🚀 السيرفر شغال تمام");
});

const productRoutes = require("./routes/products");
app.use("/api/products", productRoutes);

const orderRoutes = require("./routes/orders");
app.use("/api/orders", orderRoutes);
// Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const contactRoute = require("./routes/contact");
app.use("/api/contact", contactRoute);
