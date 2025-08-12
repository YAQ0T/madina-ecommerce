const express = require("express");
const router = express.Router();

// ⚠️ تأكد من اسم الملف/الموديل بحرف V كبير
const Variant = require("../models/Variant");
const Product = require("../models/Product");

const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// دالة مساعدة: إعادة بناء واجهات المنتج (المقاسات/الألوان) بعد أي تغيير بالمتغيرات
async function recomputeProductFacets(productId) {
  const variants = await Variant.find({ product: productId }).lean();
  const measures = [...new Set(variants.map((v) => v.measure).filter(Boolean))];
  const colors = [
    ...new Set(variants.map((v) => v.color?.name).filter(Boolean)),
  ];

  await Product.updateOne({ _id: productId }, { $set: { measures, colors } });
}

// =======================
// إنشاء متغير واحد (أدمن فقط)
// =======================
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const { product, measure, color, price, stock, tags } = req.body;

    if (!product || !measure || !color?.name || !price?.amount || !stock?.sku) {
      return res.status(400).json({
        error:
          "حقول أساسية ناقصة: product, measure, color.name, price.amount, stock.sku",
      });
    }

    const created = await Variant.create({
      product,
      measure,
      color,
      price,
      stock,
      tags,
    });

    // إعادة بناء قوائم المقاسات/الألوان للمنتج
    await recomputeProductFacets(created.product);

    res.status(201).json(created);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        error: "تعارض فريد: SKU أو (measure+color) موجود مسبقًا لنفس المنتج",
      });
    }
    res.status(400).json({ error: err.message || "فشل إنشاء المتغير" });
  }
});

// =======================
// إنشاء مجموعة متغيرات (Bulk) — أدمن
// =======================
router.post("/bulk", verifyToken, isAdmin, async (req, res) => {
  try {
    const { variants } = req.body;
    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ error: "الرجاء إرسال مصفوفة variants" });
    }

    const created = await Variant.insertMany(variants, { ordered: false });

    // إعادة بناء واجهات المنتجات المتأثرة مرة واحدة لكل منتج
    const productIds = [...new Set(created.map((v) => String(v.product)))];
    await Promise.all(productIds.map((id) => recomputeProductFacets(id)));

    res.status(201).json({ createdCount: created.length, items: created });
  } catch (err) {
    // قد يحوي أخطاء متعددة في bulk، لكن نعيد الرسالة العامة
    res
      .status(400)
      .json({ error: err.message || "فشل إنشاء المتغيرات (bulk)" });
  }
});

// =======================
// جلب متغيرات مع فِلترة
// =======================
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
    if (measure) filter.measure = measure; // بديل لو لم يُرسل slug
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

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// جلب متغير واحد بالـ SKU أو بالتركيبة
// =======================
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
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// تعديل متغير (أدمن فقط)
// =======================
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    // نستخدم $set حتى لا نستبدل كائنات متداخلة بالكامل بالخطأ
    const payload = req.body || {};

    const updated = await Variant.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      {
        new: true,
        runValidators: true,
        context: "query", // مهم لبعض الفاليديشن والهوكس
      }
    );

    if (!updated) return res.status(404).json({ error: "المتغير غير موجود" });

    // إعادة بناء واجهات المنتج بعد التعديل
    await recomputeProductFacets(updated.product);

    res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        error: "تعارض فريد: SKU أو (measure+color) موجود مسبقًا لنفس المنتج",
      });
    }
    res.status(400).json({ error: err.message || "فشل تعديل المتغير" });
  }
});

// =======================
// حذف متغير (أدمن فقط)
// =======================
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await Variant.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "المتغير غير موجود" });

    await recomputeProductFacets(deleted.product);

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "فشل حذف المتغير" });
  }
});

// =======================
// خصم مخزون ذري عند الدفع
// =======================
router.post("/:id/decrement-stock", verifyToken, async (req, res) => {
  try {
    const { qty = 1 } = req.body;
    const upd = await Variant.updateOne(
      { _id: req.params.id, "stock.inStock": { $gte: qty } },
      { $inc: { "stock.inStock": -qty } }
    );
    if (!upd.modifiedCount)
      return res.status(409).json({ error: "الكمية غير كافية" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
