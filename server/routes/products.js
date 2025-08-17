// server/routes/products.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Variant = require("../models/Variant");
const {
  verifyToken,
  isAdmin,
  verifyTokenOptional,
} = require("../middleware/authMiddleware");

// ------- أدوات مساعدة -------
const slugify = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/\s+/g, "-");

function buildWantedTags(query = {}) {
  const wanted = [];

  if (query.tags) {
    const arr = String(query.tags)
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    wanted.push(...arr);
  }

  if (query.colorSlug)
    wanted.push(`color:${String(query.colorSlug).toLowerCase()}`);
  if (query.measureSlug)
    wanted.push(`measure:${String(query.measureSlug).toLowerCase()}`);

  if (query.color) wanted.push(`color:${slugify(query.color)}`);
  if (query.measure) wanted.push(`measure:${slugify(query.measure)}`);

  return Array.from(new Set(wanted));
}

/**
 * ✅ فلترة الملكية:
 * - تُفعّل فقط عندما يكون المستخدم أدمن أو تاجر (canUseOwnership = true)
 * - غير ذلك يتم تجاهل بارامتر ownership/isLocal
 */
function readOwnershipFilterFromQuery(query = {}, canUseOwnership = false) {
  if (!canUseOwnership) return {};

  // ownership=ours|local
  if (query.ownership && ["ours", "local"].includes(String(query.ownership))) {
    return { ownershipType: String(query.ownership) };
  }

  // isLocal=true|false  => local/ours
  if (typeof query.isLocal !== "undefined") {
    const val = String(query.isLocal).toLowerCase();
    if (["true", "1", "yes"].includes(val)) return { ownershipType: "local" };
    if (["false", "0", "no"].includes(val)) return { ownershipType: "ours" };
  }

  return {};
}

// ⬇️ نفعّل قراءة التوكن اختياريًا لكل مسارات هذا الراوتر
router.use(verifyTokenOptional);

