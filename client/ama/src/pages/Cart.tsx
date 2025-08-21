// src/pages/Cart.tsx
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import QuantityInput from "@/components/common/QuantityInput";

type DiscountPreview = {
  items: Array<{
    productId: string;
    variantId: string;
    name: string;
    quantity: number;
    price: number;
    color?: string | null;
    measure?: string | null;
    sku?: string | null;
  }>;
  subtotal: number;
  discount: {
    applied: boolean;
    ruleId: string | null;
    type: "percent" | "fixed" | null;
    value: number;
    amount: number;
    threshold: number;
    name: string;
  };
  total: number;
};

const currency = (n: number) => `₪${Number(n || 0).toFixed(2)}`;

const Cart: React.FC = () => {
  const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
  const { user, token } = useAuth();

  const [userData, setUserData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [preview, setPreview] = useState<DiscountPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (user) {
      setUserData((prev) => ({
        ...prev,
        name: user.name || "",
        phone: user.phone || "",
      }));
    }
  }, [user]);

  // المجموع المحلي (fallback لو فشل استدعاء المعاينة)
  const localSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const localTotal = useMemo(() => localSubtotal, [localSubtotal]);

  // استدعاء معاينة الخصم الديناميكي من السيرفر عند تغيّر السلة
  useEffect(() => {
    const applyDiscountPreview = async () => {
      if (cart.length === 0) {
        setPreview(null);
        return;
      }
      try {
        setLoadingPreview(true);

        // نرسل عناصر السلة بالشكل الذي يتوقعه السيرفر للبحث عن المتغيرات الحقيقية
        const payload = {
          items: cart.map((item) => ({
            productId: item._id,
            quantity: item.quantity,
            // السيرفر يعطي أولوية لـ sku إن وُجد:
            sku: (item as any).sku || undefined,
            // وإلا يستخدم productId + color + measure:
            color: item.selectedColor || null,
            measure: item.selectedMeasure || null,
            // الاسم اختياري (للعرض فقط)
            name: item.name,
          })),
        };

        const headers =
          token && token.length
            ? { Authorization: `Bearer ${token}` }
            : undefined;

        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/discounts/apply`,
          payload,
          { headers }
        );

        setPreview(res.data as DiscountPreview);
      } catch (err) {
        console.error("فشل في معاينة الخصم:", err);
        setPreview(null); // نستخدم القيم المحلية بدلًا من ذلك
      } finally {
        setLoadingPreview(false);
      }
    };

    applyDiscountPreview();
  }, [cart, token]);

  // قيم العرض النهائية (نفضل معاينة السيرفر إن نجحت، وإلا fallback محلي)
  const summary = useMemo(() => {
    if (preview) {
      return {
        subtotal: preview.subtotal,
        discountAmount:
          preview.discount?.applied && preview.discount?.amount > 0
            ? preview.discount.amount
            : 0,
        total: preview.total,
        discountLabel:
          preview.discount?.applied && preview.discount?.amount > 0
            ? preview.discount?.type === "percent"
              ? `${preview.discount.value}%${
                  preview.discount.name ? ` - ${preview.discount.name}` : ""
                }`
              : `₪${preview.discount.value}${
                  preview.discount.name ? ` - ${preview.discount.name}` : ""
                }`
            : null,
        threshold: preview.discount?.threshold || 0,
      };
    }
    // fallback محلي (بدون خصم)
    return {
      subtotal: localSubtotal,
      discountAmount: 0,
      total: localTotal,
      discountLabel: null as string | null,
      threshold: 0,
    };
  }, [preview, localSubtotal, localTotal]);

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
      // نجمع البيانات بنفس أسلوبك القديم — السيرفر سيعيد الحساب ويتجاهل أي سعر مرسل من العميل
      const orderData = {
        address: userData.address,
        // إرسال total ليس ضروريًا، لكن لا يضرّ — السيرفر يعيد الحساب على أي حال
        total: summary.total,
        items: cart.map((item) => ({
          productId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price, // لا يعتمد عليه السيرفر، سيقرأ من Variant ويحسب
          color: item.selectedColor || null,
          measure: item.selectedMeasure || null,
          sku: (item as any).sku || undefined,
          image: (item as any).image || item.image || undefined,
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
        setPreview(null);
      }
    } catch (err: any) {
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
                  <td className="py-2 px-4 border">{currency(item.price)}</td>
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
                    {currency(item.price * item.quantity)}
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
              <p className="text-gray-600 mb-1">
                السعر: {currency(item.price)}
              </p>
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
                الإجمالي: {currency(item.price * item.quantity)}
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

        {/* 💳 الملخص + زر الإرسال */}
        <div className="mt-6 flex justify-between items-start flex-col md:flex-row gap-4">
          <div className="space-y-1 text-right w-full md:w-auto">
            <p className="text-base">
              المجموع الفرعي:{" "}
              <span className="font-medium">{currency(summary.subtotal)}</span>
            </p>

            {loadingPreview ? (
              <p className="text-sm text-muted-foreground">
                جارٍ احتساب الخصم…
              </p>
            ) : summary.discountAmount > 0 ? (
              <>
                <p className="text-base text-green-700">
                  الخصم
                  {summary.discountLabel
                    ? ` (${summary.discountLabel})`
                    : ""}:{" "}
                  <span className="font-medium">
                    -{currency(summary.discountAmount)}
                  </span>
                </p>
                {summary.threshold > 0 && (
                  <p className="text-xs text-muted-foreground">
                    تم تطبيق شريحة عند ≥ {currency(summary.threshold)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                لا يوجد خصم مطبّق على هذا السلة.
              </p>
            )}

            <p className="text-xl font-bold border-t pt-2">
              الإجمالي: <span>{currency(summary.total)}</span>
            </p>
          </div>

          <Button onClick={handleOrder} disabled={cart.length === 0}>
            تأكيد الطلب
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Cart;
