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

/* =============== Helpers =============== */
const isNonEmpty = (s) => typeof s === "string" && s.trim().length > 0;
const toOid = (id) =>
  mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null;
const slugify = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/\s+/g, "-");

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
  return discount.type === "amount"
    ? Math.max(0, amount - (discount.value || 0))
    : Math.max(0, amount - (amount * (discount.value || 0)) / 100);
}

async function resolveVariant({ productId, sku, measure, color }) {
  if (isNonEmpty(sku)) {
    const viaSku = await Variant.findOne({ "stock.sku": sku.trim() }).lean();
    if (viaSku) return viaSku;
  }
  const pid = toOid(productId);
  if (!pid) return null;

  const measureSlug = isNonEmpty(measure) ? slugify(measure) : null;
  const colorSlug = isNonEmpty(color) ? slugify(color) : null;

  const q = { product: pid };
  if (measureSlug) q.measureSlug = measureSlug;
  if (colorSlug) q.colorSlug = colorSlug;

  const viaDims = await Variant.findOne(q).lean();
  if (viaDims) return viaDims;

  const viaNames = await Variant.findOne({
    product: pid,
    ...(isNonEmpty(measure) ? { measure: measure } : {}),
    ...(isNonEmpty(color) ? { "color.name": color } : {}),
  }).lean();

  return viaNames || null;
}

function computeOrderTotals(items, appliedDiscount) {
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);

  let discountObj = {
    applied: false,
    ruleId: null,
    type: null,
    value: 0,
    amount: 0,
    threshold: 0,
    name: "",
  };

  if (appliedDiscount && typeof appliedDiscount === "object") {
    discountObj = {
      applied: !!appliedDiscount.applied,
      ruleId: appliedDiscount.ruleId || null,
      type:
        appliedDiscount.type === "percent" || appliedDiscount.type === "fixed"
          ? appliedDiscount.type
          : null,
      value: Number(appliedDiscount.value || 0) || 0,
      amount: Number(appliedDiscount.amount || 0) || 0,
      threshold: Number(appliedDiscount.threshold || 0) || 0,
      name: appliedDiscount.name || "",
    };
  }

  const total = Math.max(0, subtotal - discountObj.amount);
  return { subtotal, discount: discountObj, total };
}

/* ======================= إنشاء طلب COD ======================= */
router.post("/", verifyTokenOptional, async (req, res) => {
  try {
    const {
      address,
      notes,
      items: rawItems,
      paymentMethod = "cod",
      paymentStatus = "unpaid",
      status = "waiting_confirmation",
      discount: incomingDiscount,
    } = req.body || {};

    if (!isNonEmpty(address)) {
      return res.status(400).json({ message: "العنوان مطلوب" });
    }
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ message: "قائمة العناصر مطلوبة" });
    }
    if (paymentMethod !== "cod") {
      return res
        .status(400)
        .json({ message: "طريقة الدفع لهذا المسار يجب أن تكون cod" });
    }

    let userObj = undefined;
    if (req.user?.id) {
      const u = await User.findById(req.user.id).lean();
      if (u) {
        userObj = {
          _id: u._id,
          name: u.name || "",
          phone: u.phone || "",
          email: u.email || "",
        };
      }
    }

    const cleanItems = [];
    for (const it of rawItems) {
      const pid = toOid(it?.productId);
      const qty = Math.max(1, parseInt(it?.quantity, 10) || 0);
      if (!pid || !qty) continue;

      let variant = null;
      if (it?.variantId && toOid(it.variantId)) {
        variant = await Variant.findOne({
          _id: toOid(it.variantId),
          product: pid,
        }).lean();
      }
      if (!variant) {
        variant = await resolveVariant({
          productId: pid,
          sku: it?.sku,
          measure: it?.measure,
          color: it?.color,
        });
      }
      if (!variant) {
        return res.status(400).json({
          message: `تعذّر إيجاد المتغيّر لعنصر: ${it?.name || ""}`,
        });
      }

      const price = computeFinalAmount(variant.price || { amount: 0 });

      let image = it?.image || "";
      if (!image) {
        const vcImgs = Array.isArray(variant?.color?.images)
          ? variant.color.images.filter(Boolean)
          : [];
        if (vcImgs.length) image = vcImgs[0];
        else {
          const prod = await Product.findById(pid, { images: 1 }).lean();
          if (prod?.images?.length) image = prod.images[0];
        }
      }

      cleanItems.push({
        productId: pid,
        variantId: variant._id,
        name: String(it?.name || "").trim() || "منتج",
        quantity: qty,
        price,
        color: isNonEmpty(it?.color) ? String(it.color).trim() : undefined,
        measure: isNonEmpty(it?.measure)
          ? String(it.measure).trim()
          : undefined,
        sku: isNonEmpty(it?.sku)
          ? String(it.sku).trim()
          : variant?.stock?.sku || undefined,
        image: image || undefined,
      });
    }

    if (cleanItems.length === 0) {
      return res
        .status(400)
        .json({ message: "لم يتمكّن الخادم من بناء عناصر صالحة للطلب" });
    }

    const { subtotal, discount, total } = computeOrderTotals(
      cleanItems,
      incomingDiscount
    );

    const doc = await Order.create({
      user: userObj,
      guestInfo: { name: "", phone: "", email: "", address: "" },
      isGuest: !userObj,
      items: cleanItems,
      subtotal,
      discount,
      total,
      address: String(address).trim(),
      status: [
        "pending",
        "waiting_confirmation",
        "on_the_way",
        "delivered",
        "cancelled",
      ].includes(status)
        ? status
        : "waiting_confirmation",
      paymentMethod: "cod",
      paymentStatus: ["unpaid", "paid", "failed"].includes(paymentStatus)
        ? paymentStatus
        : "unpaid",
      reference: null,
      notes: isNonEmpty(notes) ? String(notes).trim() : "",
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return res.status(500).json({ message: "فشل إنشاء طلب COD" });
  }
});

