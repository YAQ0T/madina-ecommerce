// server/controllers/products.controller.js
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Variant = require("../models/Variant");
const {
  slugify,
  buildWantedTags,
  readOwnershipFilterFromQuery,
} = require("../utils/filters");
const {
  parseLocalizedInput,
  ensureLocalizedObject,
  mapLocalizedForResponse,
} = require("../utils/localized");
const {
  canRoleViewStock,
  sanitizeProductListForRole,
  sanitizeVariantListForRole,
} = require("../utils/stock");

/** تحويل ترتيب الأولويات إلى رقم للفرز */
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

/** حارس بسيط لفهم limit/page */
function parsePagination(q) {
  const pageNum = Math.max(parseInt(q.page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(q.limit, 10) || 9, 1);
  const skip = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, skip };
}

/** اختيار طريقة الفرز */
function resolveSort(sort) {
  if (sort === "priceAsc")
    return { priorityRank: 1, minPrice: 1, createdAt: -1 };
  if (sort === "priceDesc")
    return { priorityRank: 1, minPrice: -1, createdAt: -1 };
  return { priorityRank: 1, createdAt: -1 }; // الافتراضي: الأحدث مع احترام الأولوية
}

/** توحيد اسم وداتا المنتج قبل الإنشاء */
function prepareCreateData(body) {
  const {
    name,
    category,
    mainCategory,
    subCategory,
    description,
    images,
    ownershipType,
    priority,
  } = body;

  const nameResult = parseLocalizedInput(name, {
    requireArabic: true,
    arabicRequiredMessage:
      "يرجى إدخال اسم المنتج باللغة العربية على الأقل",
  });
  if (nameResult.error) return { error: nameResult.error };
  const normalizedName = nameResult.value;

  if (!normalizedName) {
    return { error: "اسم المنتج مطلوب" };
  }

  if (
    !mainCategory ||
    !subCategory ||
    !Array.isArray(images) ||
    images.length === 0
  ) {
    return {
      error:
        "يرجى تعبئة الحقول الأساسية: name, mainCategory, subCategory, images[]",
    };
  }

  const data = {
    name: normalizedName,
    category: category ? String(category).trim() : undefined,
    mainCategory: String(mainCategory).trim(),
    subCategory: String(subCategory).trim(),
    images: images.map((u) => String(u)),
  };

  const descriptionResult = parseLocalizedInput(description, {
    allowEmpty: false,
    arabicRequiredMessage:
      "الوصف العربي مطلوب عند إضافة وصف جديد",
  });
  if (descriptionResult.error) return { error: descriptionResult.error };
  if (descriptionResult.value) {
    data.description = descriptionResult.value;
  }

  if (typeof ownershipType !== "undefined") {
    const v = String(ownershipType);
    if (!["ours", "local"].includes(v)) {
      return { error: "قيمة ownershipType غير صحيحة: ours | local" };
    }
    data.ownershipType = v;
  }

  if (typeof priority !== "undefined") {
    const pv = String(priority).toUpperCase();
    if (!["A", "B", "C"].includes(pv)) {
      return { error: "قيمة priority: A | B | C" };
    }
    data.priority = pv;
  }

  return { data };
}

function formatProduct(product) {
  if (!product) return product;
  const source =
    typeof product.toObject === "function" ? product.toObject() : product;
  const { _finalPrices, _finalPricesClean, _stocks, ...clean } = source;
  return {
    ...clean,
    name: mapLocalizedForResponse(source.name),
    description: mapLocalizedForResponse(source.description),
  };
}

function formatProducts(list = []) {
  return list.map((item) => formatProduct(item));
}

