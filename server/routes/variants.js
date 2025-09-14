const express = require("express");
const router = express.Router();

const Variant = require("../models/Variant");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// دوال مساعدة
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

// ✅ لم نعد نكتب facets داخل Product
async function recomputeProductFacets(_productId) {
  return true;
}

// إنشاء متغير
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const { product, measure, measureUnit, color, price, stock, tags } =
      req.body;

    if (!product || !measure || !color?.name || !price?.amount || !stock?.sku) {
      return res.status(400).json({
        error:
          "حقول أساسية ناقصة: product, measure, color.name, price.amount, stock.sku",
      });
    }

    const created = await Variant.create({
      product,
      measure,
      measureUnit: measureUnit || "", // ✅ جديد
      color,
      price,
      stock,
      tags,
    });

    await recomputeProductFacets(created.product);

    const ret = created.toJSON();
    return res.status(201).json(ret);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        error: "تعارض فريد: SKU أو (measure+color) موجود مسبقًا لنفس المنتج",
      });
    }
    return res.status(400).json({ error: err.message || "فشل إنشاء المتغير" });
  }
});

// إنشاء مجموعة متغيرات (Bulk)
router.post("/bulk", verifyToken, isAdmin, async (req, res) => {
  try {
    const { variants } = req.body;
    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ error: "الرجاء إرسال مصفوفة variants" });
    }

    const created = await Variant.insertMany(variants, { ordered: false });

    const productIds = [...new Set(created.map((v) => String(v.product)))];
    await Promise.all(productIds.map((id) => recomputeProductFacets(id)));

    const items = created.map((d) => d.toJSON());
    return res.status(201).json({ createdCount: items.length, items });
  } catch (err) {
    return res
      .status(400)
      .json({ error: err.message || "فشل إنشاء المتغيرات (bulk)" });
  }
});

// جلب متغيرات مع فلترة (يدعم tags)
router.get("/", async (req, res) => {
  try {
    const {
      product,
      measure,
      color,
      measureSlug,
      colorSlug,
      tags,
      limit = 50,
      page = 1,
    } = req.query;

    const filter = {};
    if (product) filter.product = product;
    if (measureSlug) filter.measureSlug = String(measureSlug).toLowerCase();
    if (colorSlug) filter.colorSlug = String(colorSlug).toLowerCase();
    if (measure) filter.measure = measure;
    if (color) filter["color.name"] = color;

    if (tags) {
      const arr = String(tags)
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (arr.length > 0) filter.tags = { $all: arr };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const items = await Variant.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean();

    const withComputed = items.map((it) => {
      const finalAmount = computeFinalAmount(it.price);
      const active = isDiscountActive(it.price?.discount);
      const displayCompareAt = active
        ? it.price?.compareAt ?? it.price?.amount
        : null;
      return { ...it, finalAmount, isDiscountActive: active, displayCompareAt };
    });

    return res.json(withComputed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// جلب متغير واحد
router.get("/one", async (req, res) => {
  try {
    const { sku, product, measure, color } = req.query;

    let v;
    if (sku) {
      v = await Variant.findOne({ "stock.sku": sku }).lean();
    } else if (product && measure && color) {
      v = await Variant.findOne({
        product,
        measure,
        "color.name": color,
      }).lean();
    } else {
      return res
        .status(400)
        .json({ error: "أرسل sku أو (product + measure + color)" });
    }

    if (!v) return res.status(404).json({ error: "المتغير غير موجود" });

    const finalAmount = computeFinalAmount(v.price);
    const active = isDiscountActive(v.price?.discount);
    const displayCompareAt = active
      ? v.price?.compareAt ?? v.price?.amount
      : null;

    return res.json({
      ...v,
      finalAmount,
      isDiscountActive: active,
      displayCompareAt,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// خصم لمتغير محدد
router.post("/:id/discount", verifyToken, isAdmin, async (req, res) => {
  try {
    const { type = "percent", value = 0, startAt, endAt } = req.body || {};

    if (!["percent", "amount"].includes(type)) {
      return res.status(400).json({ error: "نوع الخصم غير صالح" });
    }
    if (typeof value !== "number" || value < 0) {
      return res.status(400).json({ error: "قيمة الخصم غير صالحة" });
    }

    const discount = { type, value };
    if (startAt) discount.startAt = new Date(startAt);
    if (endAt) discount.endAt = new Date(endAt);

    const updated = await Variant.findByIdAndUpdate(
      req.params.id,
      { $set: { "price.discount": discount } },
      { new: true, runValidators: true, context: "query" }
    );

    if (!updated) return res.status(404).json({ error: "المتغير غير موجود" });

    if (updated.price && updated.price.compareAt == null) {
      updated.price.compareAt = updated.price.amount;
      await updated.save();
    }

    return res.json(updated.toJSON());
  } catch (err) {
    return res.status(400).json({ error: err.message || "فشل ضبط الخصم" });
  }
});

// تعديل متغير
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const payload = req.body || {}; // ✅ يقبل measureUnit ضمنياً

    const updated = await Variant.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true, runValidators: true, context: "query" }
    );

    if (!updated) return res.status(404).json({ error: "المتغير غير موجود" });

    await recomputeProductFacets(updated.product);

    return res.json(updated.toJSON());
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        error: "تعارض فريد: SKU أو (measure+color) موجود مسبقًا لنفس المنتج",
      });
    }
    return res.status(400).json({ error: err.message || "فشل تعديل المتغير" });
  }
});

// حذف متغير
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await Variant.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "المتغير غير موجود" });

    await recomputeProductFacets(deleted.product);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: "فشل حذف المتغير" });
  }
});

// خصم مخزون ذري
router.post("/:id/decrement-stock", verifyToken, async (req, res) => {
  try {
    const { qty = 1 } = req.body;
    const upd = await Variant.updateOne(
      { _id: req.params.id, "stock.inStock": { $gte: qty } },
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

module.exports = router;
