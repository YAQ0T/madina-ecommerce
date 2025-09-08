// server/routes/homeCollections.js
const express = require("express");
const router = express.Router();
const HomeCollections = require("../models/HomeCollections");
const Product = require("../models/Product"); // يفترض موجود أصلاً عندك

// ملاحظة أمان:
// إذا عندك ميدلوير مصادقة (auth) وميدلوير فحص الدور (isAdmin) استخدمهم هنا.
// مثال:
// const requireAuth = require("../middlewares/requireAuth");
// const requireAdmin = require("../middlewares/requireAdmin");

// ====== Admin: حفظ القوائم ======
router.put(
  "/",
  /* requireAuth, requireAdmin, */ async (req, res) => {
    try {
      const { recommendedIds = [], newArrivalIds = [] } = req.body || {};

      // تحقق سريع من أن الـIDs لمنتجات سليمة (اختياري لزيادة الأمان)
      const allIds = [...recommendedIds, ...newArrivalIds];
      if (allIds.length) {
        const foundCount = await Product.countDocuments({
          _id: { $in: allIds },
        });
        // ما نوقف لو ناقصين؛ بس نعدلهم للتقاطع الفعلي
        if (foundCount === 0) {
          return res
            .status(400)
            .json({
              message: "لم يتم العثور على أي منتجات مطابقة للمعرّفات المرسلة.",
            });
        }
      }

      const doc = await HomeCollections.getSingleton();
      doc.recommended = Array.isArray(recommendedIds) ? recommendedIds : [];
      doc.newArrivals = Array.isArray(newArrivalIds) ? newArrivalIds : [];
      await doc.save();

      const populated = await HomeCollections.findById(doc._id)
        .populate("recommended")
        .populate("newArrivals");

      res.json({
        message: "تم الحفظ بنجاح",
        data: populated,
      });
    } catch (err) {
      console.error("PUT /api/home-collections error:", err);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  }
);

// ====== Admin/User: جلب القوائم (مجمعة) ======
router.get("/", async (_req, res) => {
  try {
    const doc = await HomeCollections.getSingleton();
    const populated = await HomeCollections.findById(doc._id)
      .populate("recommended")
      .populate("newArrivals");

    res.json({
      recommended: populated?.recommended || [],
      newArrivals: populated?.newArrivals || [],
      updatedAt: populated?.updatedAt,
    });
  } catch (err) {
    console.error("GET /api/home-collections error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ====== توافق مع واجهة الـHome الحالية ======
router.get("/recommended", async (_req, res) => {
  try {
    const doc = await HomeCollections.getSingleton();
    const populated = await HomeCollections.findById(doc._id).populate(
      "recommended"
    );
    const list = (populated?.recommended || []).map((p) =>
      p.toObject ? p.toObject() : p
    );
    res.json(list);
  } catch (err) {
    console.error("GET /api/home-collections/recommended error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

router.get("/new", async (_req, res) => {
  try {
    const doc = await HomeCollections.getSingleton();
    const populated = await HomeCollections.findById(doc._id).populate(
      "newArrivals"
    );
    const list = (populated?.newArrivals || []).map((p) =>
      p.toObject ? p.toObject() : p
    );
    res.json(list);
  } catch (err) {
    console.error("GET /api/home-collections/new error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

module.exports = router;
