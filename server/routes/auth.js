const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const qs = require("querystring");
const User = require("../models/User");

const router = express.Router();

/* =========================
   ضبط بيئة/إعدادات
========================= */
const JWT_SECRET = process.env.JWT_SECRET || "changeme_dev_secret";
const HTD_BASE = "http://sms.htd.ps/API";
const SMS_HTD_ID = process.env.SMS_HTD_ID || ""; // مثلاً: ded7...
const SMS_SENDER = process.env.SMS_HTD_SENDER || "Madina";

function normalizePhone(p) {
  // إلى صيغة 970XXXXXXXXX بدون +
  let to = String(p || "").replace(/[^\d]/g, "");
  if (to.startsWith("0")) to = "970" + to.slice(1);
  if (!to.startsWith("970")) to = "970" + to;
  return to;
}

async function sendSMS({ to, msg }) {
  if (!SMS_HTD_ID) throw new Error("SMS_HTD_ID غير معرّف في .env");
  const url = `${HTD_BASE}/SendSMS.aspx`;
  const query = {
    id: SMS_HTD_ID,
    sender: SMS_SENDER,
    to: normalizePhone(to),
    msg,
  };
  const full = `${url}?${qs.stringify(query)}`;
  const { status, data } = await axios.get(full, { timeout: 15000 });
  return { ok: status === 200, raw: data };
}

async function getCredit() {
  if (!SMS_HTD_ID) throw new Error("SMS_HTD_ID غير معرّف");
  const url = `${HTD_BASE}/GetCredit.aspx?id=${encodeURIComponent(SMS_HTD_ID)}`;
  const { status, data } = await axios.get(url, { timeout: 10000 });
  return { ok: status === 200, raw: data };
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* =========================
   التسجيل: /signup
   - البريد اختياري
   - الجوال إجباري وفريد
   - يرسل OTP عبر SMS
========================= */
router.post("/signup", async (req, res) => {
  try {
    let { name, phone, email, password, role } = req.body || {};

    if (!phone) return res.status(400).json({ message: "رقم الجوال مطلوب" });
    if (!password)
      return res.status(400).json({ message: "كلمة المرور مطلوبة" });

    const phoneNorm = normalizePhone(phone);

    // منع التكرار حسب الهاتف
    const existingByPhone = await User.findOne({ phone: phoneNorm }).lean();
    if (existingByPhone) {
      return res.status(400).json({ message: "رقم الجوال مستخدم بالفعل" });
    }

    // لو البريد ممرر، افحص تكراره (اختياري)
    email = email ? String(email).toLowerCase() : undefined;
    if (email) {
      const existingByEmail = await User.findOne({ email }).lean();
      if (existingByEmail) {
        return res
          .status(400)
          .json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      phone: phoneNorm,
      email, // ممكن undefined
      password: hashedPassword,
      role: role || "user",
      phoneVerified: false,
    });

    const code = generateOTP();
    user.setPhoneOTP(code, 10);
    await user.save();

    // أرسل الكود
    const msg = `رمز التحقق من Dikori: ${code} (صالح 10 دقائق)`;
    await sendSMS({ to: user.phone, msg });

    return res.status(201).json({
      message: "تم إنشاء الحساب وإرسال رمز التحقق عبر SMS",
      userId: user._id,
      phone: user.phone,
    });
  } catch (err) {
    console.error("signup error:", err?.response?.data || err.message);
    return res
      .status(500)
      .json({ error: err.message || "فشل في إنشاء الحساب" });
  }
});

/* =========================
   التحقق من كود SMS: /verify-sms
========================= */
router.post("/verify-sms", async (req, res) => {
  try {
    const { userId, code } = req.body || {};
    if (!userId || !code)
      return res.status(400).json({ message: "بيانات ناقصة" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (user.phoneVerified)
      return res.json({ ok: true, message: "الهاتف موثق مسبقًا" });

    if (user.phoneVerificationAttempts >= 6) {
      return res
        .status(429)
        .json({ message: "تجاوزت حد المحاولات. اطلب رمزًا جديدًا" });
    }

    user.phoneVerificationAttempts += 1;

    if (!user.checkPhoneOTP(code)) {
      await user.save();
      return res.status(400).json({ message: "رمز غير صحيح أو منتهي" });
    }

    user.phoneVerified = true;
    user.phoneVerificationCodeHash = undefined;
    user.phoneVerificationExpires = undefined;
    user.phoneVerificationAttempts = 0;
    user.phoneVerificationResends = 0;
    await user.save();

    return res.json({ ok: true, message: "تم توثيق رقم الهاتف بنجاح" });
  } catch (err) {
    console.error("verify-sms error:", err.message);
    res.status(500).json({ error: "خطأ أثناء التحقق" });
  }
});

/* =========================
   إعادة إرسال كود: /resend-sms
========================= */
router.post("/resend-sms", async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ message: "بيانات ناقصة" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (user.phoneVerified)
      return res.status(400).json({ message: "الهاتف موثق بالفعل" });

    if (user.phoneVerificationResends >= 5) {
      return res.status(429).json({ message: "تجاوزت حد إعادة الإرسال" });
    }

    const code = generateOTP();
    user.setPhoneOTP(code, 10);
    user.phoneVerificationResends += 1;
    await user.save();

    const msg = `رمز التحقق من مدينا: ${code} (صالح 10 دقائق)`;
    await sendSMS({ to: user.phone, msg });

    return res.json({ ok: true, message: "تم إرسال رمز جديد" });
  } catch (err) {
    console.error("resend-sms error:", err.message);
    res.status(500).json({ error: "حدث خطأ أثناء إعادة الإرسال" });
  }
});

/* =========================
   الرصيد: /sms-credit (اختياري)
========================= */
router.get("/sms-credit", async (req, res) => {
  try {
    const c = await getCredit();
    res.json({ ok: true, credit: c.raw });
  } catch (err) {
    res.status(500).json({ error: "تعذر جلب الرصيد" });
  }
});

/* =========================
   تسجيل الدخول: /login
   - يقبل phone أو email مع password
   - يشترط phoneVerified=true
========================= */
router.post("/login", async (req, res) => {
  try {
    const { phone, email, password } = req.body || {};
    if ((!phone && !email) || !password) {
      return res
        .status(400)
        .json({ message: "أدخل رقم الجوال أو البريد مع كلمة المرور" });
    }

    const query = phone
      ? { phone: normalizePhone(phone) }
      : { email: String(email).toLowerCase() };
    const user = await User.findOne(query);
    if (!user)
      return res.status(400).json({ message: "بيانات الدخول غير صحيحة" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "كلمة المرور خاطئة" });

    if (!user.phoneVerified) {
      return res
        .status(403)
        .json({ message: "يجب توثيق رقم الجوال قبل تسجيل الدخول" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email || null,
        role: user.role,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
