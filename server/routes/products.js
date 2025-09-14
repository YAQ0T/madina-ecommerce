// server/routes/products.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Variant = require("../models/Variant");
const {
  verifyToken,
  isAdmin,
  verifyTokenOptional,
} = require("../middleware/authMiddleware");

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

function readOwnershipFilterFromQuery(query = {}, canUseOwnership = false) {
  if (!canUseOwnership) return {};
  if (query.ownership && ["ours", "local"].includes(String(query.ownership))) {
    return { ownershipType: String(query.ownership) };
  }
  if (typeof query.isLocal !== "undefined") {
    const val = String(query.isLocal).toLowerCase();
    if (["true", "1", "yes"].includes(val)) return { ownershipType: "local" };
    if (["false", "0", "no"].includes(val)) return { ownershipType: "ours" };
  }
  return {};
}

router.use(verifyTokenOptional);

// =============================
// CREATE (يدعم priority)
// =============================
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      mainCategory,
      subCategory,
      description,
      images,
      ownershipType,
      priority,
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

    const createData = {
      name: String(name).trim(),
      category: category ? String(category).trim() : undefined,
      mainCategory: String(mainCategory).trim(),
      subCategory: String(subCategory).trim(),
      description: description ? String(description).trim() : undefined,
      images: images.map((u) => String(u)),
    };

    if (typeof ownershipType !== "undefined") {
      const v = String(ownershipType);
      if (!["ours", "local"].includes(v)) {
        return res
          .status(400)
          .json({ error: "قيمة ownershipType غير صحيحة: ours | local" });
      }
      createData.ownershipType = v;
    }

    if (typeof priority !== "undefined") {
      const pv = String(priority).toUpperCase();
      if (!["A", "B", "C"].includes(pv)) {
        return res.status(400).json({ error: "قيمة priority: A | B | C" });
      }
      createData.priority = pv;
    }

    const product = await Product.create(createData);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// READ with-stats (يحترم priority)
// =============================
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

    const priorityRankExpr = {
      $switch: {
        branches: [
          { case: { $eq: ["$priority", "A"] }, then: 1 },
          { case: { $eq: ["$priority", "B"] }, then: 2 },
          { case: { $eq: ["$priority", "C"] }, then: 3 },
        ],
        default: 4,
      },
    };

    let $sortStage = { priorityRank: 1, createdAt: -1 };
    if (sort === "priceAsc")
      $sortStage = { priorityRank: 1, minPrice: 1, createdAt: -1 };
    if (sort === "priceDesc")
      $sortStage = { priorityRank: 1, minPrice: -1, createdAt: -1 };

    const now = new Date();

    const pipeline = [
      { $match },

      { $addFields: { priorityRank: priorityRankExpr } },

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

      // final prices per variant with discount window
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
                ownershipType: 1,
                priority: 1,
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

// =============================
// READ all (يحترم priority)
// =============================
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
      .sort({ priority: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// READ one
// =============================
router.get("/:id", async (req, res) => {
  try {
    const withVariants = req.query.withVariants === "1";

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "معرّف غير صالح" });
    }

    const product = await Product.findById(req.params.id).lean();

    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

    if (!withVariants) return res.json(product);

    const variants = await Variant.find({ product: product._id }).lean();
    res.json({ ...product, variants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// UPDATE (يشمل priority)
// =============================
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "معرّف غير صالح" });
    }

    const {
      name,
      category,
      mainCategory,
      subCategory,
      description,
      images,
      ownershipType,
      priority,
    } = req.body;

    const updateData = {};

    if (typeof name !== "undefined") updateData.name = String(name).trim();
    if (typeof category !== "undefined")
      updateData.category = String(category).trim();
    if (typeof mainCategory !== "undefined")
      updateData.mainCategory = String(mainCategory).trim();
    if (typeof subCategory !== "undefined")
      updateData.subCategory = String(subCategory).trim();
    if (typeof description !== "undefined")
      updateData.description = String(description).trim();
    if (typeof images !== "undefined") {
      if (!Array.isArray(images))
        return res
          .status(400)
          .json({ error: "images يجب أن تكون مصفوفة سلاسل" });
      updateData.images = images.map((u) => String(u));
    }
    if (typeof ownershipType !== "undefined") {
      const v = String(ownershipType);
      if (!["ours", "local"].includes(v)) {
        return res
          .status(400)
          .json({ error: "قيمة ownershipType غير صحيحة: ours | local" });
      }
      updateData.ownershipType = v;
    }
    if (typeof priority !== "undefined") {
      const pv = String(priority).toUpperCase();
      if (!["A", "B", "C"].includes(pv)) {
        return res.status(400).json({ error: "قيمة priority: A | B | C" });
      }
      updateData.priority = pv;
    }

    const updated = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return res.status(404).json({ error: "المنتج غير موجود" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// PATCH priority فقط (اختياري)
// =============================
router.patch("/:id/priority", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "معرّف غير صالح" });
    }

    const pv = String(priority || "C").toUpperCase();
    if (!["A", "B", "C"].includes(pv)) {
      return res.status(400).json({ error: "قيمة priority: A | B | C" });
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { priority: pv },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "المنتج غير موجود" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// DELETE
// =============================
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "معرّف غير صالح" });
    }

    const deleted = await Product.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ error: "المنتج غير موجود" });

    // حذف متغيراته (اختياري)
    await Variant.deleteMany({ product: id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
