const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// ✅ إنشاء منتج (أدمن فقط)
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
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
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
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
