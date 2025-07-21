const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// 🔐 التسجيل
router.post("/signup", async (req, res) => {
  const { name, phone, email, password, role } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "المستخدم موجود بالفعل" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      phone,
      email,
      password: hashedPassword,
      role,
    });
    await newUser.save();

    res.status(201).json({ message: "تم إنشاء الحساب بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔓 تسجيل الدخول
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "البريد الإلكتروني غير موجود" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "كلمة المرور خاطئة" });

    const token = jwt.sign({ id: user._id, role: user.role }, "yourSecretKey", {
      expiresIn: "2h",
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
