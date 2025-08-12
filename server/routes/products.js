const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// ✅ إنشاء منتج (أدمن فقط)
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      name,
      price,
      category,
      mainCategory,
      subCategory,
      description,
      images,
      quantity,
      discount,
      tags,
      measures,
      colors,
    } = req.body;

    if (!name || !price || !mainCategory || !subCategory || !images?.length) {
      return res
        .status(400)
        .json({ error: "يرجى تعبئة جميع الحقول المطلوبة." });
    }

    const newProduct = new Product({
      name,
      price,
      category,
      mainCategory,
      subCategory,
      description,
      images,
      quantity: quantity ?? 1, // إذا ما أرسل قيمة، نحط الافتراضي
      discount: discount ?? 0,
      tags: Array.isArray(tags) ? tags : [],
      measures: Array.isArray(measures) ? measures : [],
      colors: Array.isArray(colors) ? colors : [],
    });

    const saved = await newProduct.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ جلب كل المنتجات (متاح للجميع)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ جلب منتج واحد حسب ID (متاح للجميع)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ تعديل منتج (أدمن فقط)
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      name,
      price,
      category,
      mainCategory,
      subCategory,
      description,
      images,
      quantity,
      discount,
      tags,
      measures,
      colors,
    } = req.body;

    const updateData = {
      ...(name && { name }),
      ...(price && { price }),
      ...(category && { category }),
      ...(mainCategory && { mainCategory }),
      ...(subCategory && { subCategory }),
      ...(description && { description }),
      ...(Array.isArray(images) && images.length > 0 && { images }),
      ...(typeof quantity === "number" && { quantity }),
      ...(typeof discount === "number" && { discount }),
      ...(Array.isArray(tags) && { tags }),
      ...(Array.isArray(measures) && { measures }),
      ...(Array.isArray(colors) && { colors }),
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
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "المنتج غير موجود" });
    res.status(200).json({ message: "تم الحذف بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
