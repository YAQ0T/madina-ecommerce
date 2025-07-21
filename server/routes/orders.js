const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// ✅ إضافة طلب جديد
router.post("/", async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    const saved = await newOrder.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ جلب كل الطلبات
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("items.productId");
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ تحديث حالة الطلب
router.put("/:id", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "الطلب غير موجود" });
    res.status(200).json({ message: "تم حذف الطلب" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
