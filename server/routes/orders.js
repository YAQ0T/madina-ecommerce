const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User"); // ✅ لازم تستورد User
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// ✅ إضافة طلب جديد (مفتوح لأي مستخدم مسجل)
router.post("/", verifyToken, async (req, res) => {
  try {
    const userFromDb = await User.findById(req.user.id).select("name phone");

    if (!userFromDb) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    const newOrder = new Order({
      ...req.body,
      user: {
        _id: req.user.id,
        name: userFromDb.name,
        phone: userFromDb.phone,
      },
    });

    // ✅ التحقق أولًا قبل أي خصم
    // ✅ التحقق وأخذ اللون والمقاس
    for (const item of newOrder.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({ message: `المنتج غير موجود` });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          message: `الكمية المطلوبة للمنتج "${product.name}" غير متوفرة. فقط ${product.quantity} متوفر.`,
        });
      }

      // هنا ممكن تتحقق إذا اللون أو المقاس موجود في المنتج

      if (item.color && !product.colors.includes(item.color)) {
        return res.status(400).json({
          message: `اللون ${item.color} غير متوفر لهذا المنتج.`,
        });
      }

      if (item.measure && !product.measures.includes(item.measure)) {
        return res.status(400).json({
          message: `المقاس ${item.measure} غير متوفر لهذا المنتج.`,
        });
      }
    }

    const saved = await newOrder.save();

    // ✅ تقليل الكمية بعد حفظ الطلب
    for (const item of newOrder.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
    }

    res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating order:", err);
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

// ✅ جلب الطلبات الخاصة بمستخدم محدد (يجب أن يكون هو نفسه)
router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    if (String(req.user.id) !== req.params.userId) {
      return res.status(403).json({ message: "غير مصرح لك بعرض هذه الطلبات" });
    }

    const orders = await Order.find({ "user._id": req.user.id }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching user orders:", err);
    res.status(500).json({ message: "فشل في جلب الطلبات" });
  }
});

router.get("/user/:userId/order/:orderId", verifyToken, async (req, res) => {
  try {
    // تحقق أن المستخدم يطلب تفاصيل طلبه فقط
    if (String(req.user.id) !== req.params.userId) {
      return res.status(403).json({ message: "غير مصرح لك بعرض هذا الطلب" });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      "user._id": req.user.id,
    }).populate("items.productId");

    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    res.json(order);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "فشل في جلب تفاصيل الطلب" });
  }
});

module.exports = router;
