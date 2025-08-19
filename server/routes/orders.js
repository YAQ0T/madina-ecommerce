const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const Order = require("../models/Order");
const Product = require("../models/Product");
const Variant = require("../models/Variant");
const User = require("../models/User");

// ===== أدوات مساعدة آمنة =====
const ALLOWED_STATUSES = [
  "waiting_confirmation",
  "pending",
  "on_the_way",
  "delivered",
  "cancelled",
];
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const toCleanString = (v) => (isNonEmptyString(v) ? v.trim() : "");
const toNumber = (v, d = 0) => (typeof v === "number" && !isNaN(v) ? v : d);

// نفس منطق الخصم في موديل Variant
function isDiscountActive(discount = {}) {
  if (!discount || !discount.value) return false;
  const now = new Date();
  if (discount.startAt && now < discount.startAt) return false;
  if (discount.endAt && now > discount.endAt) return false;
  return true;
}
function computeFinalAmount(price = {}) {
  const amount = typeof price.amount === "number" ? price.amount : 0;
  if (!amount) return 0;
  const discount = price.discount || {};
  if (!isDiscountActive(discount)) return amount;
  return discount.type === "percent"
    ? Math.max(0, amount - (amount * discount.value) / 100)
    : Math.max(0, amount - discount.value);
}

// ======================= إنشاء طلب =======================
router.post("/", verifyToken, async (req, res) => {
  try {
    const body = req.body || {};

    // التحقق من المستخدم من التوكن
    const authUserId = req.user?.id || req.user?._id;
    if (!authUserId || !mongoose.isValidObjectId(authUserId)) {
      return res.status(401).json({ message: "مصادقة غير صالحة." });
    }

    // جلب المستخدم من DB لبناء الـ subdocument المطلوب في Order
    const dbUser = await User.findById(authUserId).lean();
    if (!dbUser) {
      return res.status(401).json({ message: "المستخدم غير موجود." });
    }
    const orderUser = {
      _id: dbUser._id,
      name: dbUser.name || "",
      phone: dbUser.phone || "",
      email: dbUser.email || "",
    };

    // العنوان
    const address = toCleanString(body.address);
    if (!address) {
      return res.status(400).json({ message: "العنوان مطلوب." });
    }

    // الحالة (اختيارية)
    const rawStatus = toCleanString(body.status) || "waiting_confirmation";
    const status = ALLOWED_STATUSES.includes(rawStatus)
      ? rawStatus
      : "waiting_confirmation";

    // العناصر
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return res.status(400).json({ message: "عناصر الطلب مطلوبة." });
    }

    // نبني عناصر الطلب بعد التحقق من المتغيرات/الأسعار
    const cleanItems = [];
    let serverTotal = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      const productId = toCleanString(it.productId);
      const nameFromClient = toCleanString(it.name);
      const quantity = Math.max(1, toNumber(it.quantity, 1));

      if (!mongoose.isValidObjectId(productId)) {
        return res
          .status(400)
          .json({ message: `productId غير صالح في العنصر رقم ${i + 1}` });
      }

      const color = toCleanString(it.color) || toCleanString(it.selectedColor);
      const measure =
        toCleanString(it.measure) || toCleanString(it.selectedMeasure);
      const sku = toCleanString(it.sku); // اختياري

      // نبحث عن المتغير: أولوية بالـ SKU، وإلا product+measure+color
      let variant;
      if (sku) {
        variant = await Variant.findOne({
          "stock.sku": sku,
          product: productId,
        });
      } else if (measure && color) {
        variant = await Variant.findOne({
          product: productId,
          measure,
          "color.name": color,
        });
      }

      if (!variant) {
        return res.status(404).json({
          message: `لم يتم العثور على المتغير المناسب (SKU أو اللون/المقاس) للمنتج في العنصر رقم ${
            i + 1
          }`,
        });
      }

      // السعر النهائي من السيرفر
      const finalPrice = computeFinalAmount(variant.price);
      if (finalPrice <= 0) {
        return res.status(400).json({
          message: `سعر المتغير غير صالح للعنصر رقم ${i + 1}`,
        });
      }

      // التحقق من المخزون
      if ((variant.stock?.inStock ?? 0) < quantity) {
        return res.status(409).json({
          message: `الكمية غير كافية في المخزون للعنصر رقم ${i + 1} (SKU: ${
            variant.stock?.sku || "-"
          })`,
        });
      }

      const product = await Product.findById(productId).lean();
      const productName = product?.name || nameFromClient || "منتج";

      cleanItems.push({
        productId: variant.product,
        variantId: variant._id,
        name: productName,
        quantity,
        price: finalPrice, // سعر الوحدة
        color: variant.color?.name || color || null,
        measure: variant.measure || measure || null,
        sku: variant.stock?.sku || sku || null,
        image:
          Array.isArray(variant.color?.images) && variant.color.images.length
            ? variant.color.images[0]
            : Array.isArray(product?.images) && product.images.length
            ? product.images[0]
            : null,
      });

      serverTotal += finalPrice * quantity;
    }

    // إنشاء الطلب
    const orderDoc = await Order.create({
      user: orderUser,
      address,
      status,
      total: serverTotal,
      items: cleanItems,
    });

    // خصم المخزون ذرّيًا بعد الإنشاء
    await Promise.all(
      cleanItems.map((ci) =>
        Variant.updateOne(
          { _id: ci.variantId, "stock.inStock": { $gte: ci.quantity } },
          { $inc: { "stock.inStock": -ci.quantity } }
        )
      )
    );

    const saved = await Order.findById(orderDoc._id).lean();
    return res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({ message: "فشل إنشاء الطلب" });
  }
});

// ======================= أوامر إدارية/مستخدم =======================

// جلب كل الطلبات (أدمن)
router.get("/", verifyToken, isAdmin, async (_req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "فشل في جلب الطلبات" });
  }
});

// تحديث حالة الطلب (أدمن)
router.patch("/:id/status", verifyToken, isAdmin, async (req, res) => {
  try {
    const rawStatus = toCleanString(req.body?.status);
    const status = ALLOWED_STATUSES.includes(rawStatus) ? rawStatus : undefined;

    if (!status) {
      return res.status(400).json({
        message: `حالة غير صالحة. القيم المسموحة: ${ALLOWED_STATUSES.join(
          ", "
        )}`,
      });
    }

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "الطلب غير موجود" });
    res.json(updated);
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ message: "فشل تحديث الحالة" });
  }
});

// طلبات مستخدم
router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const requesterId = String(req.user?.id || req.user?._id || "");
    const { userId } = req.params;

    const isSelf = requesterId === String(userId);
    if (!isSelf && req.user?.role !== "admin") {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const orders = await Order.find({ "user._id": userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (err) {
    console.error("Error fetching user orders:", err);
    res.status(500).json({ message: "فشل في جلب الطلبات" });
  }
});

// تفاصيل طلب لمستخدم
router.get("/user/:userId/order/:orderId", verifyToken, async (req, res) => {
  try {
    const requesterId = String(req.user?.id || req.user?._id || "");
    const { userId, orderId } = req.params;

    const isSelf = requesterId === String(userId);
    if (!isSelf && req.user?.role !== "admin") {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const order = await Order.findOne({
      _id: orderId,
      "user._id": userId,
    }).lean();

    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    res.json(order);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "فشل في جلب تفاصيل الطلب" });
  }
});

// حذف طلب (أدمن)
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "الطلب غير موجود" });
    res.json({ message: "تم حذف الطلب بنجاح" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ message: "فشل حذف الطلب" });
  }
});

module.exports = router;
