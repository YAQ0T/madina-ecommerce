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
const clampQty = (q) => Math.max(1, Math.min(9999, Math.floor(q || 1)));

const ALLOWED_PAYMENT_METHODS = ["card", "cod"];
const ALLOWED_PAYMENT_STATUSES = ["unpaid", "paid", "failed"];

// خصومات variant
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

// أفضل قاعدة خصم
async function findBestDiscountRule(subtotal) {
  const now = new Date();
  const rule = await DiscountRule.findOne({
    isActive: true,
    threshold: { $lte: subtotal },
    $and: [
      { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
      { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
    ],
  })
    .sort({ threshold: -1, priority: -1, createdAt: -1 })
    .lean();

  return rule || null;
}

/** يبني عناصر الطلب من عناصر العميل ويتحقق من المخزون ويعيد:
 * { cleanItems, serverSubtotal }  (ولا يقوم بتعديل المخزون)
 */
async function buildOrderItemsFromClientItems(items = []) {
  const cleanItems = [];
  let serverSubtotal = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    const productId = toCleanString(it.productId);
    const nameFromClient = toCleanString(it.name);
    const quantity = clampQty(toNumber(it.quantity, 1));

    if (!mongoose.isValidObjectId(productId)) {
      throw new Error(`productId غير صالح في العنصر رقم ${i + 1}`);
    }

    const color = toCleanString(it.color) || toCleanString(it.selectedColor);
    const measure =
      toCleanString(it.measure) || toCleanString(it.selectedMeasure);
    const sku = toCleanString(it.sku);

    // جلب المتغيّر
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
      throw new Error(
        `لم يتم العثور على المتغير المناسب (SKU أو اللون/المقاس) للمنتج في العنصر رقم ${
          i + 1
        }`
      );
    }

    const finalPrice = computeFinalAmount(variant.price);
    if (finalPrice <= 0) {
      throw new Error(`سعر المتغير غير صالح للعنصر رقم ${i + 1}`);
    }

    // تحقق الكمية
    if ((variant.stock?.inStock ?? 0) < quantity) {
      throw new Error(
        `الكمية غير كافية في المخزون للعنصر رقم ${i + 1} (SKU: ${
          variant.stock?.sku || "-"
        })`
      );
    }

    const product = await Product.findById(productId).lean();
    const productName = product?.name || nameFromClient || "منتج";

    cleanItems.push({
      productId: variant.product,
      variantId: variant._id,
      name: productName,
      quantity,
      price: finalPrice,
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

    serverSubtotal += finalPrice * quantity;
  }

  return { cleanItems, serverSubtotal };
}

/** يطبّق خصم الطلبات (إن وجد) */
async function computeOrderDiscount(subtotal) {
  let discountInfo = {
    applied: false,
    ruleId: null,
    type: null,
    value: 0,
    amount: 0,
    threshold: 0,
    name: "",
  };

  const rule = await findBestDiscountRule(subtotal);
  if (rule) {
    let amount = 0;
    if (rule.type === "percent") {
      amount = Math.max(0, (subtotal * rule.value) / 100);
    } else if (rule.type === "fixed") {
      amount = Math.max(0, Math.min(rule.value, subtotal));
    }

    discountInfo = {
      applied: amount > 0,
      ruleId: rule._id,
      type: rule.type,
      value: rule.value,
      amount,
      threshold: rule.threshold,
      name: rule.name || "",
    };
  }
  return discountInfo;
}

/** يخصم المخزون ذرّيًا */
async function decrementStock(cleanItems) {
  await Promise.all(
    cleanItems.map((ci) =>
      Variant.updateOne(
        { _id: ci.variantId, "stock.inStock": { $gte: ci.quantity } },
        { $inc: { "stock.inStock": -ci.quantity } }
      )
    )
  );
}

/* =====================================================
 *  1) إنشاء طلب COD (مباشر) — يتطلب حساب
 * ===================================================== */
router.post("/", verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const authUserId = req.user?.id || req.user?._id;
    if (!authUserId || !mongoose.isValidObjectId(authUserId)) {
      return res.status(401).json({ message: "مصادقة غير صالحة." });
    }

    const realUser = await User.findById(authUserId);
    if (!realUser)
      return res.status(401).json({ message: "المستخدم غير موجود." });

    const orderUser = {
      _id: realUser._id,
      name: realUser.name || "",
      phone: realUser.phone || "",
      email: realUser.email || "",
    };

    const address = toCleanString(body.address);
    if (!address) return res.status(400).json({ message: "العنوان مطلوب." });

    const rawStatus = toCleanString(body.status) || "waiting_confirmation";
    const status = ALLOWED_STATUSES.includes(rawStatus)
      ? rawStatus
      : "waiting_confirmation";

    const paymentMethod = ALLOWED_PAYMENT_METHODS.includes(body.paymentMethod)
      ? body.paymentMethod
      : "cod";
    const paymentStatus = ALLOWED_PAYMENT_STATUSES.includes(body.paymentStatus)
      ? body.paymentStatus
      : "unpaid";
    const notes = toCleanString(body.notes);

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length)
      return res.status(400).json({ message: "عناصر الطلب مطلوبة." });

    // بناء العناصر + الإجمالي
    const { cleanItems, serverSubtotal } = await buildOrderItemsFromClientItems(
      items
    );
    const discountInfo = await computeOrderDiscount(serverSubtotal);
    const finalTotal = Math.max(0, serverSubtotal - discountInfo.amount);

    // إنشاء الطلب
    const orderDoc = await Order.create({
      user: orderUser,
      isGuest: false,
      address,
      status,
      items: cleanItems,
      subtotal: serverSubtotal,
      discount: discountInfo,
      total: finalTotal,
      paymentMethod,
      paymentStatus, // unpaid
      notes,
    });

    // خصم المخزون مباشرة (COD)
    await decrementStock(cleanItems);

    const saved = await Order.findById(orderDoc._id).lean();
    return res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({ message: "فشل إنشاء الطلب" });
  }
});

