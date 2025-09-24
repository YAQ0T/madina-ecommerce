// server/routes/orders.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const {
  verifyToken,
  verifyTokenOptional,
  isAdmin,
} = require("../middleware/authMiddleware");

const Order = require("../models/Order");
const Product = require("../models/Product");
const Variant = require("../models/Variant");
const User = require("../models/User");
const DiscountRule = require("../models/DiscountRule");

/* ... بقية المساعدات والراوتات كما كانت ... */

// خصم مخزون كل عنصر
async function decrementStock(cleanItems) {
  await Promise.all(
    (cleanItems || []).map((ci) =>
      Variant.updateOne(
        { _id: ci.variantId, "stock.inStock": { $gte: ci.quantity } },
        { $inc: { "stock.inStock": -ci.quantity } }
      )
    )
  );
}

/* =====================================================
 *  4) وسم الطلب مدفوعًا عبر المرجع (Webhook/Manual) — ATOMIC
 * ===================================================== */
router.patch("/by-reference/:reference/pay", async (req, res) => {
  try {
    const reference = toCleanString(req.params.reference);
    if (!reference) return res.status(400).json({ message: "reference مطلوب" });

    // Atomically move from unpaid -> paid
    const updated = await Order.findOneAndUpdate(
      { reference, paymentStatus: { $ne: "paid" } },
      { $set: { paymentStatus: "paid", status: "waiting_confirmation" } },
      { new: true }
    ).lean();

    if (!updated) {
      // either not found or already paid
      const existing = await Order.findOne({ reference }).lean();
      if (!existing)
        return res.status(404).json({ message: "طلب غير موجود لهذا المرجع" });
      return res.json({ message: "الطلب مدفوع مسبقًا", order: existing });
    }

    // Decrement stock once after successful atomic update
    const cleanItems = Array.isArray(updated.items) ? updated.items : [];
    await decrementStock(cleanItems);

    return res.json(updated);
  } catch (err) {
    console.error("Error marking order paid:", err);
    res.status(500).json({ message: "فشل وسم الطلب مدفوع" });
  }
});

/* ======================= جلب كل الطلبات (أدمن) ======================= */
router.get("/", verifyToken, isAdmin, async (_req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "فشل في جلب الطلبات" });
  }
});

module.exports = router;