/* ==================== تحضير طلب للبطاقة ==================== */
router.post("/prepare-card", verifyTokenOptional, async (req, res) => {
  try {
    const {
      address,
      notes,
      items: rawItems,
      guestInfo,
      discount: incomingDiscount,
    } = req.body || {};

    if (!isNonEmpty(address)) {
      return res.status(400).json({ message: "العنوان مطلوب" });
    }
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ message: "قائمة العناصر مطلوبة" });
    }

    let userObj = undefined;
    let guestObj = { name: "", phone: "", email: "", address: "" };

    if (req.user?.id) {
      const u = await User.findById(req.user.id).lean();
      if (u) {
        userObj = {
          _id: u._id,
          name: u.name || "",
          phone: u.phone || "",
          email: u.email || "",
        };
      }
    } else if (guestInfo && typeof guestInfo === "object") {
      guestObj = {
        name: isNonEmpty(guestInfo.name) ? guestInfo.name.trim() : "",
        phone: isNonEmpty(guestInfo.phone) ? guestInfo.phone.trim() : "",
        email: isNonEmpty(guestInfo.email) ? guestInfo.email.trim() : "",
        address: isNonEmpty(guestInfo.address) ? guestInfo.address.trim() : "",
      };
    }

    const cleanItems = [];
    for (const it of rawItems) {
      const pid = toOid(it?.productId);
      const qty = Math.max(1, parseInt(it?.quantity, 10) || 0);
      if (!pid || !qty) continue;

      let variant = null;
      if (it?.variantId && toOid(it.variantId)) {
        variant = await Variant.findOne({
          _id: toOid(it.variantId),
          product: pid,
        }).lean();
      }
      if (!variant) {
        variant = await resolveVariant({
          productId: pid,
          sku: it?.sku,
          measure: it?.measure,
          color: it?.color,
        });
      }
      if (!variant) {
        return res
          .status(400)
          .json({ message: `تعذّر إيجاد المتغيّر لعنصر: ${it?.name || ""}` });
      }

      const price = computeFinalAmount(variant.price || { amount: 0 });

      let image = it?.image || "";
      if (!image) {
        const vcImgs = Array.isArray(variant?.color?.images)
          ? variant.color.images.filter(Boolean)
          : [];
        if (vcImgs.length) image = vcImgs[0];
        else {
          const prod = await Product.findById(pid, { images: 1 }).lean();
          if (prod?.images?.length) image = prod.images[0];
        }
      }

      cleanItems.push({
        productId: pid,
        variantId: variant._id,
        name: String(it?.name || "").trim() || "منتج",
        quantity: qty,
        price,
        color: isNonEmpty(it?.color) ? String(it.color).trim() : undefined,
        measure: isNonEmpty(it?.measure)
          ? String(it.measure).trim()
          : undefined,
        sku: isNonEmpty(it?.sku)
          ? String(it.sku).trim()
          : variant?.stock?.sku || undefined,
        image: image || undefined,
      });
    }

    if (cleanItems.length === 0) {
      return res
        .status(400)
        .json({ message: "لم يتمكّن الخادم من بناء عناصر صالحة للطلب" });
    }

    const { subtotal, discount, total } = computeOrderTotals(
      cleanItems,
      incomingDiscount
    );

    const doc = await Order.create({
      user: userObj,
      guestInfo: userObj
        ? { name: "", phone: "", email: "", address: "" }
        : guestObj,
      isGuest: !userObj,
      items: cleanItems,
      subtotal,
      discount,
      total,
      address: String(address).trim(),
      status: "waiting_confirmation",
      paymentMethod: "card",
      paymentStatus: "unpaid",
      reference: null,
      notes: isNonEmpty(notes) ? String(notes).trim() : "",
    });

    return res.status(201).json({ _id: doc._id, total: doc.total });
  } catch (err) {
    console.error("POST /api/orders/prepare-card error:", err);
    return res.status(500).json({ message: "فشل تحضير طلب البطاقة" });
  }
});

