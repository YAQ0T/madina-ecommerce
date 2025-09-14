import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";

type Price = {
  amount: number;
  compareAt?: number;
  currency?: string;
  discount?: {
    type?: "percent" | "amount";
    value?: number;
    startAt?: string; // ISO
    endAt?: string; // ISO
  };
};

type Stock = {
  inStock: number;
  sku: string;
};

type Variant = {
  _id?: string;
  product: string;
  measure: string;
  measureUnit?: string; // ✅ جديد
  measureSlug?: string;
  color: { name: string; code?: string; images?: string[] };
  colorSlug?: string;
  price: Price;
  stock: Stock;
  tags?: string[];
  finalAmount?: number;
  isDiscountActive?: boolean;
  displayCompareAt?: number | null;
};

interface Props {
  product: any;
  token: string;
  onClose: () => void;
  onChanged?: () => void;
}

const emptyForm = (productId: string): Variant => ({
  product: productId,
  measure: "",
  measureUnit: "", // ✅
  color: { name: "", code: "", images: [] },
  price: { amount: 0, compareAt: undefined, currency: "USD" },
  stock: { inStock: 0, sku: "" },
  tags: [],
});

const VariantManagerDialog: React.FC<Props> = ({
  product,
  token,
  onClose,
  onChanged,
}) => {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [form, setForm] = useState<Variant>(() => emptyForm(product._id));
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [newColorImage, setNewColorImage] = useState("");

  const [discountTargetId, setDiscountTargetId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<"percent" | "amount">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountStart, setDiscountStart] = useState<string>("");
  const [discountEnd, setDiscountEnd] = useState<string>("");
  const [applyingDiscount, setApplyingDiscount] = useState<boolean>(false);

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchVariants = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/variants`,
        { params: { product: product._id, limit: 500 }, headers }
      );
      setVariants(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("❌ Failed to fetch variants", e);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id]);

  const resetForm = () => {
    setForm(emptyForm(product._id));
    setIsEditingId(null);
    setNewColorImage("");
  };

  const handleAddColorImage = () => {
    if (!newColorImage.trim()) return;
    setForm({
      ...form,
      color: {
        ...form.color,
        images: [...(form.color.images || []), newColorImage.trim()],
      },
    });
    setNewColorImage("");
  };

  const handleRemoveColorImage = (idx: number) => {
    const imgs = [...(form.color.images || [])];
    imgs.splice(idx, 1);
    setForm({ ...form, color: { ...form.color, images: imgs } });
  };

  const createVariant = async () => {
    try {
      const payload = form;
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/variants`,
        payload,
        { headers }
      );
      setVariants((prev) => [data, ...prev]);
      onChanged?.();
    } catch (e: any) {
      console.error("❌ Failed to create variant", e);
      alert(
        e?.response?.data?.error || "فشل إنشاء المتغيّر (تحقق من SKU والتكرار)"
      );
    }
  };

  const updateVariant = async () => {
    if (!isEditingId) return;
    try {
      const payload = { ...form };
      const { data } = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/variants/${isEditingId}`,
        payload,
        { headers }
      );
      setVariants((prev) =>
        prev.map((v) => (v._id === isEditingId ? data : v))
      );
      onChanged?.();
    } catch (e: any) {
      console.error("❌ Failed to update variant", e);
      alert(e?.response?.data?.error || "فشل تعديل المتغيّر");
    }
  };

  const deleteVariant = async (id: string) => {
    const ok = confirm("حذف هذا المتغيّر؟");
    if (!ok) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/variants/${id}`, {
        headers,
      });
      setVariants((prev) => prev.filter((v) => v._id !== id));
      onChanged?.();
    } catch (e) {
      console.error("❌ Failed to delete variant", e);
      alert("فشل حذف المتغيّر");
    }
  };

  const startEdit = (v: Variant) => {
    setIsEditingId(v._id!);
    setForm({
      product: v.product,
      measure: v.measure,
      measureUnit: v.measureUnit || "", // ✅
      color: {
        name: v.color?.name || "",
        code: v.color?.code || "",
        images: v.color?.images || [],
      },
      price: {
        amount: v.price?.amount || 0,
        compareAt: v.price?.compareAt,
        currency: v.price?.currency || "USD",
      },
      stock: {
        inStock: v.stock?.inStock || 0,
        sku: v.stock?.sku || "",
      },
      tags: v.tags || [],
    });
  };

  const openDiscountEditor = (v: Variant) => {
    setDiscountTargetId(v._id!);
    const d = v.price?.discount || {};
    setDiscountType((d.type as "percent" | "amount") || "percent");
    setDiscountValue(typeof d.value === "number" ? d.value : 0);

    const toLocalDT = (iso?: string) => {
      if (!iso) return "";
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    };

    setDiscountStart(d.startAt ? toLocalDT(d.startAt) : "");
    setDiscountEnd(d.endAt ? toLocalDT(d.endAt) : "");
  };

  const closeDiscountEditor = () => {
    setDiscountTargetId(null);
    setDiscountType("percent");
    setDiscountValue(0);
    setDiscountStart("");
    setDiscountEnd("");
  };

  const applyDiscount = async () => {
    if (!discountTargetId) return;
    try {
      setApplyingDiscount(true);
      const toISO = (local: string) => {
        if (!local) return undefined;
        const date = new Date(local);
        return date.toISOString();
      };

      const payload: any = {
        type: discountType,
        value: Number(discountValue || 0),
      };
      const sISO = toISO(discountStart);
      const eISO = toISO(discountEnd);
      if (sISO) payload.startAt = sISO;
      if (eISO) payload.endAt = eISO;

      const { data } = await axios.post(
        `${
          import.meta.env.VITE_API_URL
        }/api/variants/${discountTargetId}/discount`,
        payload,
        { headers }
      );

      setVariants((prev) =>
        prev.map((v) => (v._id === discountTargetId ? data : v))
      );
      closeDiscountEditor();
      onChanged?.();
    } catch (e: any) {
      console.error("❌ Failed to apply discount", e);
      alert(e?.response?.data?.error || "فشل ضبط الخصم");
    } finally {
      setApplyingDiscount(false);
    }
  };

  const clearDiscount = async (id: string) => {
    const ok = confirm("إلغاء الخصم لهذا المتغيّر؟");
    if (!ok) return;
    try {
      setApplyingDiscount(true);
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/variants/${id}/discount`,
        { type: "percent", value: 0 },
        { headers }
      );
      setVariants((prev) => prev.map((v) => (v._id === id ? data : v)));
      if (discountTargetId === id) closeDiscountEditor();
      onChanged?.();
    } catch (e: any) {
      console.error("❌ Failed to clear discount", e);
      alert(e?.response?.data?.error || "فشل إلغاء الخصم");
    } finally {
      setApplyingDiscount(false);
    }
  };

  return (
    <div className="text-right">
      <h2 className="text-xl font-bold mb-2">
        إدارة المتغيّرات — {product?.name}
      </h2>

      {/* القائمة */}
      <div className="border rounded mb-4 overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 border">SKU</th>
              <th className="px-3 py-2 border">المقاس</th>
              <th className="px-3 py-2 border">الوحدة</th>
              {/* ✅ جديد */}
              <th className="px-3 py-2 border">اللون</th>
              <th className="px-3 py-2 border">السعر الأساسي</th>
              <th className="px-3 py-2 border">سعر مقارن</th>
              <th className="px-3 py-2 border">السعر الحالي</th>
              <th className="px-3 py-2 border">حالة الخصم</th>
              <th className="px-3 py-2 border">المخزون</th>
              <th className="px-3 py-2 border">صور اللون</th>
              <th className="px-3 py-2 border">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-3 py-4 text-center">
                  تحميل…
                </td>
              </tr>
            ) : variants.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-4 text-center text-gray-500"
                >
                  لا توجد متغيّرات بعد
                </td>
              </tr>
            ) : (
              variants.map((v) => (
                <tr key={v._id}>
                  <td className="px-3 py-2 border">{v.stock?.sku}</td>
                  <td className="px-3 py-2 border">{v.measure}</td>
                  <td className="px-3 py-2 border">
                    {v.measureUnit || "—"}
                  </td>{" "}
                  {/* ✅ */}
                  <td className="px-3 py-2 border">
                    {v.color?.name}
                    {v.color?.code ? ` (${v.color.code})` : ""}
                  </td>
                  <td className="px-3 py-2 border">₪{v.price?.amount ?? 0}</td>
                  <td className="px-3 py-2 border">
                    {v.displayCompareAt != null
                      ? `₪${v.displayCompareAt}`
                      : v.price?.compareAt ?? "-"}
                  </td>
                  <td className="px-3 py-2 border">
                    {typeof v.finalAmount === "number"
                      ? `₪${v.finalAmount}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 border">
                    {v.isDiscountActive ? (
                      <span className="text-green-600">نشط</span>
                    ) : (
                      <span className="text-gray-500">غير نشط</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border">{v.stock?.inStock ?? 0}</td>
                  <td className="px-3 py-2 border">
                    {(v.color?.images || []).length}
                  </td>
                  <td className="px-3 py-2 border flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openDiscountEditor(v)}
                    >
                      خصم
                    </Button>
                    {v.isDiscountActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearDiscount(v._id!)}
                        disabled={applyingDiscount}
                      >
                        إلغاء الخصم
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(v)}
                    >
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteVariant(v._id!)}
                    >
                      حذف
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* محرّر الخصم */}
      {discountTargetId && (
        <div className="border rounded p-3 mb-4">
          <h3 className="font-semibold mb-2">إعداد خصم للمتغيّر المحدد</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <label className="min-w-24">نوع الخصم</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "percent" | "amount")
                }
              >
                <option value="percent">نسبة %</option>
                <option value="amount">مبلغ ثابت</option>
              </select>
            </div>

            <Input
              type="number"
              placeholder={
                discountType === "percent" ? "القيمة (%)" : "القيمة (₪)"
              }
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value || 0))}
            />

            <div className="flex items-center gap-2">
              <label className="min-w-24">يبدأ في</label>
              <Input
                type="datetime-local"
                value={discountStart}
                onChange={(e) => setDiscountStart(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="min-w-24">ينتهي في</label>
              <Input
                type="datetime-local"
                value={discountEnd}
                onChange={(e) => setDiscountEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={closeDiscountEditor}>
              إلغاء
            </Button>
            <Button onClick={applyDiscount} disabled={applyingDiscount}>
              {applyingDiscount ? "جارِ التطبيق…" : "تطبيق الخصم"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            تلميح: لخصم 24 ساعة، البداية الآن والنهاية بعد 24 ساعة.
          </p>
        </div>
      )}

      {/* النموذج (إضافة/تعديل) */}
      <div className="grid md:grid-cols-3 gap-3">
        <Input
          placeholder="SKU"
          value={form.stock.sku}
          onChange={(e) =>
            setForm({ ...form, stock: { ...form.stock, sku: e.target.value } })
          }
        />
        <Input
          placeholder="المقاس (مثال: 500)"
          value={form.measure}
          onChange={(e) => setForm({ ...form, measure: e.target.value })}
        />
        <Input
          placeholder="الوحدة (مثال: ml, cm, kg) — اختياري"
          value={form.measureUnit || ""}
          onChange={(e) => setForm({ ...form, measureUnit: e.target.value })}
        />

        <Input
          placeholder="اللون (مثال: Black)"
          value={form.color.name}
          onChange={(e) =>
            setForm({ ...form, color: { ...form.color, name: e.target.value } })
          }
        />
        <Input
          placeholder="كود اللون (اختياري مثل #000000)"
          value={form.color.code || ""}
          onChange={(e) =>
            setForm({ ...form, color: { ...form.color, code: e.target.value } })
          }
        />
        <Input
          type="number"
          placeholder="السعر الأساسي"
          value={form.price.amount}
          onChange={(e) =>
            setForm({
              ...form,
              price: { ...form.price, amount: Number(e.target.value || 0) },
            })
          }
        />
        <Input
          type="number"
          placeholder="سعر المقارنة (اختياري)"
          value={form.price.compareAt ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              price: {
                ...form.price,
                compareAt: e.target.value ? Number(e.target.value) : undefined,
              },
            })
          }
        />
        <Input
          type="number"
          placeholder="المخزون"
          value={form.stock.inStock}
          onChange={(e) =>
            setForm({
              ...form,
              stock: { ...form.stock, inStock: Number(e.target.value || 0) },
            })
          }
        />
      </div>

      {/* صور اللون */}
      <div className="mt-3">
        <div className="flex gap-2">
          <Input
            placeholder="رابط صورة لون"
            value={newColorImage}
            onChange={(e) => setNewColorImage(e.target.value)}
          />
          <Button type="button" onClick={handleAddColorImage}>
            إضافة صورة
          </Button>
        </div>
        <ul className="text-sm mt-2 space-y-1">
          {(form.color.images || []).map((img, idx) => (
            <li key={idx} className="flex justify-between items-center">
              <span className="truncate max-w-xs">{img}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveColorImage(idx)}
              >
                حذف
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* الأزرار */}
      <div className="mt-4 flex justify-end gap-2">
        {isEditingId ? (
          <>
            <Button variant="outline" onClick={resetForm}>
              إلغاء
            </Button>
            <Button onClick={updateVariant}>حفظ التعديل</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              إغلاق
            </Button>
            <Button onClick={createVariant}>إضافة متغيّر</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VariantManagerDialog;
