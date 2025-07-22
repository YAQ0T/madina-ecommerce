const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "توكن غير موجود" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "yourSecretKey"); // نفس المفتاح اللي استخدمته وقت التوقيع
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "توكن غير صالح" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "غير مصرح، فقط الأدمن" });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