/* =========== وسم الطلب مدفوعًا بالمرجع =========== */
router.patch("/by-reference/:reference/pay", async (req, res) => {
  try {
    const reference = String(req.params.reference || "").trim();
    if (!reference) return res.status(400).json({ message: "reference مطلوب" });

    const updated = await Order.findOneAndUpdate(
      { reference, paymentStatus: { $ne: "paid" } },
      { $set: { paymentStatus: "paid", status: "waiting_confirmation" } },
      { new: true }
    ).lean();

    if (!updated) {
      const existing = await Order.findOne({ reference }).lean();
      if (!existing)
        return res.status(404).json({ message: "طلب غير موجود لهذا المرجع" });
      return res.json({ message: "الطلب مدفوع مسبقًا", order: existing });
    }

    await Promise.all(
      (updated.items || []).map((ci) =>
        Variant.updateOne(
          { _id: ci.variantId, "stock.inStock": { $gte: ci.quantity } },
          { $inc: { "stock.inStock": -ci.quantity } }
        )
      )
    );

    return res.json(updated);
  } catch (err) {
    console.error("Error marking order paid:", err);
    res.status(500).json({ message: "فشل وسم الطلب مدفوع" });
  }
});

/* ======================= طلباتي (قائمة) ======================= */
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const uid = req.user?.id;
    if (!uid || !mongoose.isValidObjectId(uid)) {
      return res.status(401).json({ message: "توكن غير صالح" });
    }

    const orders = await Order.find({ "user._id": uid })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(orders || []);
  } catch (err) {
    console.error("GET /api/orders/mine error:", err);
    return res.status(500).json({ message: "فشل في جلب الطلبات" });
  }
});

/* ======================= طلبات مستخدم معين (قائمة) ======================= */
router.get("/user/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "معرّف المستخدم غير صالح" });
    }

    const isOwner = String(req.user?.id) === String(id);
    const isAdminUser = req.user?.role === "admin";

    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const orders = await Order.find({ "user._id": id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(orders || []);
  } catch (err) {
    console.error("GET /api/orders/user/:id error:", err);
    return res.status(500).json({ message: "فشل في جلب الطلبات" });
  }
});

/* ======================= تفاصيل طلب واحد (بالمسار الأبسط) ======================= */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "معرّف الطلب غير صالح" });
    }

    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });

    const isOwner =
      order?.user?._id && String(order.user._id) === String(req.user?.id);
    const isAdminUser = req.user?.role === "admin";

    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    return res.json(order);
  } catch (err) {
    console.error("GET /api/orders/:id error:", err);
    return res.status(500).json({ message: "فشل في جلب تفاصيل الطلب" });
  }
});

/* ======================= تفاصيل طلب واحد (يطابق مسارك الحالي) =======================
   GET /api/orders/user/:userId/order/:orderId
   - يبقي الواجهة كما هي بدون تعديل
==================================================================================== */
router.get("/user/:userId/order/:orderId", verifyToken, async (req, res) => {
  try {
    const { userId, orderId } = req.params;

    if (
      !mongoose.isValidObjectId(userId) ||
      !mongoose.isValidObjectId(orderId)
    ) {
      return res.status(400).json({ message: "معرّفات غير صالحة" });
    }

    const order = await Order.findOne({
      _id: orderId,
      "user._id": userId,
    }).lean();

    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });

    const isOwner = String(req.user?.id) === String(userId);
    const isAdminUser = req.user?.role === "admin";
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    return res.json(order);
  } catch (err) {
    console.error("GET /api/orders/user/:userId/order/:orderId error:", err);
    return res.status(500).json({ message: "فشل في جلب تفاصيل الطلب" });
  }
});

/* ======================= كل الطلبات (أدمن) ======================= */
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
