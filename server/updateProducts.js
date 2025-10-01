require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product"); // نموذج المنتج

// 🔹 الاتصال بقاعدة البيانات من .env
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ DB Error:", err));

(async () => {
  try {
    // تحديث كل المنتجات التي لا تحتوي على الحقول الجديدة
    const result = await Product.updateMany(
      {
        $or: [
          { discount: { $exists: false } },
          { tags: { $exists: false } },
          { measures: { $exists: false } },
          { colors: { $exists: false } },
          { "name.he": { $exists: false } },
          { "name.he": { $eq: null } },
          { "name.he": "" },
          { "description.he": { $exists: false } },
          { "description.he": { $eq: null } },
          { "description.he": "" },
        ],
      },
      {
        $set: {
          discount: 0,
          tags: [],
          measures: [],
          colors: [],
          "name.he": "",
          "description.he": "",
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} products`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    mongoose.connection.close();
  }
})();
