import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import QuantityInput from "@/components/common/QuantityInput";

const Cart: React.FC = () => {
  const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
  const { user, token } = useAuth();

  const [userData, setUserData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (user) {
      setUserData((prev) => ({
        ...prev,
        name: user.name || "",
        phone: user.phone || "",
      }));
    }
  }, [user]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleOrder = async () => {
    if (!user) {
      alert("يجب تسجيل الدخول قبل تأكيد الطلب");
      return;
    }

    if (!userData.address.trim()) {
      alert("الرجاء تعبئة العنوان قبل تأكيد الطلب.");
      return;
    }

    if (cart.length === 0) {
      alert("سلة الشراء فارغة");
      return;
    }

    try {
      const orderData = {
        address: userData.address,
        total,
        items: cart.map((item) => ({
          productId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          color: item.selectedColor || null, // ✅ إرسال اللون
          measure: item.selectedMeasure || null, // ✅ إرسال المقاس
        })),
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/orders`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 201) {
        alert("✅ تم إرسال الطلب بنجاح!");
        clearCart();
      }
    } catch (err) {
      let message = "حدث خطأ أثناء تنفيذ الطلب.";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = err.response.data.message;
      }
      console.error(message, err);
      alert(message);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 text-right">
        <h1 className="text-3xl font-bold mb-6">سلة المشتريات</h1>

        {/* 🧾 نموذج بيانات المستخدم */}
        <div className="grid md:grid-cols-3 gap-4 my-6">
          <input
            className="border p-2 rounded"
            placeholder="اسمك"
            value={userData.name}
            readOnly={!!user}
            onChange={(e) => setUserData({ ...userData, name: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            placeholder="رقم الهاتف"
            value={userData.phone}
            readOnly={!!user}
            onChange={(e) =>
              setUserData({ ...userData, phone: e.target.value })
            }
          />
          <input
            className="border p-2 rounded"
            placeholder="العنوان"
            value={userData.address}
            onChange={(e) =>
              setUserData({ ...userData, address: e.target.value })
            }
          />
        </div>

        {/* 💻 لسطح المكتب */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border text-right">
            <thead className="bg-gray-100 dark:bg-black dark:text-white">
              <tr>
                <th className="py-2 px-4 border">المنتج</th>
                <th className="py-2 px-4 border">اللون</th>
                <th className="py-2 px-4 border">المقاس</th>
                <th className="py-2 px-4 border">السعر</th>
                <th className="py-2 px-4 border">الكمية</th>
                <th className="py-2 px-4 border">الإجمالي</th>
                <th className="py-2 px-4 border">إزالة</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr
                  key={`${item._id}-${item.selectedColor}-${item.selectedMeasure}`}
                >
                  <td className="py-2 px-4 border">{item.name}</td>
                  <td className="py-2 px-4 border">
                    {item.selectedColor || "-"}
                  </td>
                  <td className="py-2 px-4 border">
                    {item.selectedMeasure || "-"}
                  </td>
                  <td className="py-2 px-4 border">₪{item.price}</td>
                  <td className="py-2 px-4 border">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 border rounded"
                        onClick={() =>
                          updateQuantity(
                            item._id,
                            item.quantity - 1,
                            item.selectedColor,
                            item.selectedMeasure
                          )
                        }
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>

                      <QuantityInput
                        quantity={item.quantity}
                        onChange={(newQty) =>
                          updateQuantity(
                            item._id,
                            newQty,
                            item.selectedColor,
                            item.selectedMeasure
                          )
                        }
                      />

                      <button
                        className="px-2 py-1 border rounded"
                        onClick={() =>
                          updateQuantity(
                            item._id,
                            item.quantity + 1,
                            item.selectedColor,
                            item.selectedMeasure
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-4 border">
                    ₪{item.price * item.quantity}
                  </td>
                  <td className="py-2 px-4 border">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        removeFromCart(
                          item._id,
                          item.selectedColor,
                          item.selectedMeasure
                        )
                      }
                    >
                      إزالة
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 📱 للموبايل */}
        <div className="grid gap-4 md:hidden">
          {cart.map((item) => (
            <div
              key={`${item._id}-${item.selectedColor}-${item.selectedMeasure}`}
              className="border rounded-lg p-4 text-right"
            >
              <h3 className="text-lg font-semibold mb-1">{item.name}</h3>
              <p className="text-sm text-gray-500">
                اللون: {item.selectedColor || "-"} | المقاس:{" "}
                {item.selectedMeasure || "-"}
              </p>
              <p className="text-gray-600 mb-1">السعر: ₪{item.price}</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-600">الكمية:</span>
                <QuantityInput
                  quantity={item.quantity}
                  onChange={(newQty) =>
                    updateQuantity(
                      item._id,
                      newQty,
                      item.selectedColor,
                      item.selectedMeasure
                    )
                  }
                />
              </div>
              <p className="text-gray-700 font-semibold mb-3">
                الإجمالي: ₪{item.price * item.quantity}
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  removeFromCart(
                    item._id,
                    item.selectedColor,
                    item.selectedMeasure
                  )
                }
              >
                إزالة
              </Button>
            </div>
          ))}
        </div>

        {/* 💳 الإجمالي وزر الإرسال */}
        <div className="mt-6 flex justify-between items-center flex-col md:flex-row gap-4">
          <p className="text-xl font-semibold">
            المجموع الكلي: <span className="text-green-600">₪{total}</span>
          </p>
          <Button onClick={handleOrder}>تأكيد الطلب</Button>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Cart;