/* =====================================================
 *  2) تحضير طلب بطاقة (Card) قبل التحويل للدفع — يدعم الضيف
 * ===================================================== */
router.post("/prepare-card", verifyTokenOptional, async (req, res) => {
  try {
    const body = req.body || {};

    const address = toCleanString(body.address);
    if (!address) return res.status(400).json({ message: "العنوان مطلوب." });

    const notes = toCleanString(body.notes);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length)
      return res.status(400).json({ message: "عناصر الطلب مطلوبة." });

    // من العميل: guestInfo اختياري للزوار
    const guestInfo = body.guestInfo || {};
    const guestName = toCleanString(guestInfo.name);
    const guestPhone = toCleanString(guestInfo.phone);
    const guestEmail = toCleanString(guestInfo.email);
    const guestAddress = toCleanString(guestInfo.address);

    // لو المستخدم مسجّل، استخدم بياناته؛ غير ذلك خزّن guestInfo
    let orderUser = null;
    let isGuest = true;

    const authUserId = req.user?.id || req.user?._id;
    if (authUserId && mongoose.isValidObjectId(authUserId)) {
      const realUser = await User.findById(authUserId);
      if (realUser) {
        orderUser = {
          _id: realUser._id,
          name: realUser.name || "",
          phone: realUser.phone || "",
          email: realUser.email || "",
        };
        isGuest = false;
      }
    }

    const { cleanItems, serverSubtotal } = await buildOrderItemsFromClientItems(
      items
    );
    const discountInfo = await computeOrderDiscount(serverSubtotal);
    const finalTotal = Math.max(0, serverSubtotal - discountInfo.amount);

    // ✅ الجديد: لو ضيف، نخزّن بياناته داخل user (بدون _id) ليظهر الاسم/الهاتف في الواجهة الحالية
    const userForDoc = orderUser || {
      name: guestName || "",
      phone: guestPhone || "",
      email: guestEmail || "",
      // لا نضع _id هنا
    };

    const orderDoc = await Order.create({
      user: userForDoc, // ← هيك الواجهة رح تشوف user.name/phone
      guestInfo: isGuest
        ? {
            name: guestName,
            phone: guestPhone,
            email: guestEmail,
            address: guestAddress || address,
          }
        : undefined,
      isGuest,
      address, // عنوان الشحن الفعلي
      status: "pending",
      items: cleanItems,
      subtotal: serverSubtotal,
      discount: discountInfo,
      total: finalTotal,
      paymentMethod: "card",
      paymentStatus: "unpaid",
      notes,
    });

    const saved = await Order.findById(orderDoc._id).lean();
    return res.status(201).json(saved);
  } catch (err) {
    console.error("Error preparing card order:", err);
    return res.status(500).json({ message: "فشل تحضير الطلب" });
  }
});

/* =====================================================
 *  3) ربط مرجع الدفع
 * ===================================================== */
router.patch("/:id/attach-reference", verifyToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const reference = toCleanString(req.body?.reference);
    if (!mongoose.isValidObjectId(orderId) || !reference) {
      return res.status(400).json({ message: "orderId/reference غير صالح." });
    }

    const updated = await Order.findByIdAndUpdate(
      orderId,
      { $set: { reference } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "الطلب غير موجود" });
    res.json(updated);
  } catch (err) {
    console.error("Error attaching reference:", err);
    res.status(500).json({ message: "فشل ربط المرجع" });
  }
});

/* =====================================================
 *  4) وسم الطلب مدفوعًا عبر المرجع (Webhook/Manual)
 * ===================================================== */
router.patch("/by-reference/:reference/pay", async (req, res) => {
  try {
    const reference = toCleanString(req.params.reference);
    if (!reference) return res.status(400).json({ message: "reference مطلوب" });

    const order = await Order.findOne({ reference }).lean();
    if (!order)
      return res.status(404).json({ message: "طلب غير موجود لهذا المرجع" });

    if (order.paymentStatus === "paid") {
      return res.json({ message: "الطلب مدفوع مسبقًا", order });
    }

    // خصم المخزون الآن (لأن الدفع اكتمل)
    const cleanItems = order.items || [];
    await decrementStock(cleanItems);

    const updated = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          paymentStatus: "paid",
          status: "waiting_confirmation",
        },
      },
      { new: true }
    ).lean();

    res.json(updated);
  } catch (err) {
    console.error("Error marking order paid:", err);
    res.status(500).json({ message: "فشل وسم الطلب مدفوع" });
  }
});

// ======================= جلب كل الطلبات (أدمن) =======================
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
    if (status === "delivered") {
      const updated = await Order.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status,
            paymentStatus: "paid",
          },
        },
        { new: true }
      ).lean();

      if (!updated) return res.status(404).json({ message: "الطلب غير موجود" });
      return res.json(updated);
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