const ProductsController = {
  /* =========================
   * CREATE
   * ========================= */
  async create(req, res) {
    try {
      const prepared = prepareCreateData(req.body);
      if (prepared.error)
        return res.status(400).json({ error: prepared.error });

      const product = await Product.create(prepared.data);
      return res.status(201).json(product);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  /* =========================
   * READ with-stats
   * ========================= */
  async getWithStats(req, res) {
    try {
      const {
        mainCategory,
        subCategory,
        q,
        maxPrice,
        sort = "new",
      } = req.query;

      // فلترة المُلصقات المطلوبة (tags) من كويري
      const wantedTags = buildWantedTags(req.query);

      // صلاحية رؤية المِلكية
      const role = req.user?.role;
      const canUseOwnership = role === "admin" || role === "dealer";
      const canViewStock = canRoleViewStock(role);
      const ownershipFilter = readOwnershipFilterFromQuery(
        req.query,
        canUseOwnership
      );

      // فلاتر البحث الأساسية
      const $match = { ...ownershipFilter };
      if (mainCategory) $match.mainCategory = String(mainCategory);
      if (subCategory) $match.subCategory = String(subCategory);
      if (q) $match.$text = { $search: String(q) };

      // صفحة وحدّ
      const { pageNum, limitNum, skip } = parsePagination(req.query);

      // ترتيب
      const $sortStage = resolveSort(sort);

      // لحساب الخصومات المفعلة الآن
      const now = new Date();

      const pipeline = [
        { $match },
        { $addFields: { priorityRank: priorityRankExpr } },

        // احضار الفيريانتس
        {
          $lookup: {
            from: "variants",
            localField: "_id",
            foreignField: "product",
            as: "vars",
          },
        },

        // حقن wantedTags في الوثيقة
        { $addFields: { _wantedTags: wantedTags } },

        // فلترة الـvariants حسب التاغات المطلوبة إن وُجدت
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

        // لو فيه tags مطلوبة، لازم يكون فيه على الأقل variant واحد بعد الفلترة
        ...(wantedTags.length
          ? [{ $match: { "vars.0": { $exists: true } } }]
          : []),

        // حساب السعر النهائي لكل variant بناءً على نافذة الخصم
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
                                              $multiply: [
                                                "$$amount",
                                                "$$dValue",
                                              ],
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
            ...(canViewStock
              ? {
                  _stocks: {
                    $map: {
                      input: "$vars",
                      as: "v",
                      in: { $ifNull: ["$$v.stock.inStock", 0] },
                    },
                  },
                }
              : {}),
          },
        },

        // تنظيف الأسعار النهائية (إزالة null والسالب)
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

        // حساب minPrice و totalStock
        {
          $addFields: {
            minPrice: {
              $cond: [
                { $gt: [{ $size: "$_finalPricesClean" }, 0] },
                { $min: "$_finalPricesClean" },
                0,
              ],
            },
            ...(canViewStock ? { totalStock: { $sum: "$_stocks" } } : {}),
          },
        },

        // فلترة بـ maxPrice إن وُجد
        ...(req.query.maxPrice
          ? [{ $match: { minPrice: { $lte: Number(maxPrice) } } }]
          : []),

        // Facet للعدّ والعناصر مع الصفحات
        {
          $facet: {
            meta: [{ $count: "total" }],
            items: [
              { $sort: $sortStage },
              { $skip: skip },
              { $limit: limitNum },
              {
                $project: {
                  name: 1,
                  description: 1,
                  images: 1,
                  mainCategory: 1,
                  subCategory: 1,
                  createdAt: 1,
                  minPrice: 1,
                  ...(canViewStock ? { totalStock: 1 } : {}),
                  ownershipType: 1,
                  priority: 1,
                },
              },
            ],
          },
        },

        // إخراج نهائي أنظف
        {
          $project: {
            items: 1,
            total: { $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0] },
          },
        },
      ];

      const [result] = await Product.aggregate(pipeline);
      const total = result?.total || 0;
      const formattedItems = formatProducts(result?.items || []);
      const items = canViewStock
        ? formattedItems
        : sanitizeProductListForRole(formattedItems, role);
      const totalPages = Math.ceil(total / limitNum);

      return res.json({
        items,
        total,
        totalPages,
        page: pageNum,
        limit: limitNum,
      });
    } catch (err) {
      console.error("with-stats error:", err && err.stack ? err.stack : err);
      return res.status(500).json({ error: "Server error in /with-stats" });
    }
  },

  /* =========================
   * READ facets (بدون $replaceAll)
   * ========================= */
  async getFacets(req, res) {
    try {
      const { mainCategory, subCategory, q } = req.query;

      const role = req.user?.role;
      const canUseOwnership = role === "admin" || role === "dealer";
      const ownershipFilter = readOwnershipFilterFromQuery(
        req.query,
        canUseOwnership
      );

      const $match = { ...ownershipFilter };
      if (mainCategory) $match.mainCategory = String(mainCategory);
      if (subCategory) $match.subCategory = String(subCategory);
      if (q) $match.$text = { $search: String(q) };

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
        { $unwind: "$vars" },
        { $unwind: "$vars.tags" },
        {
          $group: {
            _id: null,
            colorSlugs: {
              $addToSet: {
                $cond: [
                  { $regexMatch: { input: "$vars.tags", regex: /^color:/ } },
                  {
                    $substrBytes: [
                      "$vars.tags",
                      6, // بعد "color:"
                      { $subtract: [{ $strLenBytes: "$vars.tags" }, 6] },
                    ],
                  },
                  "$$REMOVE",
                ],
              },
            },
            measureSlugs: {
              $addToSet: {
                $cond: [
                  { $regexMatch: { input: "$vars.tags", regex: /^measure:/ } },
                  {
                    $substrBytes: [
                      "$vars.tags",
                      8, // بعد "measure:"
                      { $subtract: [{ $strLenBytes: "$vars.tags" }, 8] },
                    ],
                  },
                  "$$REMOVE",
                ],
              },
            },
          },
        },
      ];

      const [agg] = await Product.aggregate(pipeline);

      // تجهيز الإخراج في Node لتفادي $replaceAll (تشتغل على كل نسخ Mongo)
      const toName = (slug) =>
        String(slug || "")
          .replace(/[-_]+/g, " ")
          .trim();

      const colors =
        agg?.colorSlugs?.map((s) => ({ slug: s, name: toName(s) })) || [];
      const measures =
        agg?.measureSlugs?.map((s) => ({ slug: s, name: toName(s) })) || [];

      return res.json({ colors, measures });
    } catch (err) {
      console.error("facets error:", err && err.stack ? err.stack : err);
      return res.status(500).json({ error: "Server error in /facets" });
    }
  },

  /* =========================
   * READ all (يحترم priority)
   * ========================= */
  async list(req, res) {
    try {
      const { mainCategory, subCategory, q } = req.query;

      const role = req.user?.role;
      const canUseOwnership = role === "admin" || role === "dealer";
      const ownershipFilter = readOwnershipFilterFromQuery(
        req.query,
        canUseOwnership
      );

      const filter = { ...ownershipFilter };
      if (mainCategory) filter.mainCategory = String(mainCategory);
      if (subCategory) filter.subCategory = String(subCategory);
      if (q) filter.$text = { $search: String(q) };

      const { pageNum, limitNum, skip } = parsePagination({
        page: req.query.page || 1,
        limit: req.query.limit || 50,
      });

      const products = await Product.find(filter)
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      return res.status(200).json(formatProducts(products));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  /* =========================
   * READ one
   * ========================= */
  async getOne(req, res) {
    try {
      const withVariants = req.query.withVariants === "1";
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: "معرّف غير صالح" });
      }

      const product = await Product.findById(id).lean();
      if (!product)
        return res.status(404).json({ message: "المنتج غير موجود" });

      const normalizedProduct = formatProduct(product);

      if (!withVariants) return res.json(normalizedProduct);

      const variants = await Variant.find({ product: product._id }).lean();
      return res.json({
        ...normalizedProduct,
        variants: canRoleViewStock(req.user?.role)
          ? variants
          : sanitizeVariantListForRole(variants, req.user?.role),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  /* =========================
   * UPDATE (يشمل priority)
   * ========================= */
  async update(req, res) {
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
      if (typeof name !== "undefined") {
        const nameResult = parseLocalizedInput(name, {
          requireArabic: true,
          arabicRequiredMessage:
            "يرجى إدخال اسم المنتج باللغة العربية على الأقل",
        });
        if (nameResult.error)
          return res.status(400).json({ error: nameResult.error });
        if (!nameResult.value)
          return res.status(400).json({ error: "اسم المنتج مطلوب" });
        updateData.name = nameResult.value;
      }
      if (typeof category !== "undefined")
        updateData.category = String(category).trim();
      if (typeof mainCategory !== "undefined")
        updateData.mainCategory = String(mainCategory).trim();
      if (typeof subCategory !== "undefined")
        updateData.subCategory = String(subCategory).trim();
      if (typeof description !== "undefined") {
        const descriptionResult = parseLocalizedInput(description, {
          allowEmpty: true,
          arabicRequiredMessage: "الوصف العربي مطلوب عند إضافة وصف جديد",
        });
        if (descriptionResult.error)
          return res.status(400).json({ error: descriptionResult.error });
        if (descriptionResult.value === undefined || descriptionResult.value === null) {
          updateData.description = { ar: "", he: "" };
        } else {
          updateData.description = descriptionResult.value;
        }
      }

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

      return res.json(formatProduct(updated));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  /* =========================
   * PATCH priority فقط
   * ========================= */
  async patchPriority(req, res) {
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

      return res.json(formatProduct(updated));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  /* =========================
   * DELETE
   * ========================= */
  async remove(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: "معرّف غير صالح" });
      }

      const deleted = await Product.findByIdAndDelete(id).lean();
      if (!deleted) return res.status(404).json({ error: "المنتج غير موجود" });

      await Variant.deleteMany({ product: id });

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};

module.exports = ProductsController;
