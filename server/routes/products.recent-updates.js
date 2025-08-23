const express = require("express");

// عدّل المسارات حسب مشروعك إذا لزم
const Product = require("../models/Product");
const Variant = require("../models/Variant");

const router = express.Router();

/* ===== Helpers: نفس منطق الخصم الذي لديك ===== */
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

/**
 * GET /api/products/recent-updates
 * يرجّع المنتجات التي لديها Variants تم تحديثها خلال آخر N أيام (افتراض 7)
 * يدعم: mainCategory, subCategory, q, ownership, tags, page, limit, days
 */
router.get("/recent-updates", async (req, res) => {
  try {
    const {
      days = "7",
      page = "1",
      limit = "9",
      mainCategory,
      subCategory,
      q,
      ownership,
      tags, // comma-separated: color:red,measure:xl
    } = req.query;

    const daysNum = Math.max(1, parseInt(days, 10) || 7);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(60, Math.max(1, parseInt(limit, 10) || 9));
    const threshold = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    // فلترة الـ Variants التي تعتبر "محدّثة مؤخرًا"
    const variantMatch = {
      $or: [
        { updatedAt: { $gte: threshold } },
        { "price.discount.startAt": { $gte: threshold } },
        { "price.discount.endAt": { $gte: threshold } },
      ],
    };

    // فلترة tags على مستوى الـ Variant (color:xx, measure:yy ...)
    if (typeof tags === "string" && tags.trim()) {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagsArray.length) {
        variantMatch.tags = { $all: tagsArray };
      }
    }

    // IDs المنتجات التي لديها أي تحديث خلال الفترة
    const productIds = await Variant.distinct("product", variantMatch);
    if (!productIds || productIds.length === 0) {
      return res.json({
        items: [],
        totalPages: 1,
        total: 0,
        updatedSinceDays: daysNum,
        threshold,
      });
    }

    // فلترة المنتجات نفسها
    const productMatch = { _id: { $in: productIds } };
    if (mainCategory && mainCategory !== "الكل") {
      productMatch.mainCategory = mainCategory;
    }
    if (subCategory) {
      productMatch.subCategory = subCategory;
    }
    if (q && String(q).trim()) {
      const regex = new RegExp(String(q).trim(), "i");
      productMatch.$or = [{ name: regex }, { description: regex }];
    }
    // ⚠️ عدّل هذا حسب حقل الملكية لديك (مثلاً sourceType أو ownerType)
    if (ownership && ["ours", "local"].includes(String(ownership))) {
      productMatch.ownership = ownership;
    }

    const total = await Product.countDocuments(productMatch);

    // جلب منتجات الصفحة الحالية
    const products = await Product.find(productMatch, {
      name: 1,
      description: 1,
      images: 1,
      mainCategory: 1,
      subCategory: 1,
    })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // جلب Variants لهذه الصفحة فقط
    const pageProductIds = products.map((p) => p._id);
    const pageVariants = await Variant.find(
      { product: { $in: pageProductIds } },
      {
        product: 1,
        "price.amount": 1,
        "price.compareAt": 1,
        "price.discount": 1,
        "stock.inStock": 1,
      }
    ).lean();

    // حساب minPrice & totalStock لكل منتج
    const statsByProduct = new Map();
    for (const v of pageVariants) {
      const pid = String(v.product);
      const finalAmount = computeFinalAmount(v.price || {});
      const stock =
        v.stock && typeof v.stock.inStock === "number" ? v.stock.inStock : 0;

      if (!statsByProduct.has(pid)) {
        statsByProduct.set(pid, { minPrice: finalAmount, totalStock: stock });
      } else {
        const s = statsByProduct.get(pid);
        s.minPrice = Math.min(s.minPrice, finalAmount);
        s.totalStock += stock;
        statsByProduct.set(pid, s);
      }
    }

    const items = products.map((p) => {
      const s = statsByProduct.get(String(p._id)) || {
        minPrice: 0,
        totalStock: 0,
      };
      return {
        _id: p._id,
        name: p.name || "",
        description: p.description || "",
        images: Array.isArray(p.images) ? p.images : [],
        mainCategory: p.mainCategory,
        subCategory: p.subCategory,
        minPrice: s.minPrice,
        totalStock: s.totalStock,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    return res.json({
      items,
      totalPages,
      total,
      updatedSinceDays: daysNum,
      threshold,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error in /recent-updates",
      message: err?.message || "Unknown error",
    });
  }
});

module.exports = router;
