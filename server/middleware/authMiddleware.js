// server/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "yourSecretKey"; // 👈 وحّد السر

// ✅ يتحقق من التوكن ويوقف الطلب لو غير موجود/غير صالح
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "توكن غير موجود" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    res.status(403).json({ message: "توكن غير صالح" });
  }
};

// ✅ يقرأ التوكن إن وُجد، ولا يفشل لو غير موجود (مفيد لمسارات عامة)
const verifyTokenOptional = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // { id, role }
    } catch (_) {
      // تجاهل الخطأ، نكمل كزائر
    }
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "غير مصرح، فقط الأدمن" });
  }
  next();
};

// ✅ أدمن أو تاجر
const isDealerOrAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "dealer") {
    return res.status(403).json({ message: "غير مصرح، يتطلب أدمن أو تاجر" });
  }
  next();
};

module.exports = { verifyToken, verifyTokenOptional, isAdmin, isDealerOrAdmin };
