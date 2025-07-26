const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const Product = require("../models/Product");
// ✅ إضافة طلب جديد (مفتوح لأي مستخدم مسجل)
router.post("/", verifyToken, async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    // ✅ التحقق أولًا قبل أي خصم
    for (const item of newOrder.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({ message: `المنتج غير موجود` });
      }

      if (product.quantity < item.quantity) {
        console.log("طلب:", item.quantity, "المتوفر:", product.quantity);

        return res.status(400).json({
          message: `الكمية المطلوبة للمنتج "${product.name}" غير متوفرة. فقط ${product.quantity} متوفر.`,
        });
      }
    }

    const saved = await newOrder.save();
    for (const item of newOrder.items) {
      const productId = item.productId;
      const quantityOrdered = item.quantity;

      await Product.findByIdAndUpdate(
        productId,
        { $inc: { quantity: -quantityOrdered } }, // ⬅️ تقليل الكمية
        { new: true }
      );
    }
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ جلب كل الطلبات (أدمن فقط)
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("items.productId");
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ تحديث حالة الطلب (أدمن فقط)
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "الطلب غير موجود" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ حذف الطلب (أدمن فقط)
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "الطلب غير موجود" });
    res.status(200).json({ message: "تم حذف الطلب" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
