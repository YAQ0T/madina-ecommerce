const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

// POST /api/contact
router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // لازم false مع 587
      auth: {
        user: "ahmad.salous1099@gmail.com",
        pass: "tvrc hktf ccqu xkpa", // App Password من Gmail
      },
    });

    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: "ahmad.salous1099@gmail.com", // بريدك كمان
      subject: "رسالة جديدة من صفحة التواصل",
      html: `
        <h3>الاسم:</h3><p>${name}</p>
        <h3>البريد الإلكتروني:</h3><p>${email}</p>
        <h3>الرسالة:</h3><p>${message}</p>
      `,
    });
    console.log("✅ تم إرسال البريد بنجاح");
    res.status(200).json({ message: "✅ تم إرسال الرسالة بنجاح" });
  } catch (err) {
    console.error("❌ فشل في إرسال البريد:", err);
    res.status(500).json({ error: "فشل في إرسال الرسالة" });
  }
});

module.exports = router;
