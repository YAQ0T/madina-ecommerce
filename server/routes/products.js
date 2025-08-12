// routes/products.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product"); // انتبه لاسم الملف lowercase لو غيّرته
const Variant = require("../models/Variant");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// ✅ إنشاء منتج (أدمن فقط)
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, category, mainCategory, subCategory, description, images } =
      req.body;

    if (
      !name ||
      !mainCategory ||
      !subCategory ||
      !Array.isArray(images) ||
      images.length === 0
    ) {
      return res.status(400).json({
        error:
          "يرجى تعبئة الحقول الأساسية: name, mainCategory, subCategory, images[]",
      });
    }

    const product = await Product.create({
      name,
      category,
      mainCategory,
      subCategory,
      description,
      images,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/with-stats", async (req, res) => {
  try {
    const {
      mainCategory,
      subCategory,
      q,
      maxPrice,
      page = 1,
      limit = 9,
      sort = "new",
    } = req.query;

    const $match = {};
    if (mainCategory) $match.mainCategory = mainCategory;
    if (subCategory) $match.subCategory = subCategory;
    if (q) $match.$text = { $search: q };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.max(parseInt(limit, 10) || 9, 1);
    const skip = (pageNum - 1) * lim;

    // ترتيب
    let $sortStage = { createdAt: -1 };
    if (sort === "priceAsc") $sortStage = { minPrice: 1, createdAt: -1 };
    if (sort === "priceDesc") $sortStage = { minPrice: -1, createdAt: -1 };

    const pipeline = [
      { $match },

      // نجلب المتغيرات كلها للمنتج
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "product",
          as: "vars",
        },
      },

      // حوّل السعر إلى double بأمان (بدون $isNumber)
      {
        $addFields: {
          _prices: {
            $map: {
              input: "$vars",
              as: "v",
              in: {
                $convert: {
                  input: "$$v.price.amount",
                  to: "double",
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
          _stocks: {
            $map: {
              input: "$vars",
              as: "v",
              in: { $ifNull: ["$$v.stock.inStock", 0] },
            },
          },
        },
      },
      // صفِّر القيم غير الصالحة
      {
        $addFields: {
          _pricesClean: {
            $filter: {
              input: "$_prices",
              as: "p",
              cond: { $ne: ["$$p", null] },
            },
          },
        },
      },
      // احسب minPrice و totalStock
      {
        $addFields: {
          minPrice: {
            $cond: [
              { $gt: [{ $size: "$_pricesClean" }, 0] },
              { $min: "$_pricesClean" },
              0,
            ],
          },
          totalStock: { $sum: "$_stocks" },
        },
      },

      ...(maxPrice
        ? [{ $match: { minPrice: { $lte: Number(maxPrice) } } }]
        : []),

      {
        $facet: {
          meta: [{ $count: "total" }],
          items: [
            { $sort: $sortStage },
            { $skip: skip },
            { $limit: lim },
            {
              $project: {
                name: 1,
                description: 1,
                images: 1,
                mainCategory: 1,
                subCategory: 1,
                createdAt: 1,
                minPrice: 1,
                totalStock: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          items: 1,
          total: { $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0] },
        },
      },
    ];

    const [result] = await Product.aggregate(pipeline);
    const total = result?.total || 0;
    const items = result?.items || [];
    const totalPages = Math.ceil(total / lim);

    res.json({ items, total, totalPages, page: pageNum, limit: lim });
  } catch (err) {
    console.error("with-stats error:", err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Server error in /with-stats" });
  }
});
// ✅ جلب كل المنتجات (مع فلاتر اختيارية)
router.get("/", async (req, res) => {
  try {
    const { mainCategory, subCategory, q, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (mainCategory) filter.mainCategory = mainCategory;
    if (subCategory) filter.subCategory = subCategory;

    // بحث نصي بسيط بالاسم/الوصف (يتطلب فهرس نصي في السكيمة)
    if (q) {
      filter.$text = { $search: q };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const products = await Product.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ جلب منتج واحد — مع خيار تضمين المتغيرات ?withVariants=1
router.get("/:id", async (req, res) => {
  try {
    const withVariants = req.query.withVariants === "1";
    const product = await Product.findById(req.params.id).lean();

    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

    if (!withVariants) return res.json(product);

    const variants = await Variant.find({ product: product._id }).lean();
    res.json({ ...product, variants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ إرجاع Facets (المقاسات/الألوان المتاحة) لمنتج معيّن
router.get("/:id/facets", async (req, res) => {
  try {
    const productId = req.params.id;
    const facets = await Variant.aggregate([
      {
        $match: {
          product:
            Product.db.base.Types.ObjectId.createFromHexString(productId),
        },
      },
      {
        $group: {
          _id: null,
          measures: { $addToSet: "$measure" },
          measureSlugs: { $addToSet: "$measureSlug" },
          colors: { $addToSet: "$color.name" },
          colorSlugs: { $addToSet: "$colorSlug" },
        },
      },
      { $project: { _id: 0 } },
    ]);
    res.json(
      facets[0] || {
        measures: [],
        measureSlugs: [],
        colors: [],
        colorSlugs: [],
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ تعديل منتج (أدمن فقط)
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, category, mainCategory, subCategory, description, images } =
      req.body;

    const updateData = {
      ...(name && { name }),
      ...(category && { category }),
      ...(mainCategory && { mainCategory }),
      ...(subCategory && { subCategory }),
      ...(description && { description }),
      ...(Array.isArray(images) && images.length > 0 && { images }),
    };

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: "المنتج غير موجود" });

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ حذف منتج (أدمن فقط)
// ملاحظة: احذف أيضًا الـ Variants المرتبطة (اختياري حسب سياسة البيانات لديك)
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "المنتج غير موجود" });

    // خيار: احذف المتغيرات التابعة
    await Variant.deleteMany({ product: deleted._id });

    res.status(200).json({ message: "تم حذف المنتج ومتغيراته" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