// ✅ إنشاء منتج (أدمن فقط)
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      mainCategory,
      subCategory,
      description,
      images,
      // اختياري: ownershipType
    } = req.body;

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

    let ownershipPatch = {};
    // التحقق من قيمة ownershipType من البودي (لو أرسلت)
    const { ownershipType } = req.body || {};
    if (typeof ownershipType !== "undefined") {
      const v = String(ownershipType);
      if (!["ours", "local"].includes(v)) {
        return res.status(400).json({
          error: "قيمة ownershipType غير صحيحة. القيم: ours | local",
        });
      }
      ownershipPatch.ownershipType = v;
    }

    const product = await Product.create({
      name,
      category,
      mainCategory,
      subCategory,
      description,
      images,
      ...ownershipPatch,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ /with-stats — مع حساب finalAmount ضمن نافذة الخصم + دعم فلترة الملكية (أدمن/تاجر فقط)
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

    const wantedTags = buildWantedTags(req.query);

    // فلترة الملكية من الاستعلام — فقط لو أدمن/تاجر
    const role = req.user?.role;
    const canUseOwnership = role === "admin" || role === "dealer";
    const ownershipFilter = readOwnershipFilterFromQuery(
      req.query,
      canUseOwnership
    );

    const $match = {};
    if (mainCategory) $match.mainCategory = mainCategory;
    if (subCategory) $match.subCategory = subCategory;
    if (q) $match.$text = { $search: q };
    Object.assign($match, ownershipFilter);

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.max(parseInt(limit, 10) || 9, 1);
    const skip = (pageNum - 1) * lim;

    let $sortStage = { createdAt: -1 };
    if (sort === "priceAsc") $sortStage = { minPrice: 1, createdAt: -1 };
    if (sort === "priceDesc") $sortStage = { minPrice: -1, createdAt: -1 };

    const now = new Date();

    const pipeline = [
      { $match },

      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "product",
          as: "vars",
        },
      },

      { $addFields: { _wantedTags: wantedTags } },

      {
        $addFields: {
          vars: {
            $cond: [
              { $gt: [{ $size: "$_wantedTags" }, 0] },
              {
                $filter: {
                  input: "$vars",
                  as: "v",
                  cond: { $setIsSubset: ["$_wantedTags", "$$v.tags"] },
                },
              },
              "$vars",
            ],
          },
        },
      },

      ...(wantedTags.length
        ? [{ $match: { "vars.0": { $exists: true } } }]
        : []),

      // احسب finalAmount لكل variant حسب نافذة الخصم
      {
        $addFields: {
          _finalPrices: {
            $map: {
              input: "$vars",
              as: "v",
              in: {
                $let: {
                  vars: {
                    amount: { $ifNull: ["$$v.price.amount", 0] },
                    dType: "$$v.price.discount.type",
                    dValue: { $ifNull: ["$$v.price.discount.value", 0] },
                    dStart: "$$v.price.discount.startAt",
                    dEnd: "$$v.price.discount.endAt",
                  },
                  in: {
                    $let: {
                      vars: {
                        isActive: {
                          $and: [
                            { $gt: ["$$dValue", 0] },
                            {
                              $or: [
                                { $eq: ["$$dStart", null] },
                                { $lte: ["$$dStart", now] },
                              ],
                            },
                            {
                              $or: [
                                { $eq: ["$$dEnd", null] },
                                { $gte: ["$$dEnd", now] },
                              ],
                            },
                          ],
                        },
                      },
                      in: {
                        $cond: [
                          "$$isActive",
                          {
                            $cond: [
                              { $eq: ["$$dType", "amount"] },
                              {
                                $max: [
                                  0,
                                  { $subtract: ["$$amount", "$$dValue"] },
                                ],
                              },
                              {
                                $max: [
                                  0,
                                  {
                                    $subtract: [
                                      "$$amount",
                                      {
                                        $divide: [
                                          {
                                            $multiply: ["$$amount", "$$dValue"],
                                          },
                                          100,
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          "$$amount",
                        ],
                      },
                    },
                  },
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

      {
        $addFields: {
          _finalPricesClean: {
            $filter: {
              input: "$_finalPrices",
              as: "p",
              cond: { $and: [{ $ne: ["$$p", null] }, { $gte: ["$$p", 0] }] },
            },
          },
        },
      },

      {
        $addFields: {
          minPrice: {
            $cond: [
              { $gt: [{ $size: "$_finalPricesClean" }, 0] },
              { $min: "$_finalPricesClean" },
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
                ownershipType: 1, // 👈 نرجعه للواجهة
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

// ✅ Facets عامة (name/slug) — تدعم فلترة الملكية للأدمن/التاجر فقط
router.get("/facets", async (req, res) => {
  try {
    const { mainCategory, subCategory, q } = req.query;

    const role = req.user?.role;
    const canUseOwnership = role === "admin" || role === "dealer";
    const ownershipFilter = readOwnershipFilterFromQuery(
      req.query,
      canUseOwnership
    );

    const productMatch = { ...ownershipFilter };
    if (mainCategory) productMatch.mainCategory = mainCategory;
    if (subCategory) productMatch.subCategory = subCategory;
    if (q) productMatch.$text = { $search: q };

    const pipeline = [
      { $match: productMatch },
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "product",
          as: "vars",
        },
      },
      { $unwind: "$vars" },
      {
        $group: {
          _id: null,
          measures: {
            $addToSet: { name: "$vars.measure", slug: "$vars.measureSlug" },
          },
          colors: {
            $addToSet: { name: "$vars.color.name", slug: "$vars.colorSlug" },
          },
        },
      },
      { $project: { _id: 0 } },
    ];

    const [facets] = await Product.aggregate(pipeline);
    res.json(facets || { measures: [], colors: [] });
  } catch (err) {
    console.error("facets error:", err);
    res.status(500).json({ error: "Server error in /facets" });
  }
});

// ✅ جلب كل المنتجات (عام) + دعم فلترة الملكية للأدمن/التاجر فقط
router.get("/", async (req, res) => {
  try {
    const { mainCategory, subCategory, q, limit = 50, page = 1 } = req.query;
    const role = req.user?.role;
    const canUseOwnership = role === "admin" || role === "dealer";
    const ownershipFilter = readOwnershipFilterFromQuery(
      req.query,
      canUseOwnership
    );

    const filter = { ...ownershipFilter };
    if (mainCategory) filter.mainCategory = mainCategory;
    if (subCategory) filter.subCategory = subCategory;
    if (q) filter.$text = { $search: q };

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

// ✅ منتج واحد (withVariants اختياري) — نرجع ownershipType أيضاً
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

// ✅ Facets لمنتج معيّن — لا تحتاج تعديل
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
          measures: { $addToSet: { name: "$measure", slug: "$measureSlug" } },
          colors: { $addToSet: { name: "$color.name", slug: "$colorSlug" } },
        },
      },
      { $project: { _id: 0 } },
    ]);
    res.json(facets[0] || { measures: [], colors: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ تعديل/حذف منتج (أدمن) + دعم تحديث الملكية
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      mainCategory,
      subCategory,
      description,
      images,
      ownershipType, // اختياري
    } = req.body;

    const updateData = {
      ...(name && { name }),
      ...(category && { category }),
      ...(mainCategory && { mainCategory }),
      ...(subCategory && { subCategory }),
      ...(description && { description }),
      ...(Array.isArray(images) && images.length > 0 && { images }),
    };

    if (typeof ownershipType !== "undefined") {
      if (!["ours", "local"].includes(String(ownershipType))) {
        return res.status(400).json({
          error:
            "قيمة ownershipType غير صحيحة. القيم المسموح بها: ours | local",
        });
      }
      updateData.ownershipType = String(ownershipType);
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: "المنتج غير موجود" });

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "المنتج غير موجود" });

    await Variant.deleteMany({ product: deleted._id });

    res.status(200).json({ message: "تم حذف المنتج ومتغيراته" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
