const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Variant = require("../models/Variant");
const {
  verifyToken,
  isAdmin,
  isDealerOrAdmin,
  verifyTokenOptional,
} = require("../middleware/authMiddleware");

/* =========================
 * Helpers
 * ========================= */
function isDiscountActive(discount = {}) {
  if (!discount || !discount.value) return false;
  const now = new Date();
  if (discount.startAt && now < discount.startAt) return false;
  if (discount.endAt && now > discount.endAt) return false;
  return true;
}
function computeFinalAmount(price = {}) {
  const amount = typeof price.amount === "number" ? price.amount : 0;
  const discount = price.discount || {};
  if (!isDiscountActive(discount)) return amount;
  return discount.type === "amount"
    ? Math.max(0, amount - (discount.value || 0))
    : Math.max(0, amount - (amount * (discount.value || 0)) / 100);
}

/* =========================
 * GET /api/variants
 * قراءة قائمة المتغيّرات
 * يدعم:
 *   - product=<productId>
 *   - page (افتراضي 1)
 *   - limit (افتراضي 50)
 *   - q: نص بحث بسيط في measure/color/tags/sku
 * الوصول: عام/اختياري (حتى الواجهة تقدر تجيبها بدون 401)
 * ========================= */
router.get("/", verifyTokenOptional, async (req, res) => {
  try {
    const { product, page = 1, limit = 50, q } = req.query;

    const filters = {};
    if (product && mongoose.isValidObjectId(String(product))) {
      filters.product = new mongoose.Types.ObjectId(String(product));
    }
    if (q && String(q).trim()) {
      const term = String(q).trim();
      filters.$or = [
        { measure: new RegExp(term, "i") },
        { "color.name": new RegExp(term, "i") },
        { "color.code": new RegExp(term, "i") },
        { "stock.sku": new RegExp(term, "i") },
        { tags: new RegExp(term, "i") },
      ];
    }

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lm = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
    const skip = (pg - 1) * lm;

    const [items, total] = await Promise.all([
      Variant.find(filters).sort({ _id: -1 }).skip(skip).limit(lm).lean(),
      Variant.countDocuments(filters),
    ]);

    // حقن حقول محسوبة كما يفعل الـ Schema (لو ما انطبقت التحويلات)
    const mapped = items.map((v) => {
      const finalAmount = computeFinalAmount(v.price || {});
      const isActive = isDiscountActive(v.price?.discount);
      const displayCompareAt = isActive
        ? v.price?.compareAt ?? v.price?.amount
        : null;
      return {
        ...v,
        finalAmount,
        isDiscountActive: isActive,
        displayCompareAt,
      };
    });

    return res.json({
      page: pg,
      limit: lm,
      total,
      items: mapped,
    });
  } catch (err) {
    console.error("GET /api/variants error:", err);
    return res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/* =========================
 * POST /api/variants
 * إنشاء متغيّر
 * الوصول: أدمن أو تاجر
 * ========================= */
router.post("/", verifyToken, isDealerOrAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    // ضمان compareAt:
    if (body?.price && body.price.compareAt == null) {
      body.price.compareAt = body.price.amount;
    }
    const v = await Variant.create(body);
    return res.status(201).json(v);
  } catch (err) {
    console.error("POST /api/variants error:", err);
    return res.status(400).json({ message: err.message });
  }
});

/* =========================
 * PUT /api/variants/:id
 * تعديل متغيّر
 * الوصول: أدمن أو تاجر
 * ========================= */
router.put("/:id", verifyToken, isDealerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "معرّف غير صالح" });

    const update = req.body || {};
    if (update?.price && update.price.compareAt == null) {
      update.price.compareAt = update.price.amount;
    }

    const doc = await Variant.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) return res.status(404).json({ message: "المتغيّر غير موجود" });
    const finalAmount = computeFinalAmount(doc.price || {});
    const isActive = isDiscountActive(doc.price?.discount);
    const displayCompareAt = isActive
      ? doc.price?.compareAt ?? doc.price?.amount
      : null;

    return res.json({
      ...doc,
      finalAmount,
      isDiscountActive: isActive,
      displayCompareAt,
    });
  } catch (err) {
    console.error("PUT /api/variants/:id error:", err);
    return res.status(400).json({ message: err.message });
  }
});

/* =========================
 * DELETE /api/variants/:id
 * حذف متغيّر
 * الوصول: أدمن أو تاجر
 * ========================= */
router.delete("/:id", verifyToken, isDealerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "معرّف غير صالح" });

    const del = await Variant.deleteOne({ _id: id });
    if (!del.deletedCount)
      return res.status(404).json({ message: "المتغيّر غير موجود" });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/variants/:id error:", err);
    return res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/* =========================
 * POST /api/variants/:id/reserve
 * حجز/تنقيص المخزون (مثال)
 * الوصول: أدمن أو تاجر
 * ========================= */
router.post("/:id/reserve", verifyToken, isDealerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "معرّف غير صالح" });

    const qty = Math.max(1, parseInt(req.body?.qty, 10) || 1);
    const upd = await Variant.updateOne(
      { _id: id, "stock.inStock": { $gte: qty } },
      { $inc: { "stock.inStock": -qty } }
    );
    if (!upd.modifiedCount) {
      return res.status(409).json({ error: "الكمية غير كافية" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
 * POST /api/variants/:id/discount
 * ضبط خصم للمتغيّر
 * الوصول: أدمن أو تاجر
 * ========================= */
router.post("/:id/discount", verifyToken, isDealerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "معرّف غير صالح" });

    const { type = "percent", value = 0, startAt, endAt } = req.body || {};
    const update = {
      "price.discount.type": type,
      "price.discount.value": Number(value) || 0,
      "price.discount.startAt": startAt ? new Date(startAt) : undefined,
      "price.discount.endAt": endAt ? new Date(endAt) : undefined,
    };

    const doc = await Variant.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ message: "المتغيّر غير موجود" });

    const finalAmount = computeFinalAmount(doc.price || {});
    const isActive = isDiscountActive(doc.price?.discount);
    const displayCompareAt = isActive
      ? doc.price?.compareAt ?? doc.price?.amount
      : null;

    return res.json({
      ...doc,
      finalAmount,
      isDiscountActive: isActive,
      displayCompareAt,
    });
  } catch (err) {
    console.error("POST /api/variants/:id/discount error:", err);
    return res.status(400).json({ message: err.message });
  }
});

/* =========================
 * POST /api/variants/:id/discount/reset
 * إلغاء الخصم
 * الوصول: أدمن أو تاجر
 * ========================= */
router.post(
  "/:id/discount/reset",
  verifyToken,
  isDealerOrAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id))
        return res.status(400).json({ message: "معرّف غير صالح" });

      const doc = await Variant.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            "price.discount.type": "percent",
            "price.discount.value": 0,
            "price.discount.startAt": undefined,
            "price.discount.endAt": undefined,
          },
        },
        { new: true }
      ).lean();

      if (!doc) return res.status(404).json({ message: "المتغيّر غير موجود" });

      const finalAmount = computeFinalAmount(doc.price || {});
      const isActive = isDiscountActive(doc.price?.discount);
      const displayCompareAt = isActive
        ? doc.price?.compareAt ?? doc.price?.amount
        : null;

      return res.json({
        ...doc,
        finalAmount,
        isDiscountActive: isActive,
        displayCompareAt,
      });
    } catch (err) {
      console.error("POST /api/variants/:id/discount/reset error:", err);
      return res.status(400).json({ message: err.message });
    }
  }
);

module.exports = router;
