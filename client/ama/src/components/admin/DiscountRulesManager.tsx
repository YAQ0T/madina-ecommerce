// src/components/admin/DiscountRulesManager.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Rule = {
  _id?: string;
  name?: string;
  threshold: number;
  type: "percent" | "fixed";
  value: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
};

const emptyRule: Rule = {
  name: "",
  threshold: 0,
  type: "percent",
  value: 0,
  isActive: true,
  startAt: null,
  endAt: null,
  priority: 0,
};

const currency = (n: number) => `₪${n.toFixed(2)}`;

const DiscountRulesManager: React.FC = () => {
  const { token } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Rule>(emptyRule);
  const [editId, setEditId] = useState<string | null>(null);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/discount-rules`,
        { headers }
      );
      setRules(res.data || []);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "فشل جلب قواعد الخصم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetForm = () => {
    setForm(emptyRule);
    setEditId(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      if (editId) {
        const res = await axios.patch(
          `${import.meta.env.VITE_API_URL}/api/discount-rules/${editId}`,
          form,
          { headers }
        );
        setRules((prev) => prev.map((r) => (r._id === editId ? res.data : r)));
      } else {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/discount-rules`,
          form,
          { headers }
        );
        setRules((prev) => [...prev, res.data]);
      }
      resetForm();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "فشل حفظ القاعدة");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (r: Rule) => {
    setEditId(r._id || null);
    setForm({
      name: r.name || "",
      threshold: r.threshold,
      type: r.type,
      value: r.value,
      isActive: !!r.isActive,
      startAt: r.startAt || null,
      endAt: r.endAt || null,
      priority: r.priority || 0,
    });
  };

  const onDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("هل أنت متأكد من حذف هذه القاعدة؟")) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/discount-rules/${id}`,
        { headers }
      );
      setRules((prev) => prev.filter((r) => r._id !== id));
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "فشل حذف القاعدة");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">خصومات الطلبات (حسب المجموع)</h2>

      {/* النموذج */}
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-2xl"
      >
        <div className="space-y-1">
          <label className="text-sm">اسم القاعدة (اختياري)</label>
          <Input
            value={form.name || ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="مثال: خصم 10% فوق 2000"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">العتبة (threshold) بالشيكل</label>
          <Input
            type="number"
            min={0}
            value={form.threshold}
            onChange={(e) =>
              setForm((f) => ({ ...f, threshold: Number(e.target.value || 0) }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">نوع الخصم</label>
          <select
            className="border rounded-md p-2 bg-background"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                type: e.target.value as "percent" | "fixed",
              }))
            }
          >
            <option value="percent">نسبة مئوية (%)</option>
            <option value="fixed">قيمة ثابتة (₪)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm">
            {form.type === "percent" ? "قيمة النسبة (%)" : "المبلغ (₪)"}
          </label>
          <Input
            type="number"
            min={0}
            value={form.value}
            onChange={(e) =>
              setForm((f) => ({ ...f, value: Number(e.target.value || 0) }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">
            أولوية (أكبر يعني أعلى أولوية عند نفس العتبة)
          </label>
          <Input
            type="number"
            value={form.priority || 0}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                priority: Number(e.target.value || 0),
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">الحالة</label>
          <select
            className="border rounded-md p-2 bg-background"
            value={form.isActive ? "1" : "0"}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.value === "1" }))
            }
          >
            <option value="1">مفعّل</option>
            <option value="0">موقّف</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm">يبدأ في (اختياري)</label>
          <Input
            type="datetime-local"
            value={form.startAt ? form.startAt.substring(0, 16) : ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                startAt: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">ينتهي في (اختياري)</label>
          <Input
            type="datetime-local"
            value={form.endAt ? form.endAt.substring(0, 16) : ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                endAt: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              }))
            }
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {editId ? "تحديث القاعدة" : "إضافة القاعدة"}
          </Button>
          {editId && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              إلغاء التعديل
            </Button>
          )}
        </div>
      </form>

      {/* الجدول */}
      <div className="overflow-auto border rounded-2xl">
        <table className="w-full text-right">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">الاسم</th>
              <th className="p-3">العتبة</th>
              <th className="p-3">النوع</th>
              <th className="p-3">القيمة</th>
              <th className="p-3">الأولوية</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">الفترة</th>
              <th className="p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center">
                  جارِ التحميل…
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-6 text-center text-muted-foreground"
                >
                  لا توجد قواعد خصم.
                </td>
              </tr>
            ) : (
              rules
                .sort(
                  (a, b) =>
                    a.threshold - b.threshold ||
                    (b.priority || 0) - (a.priority || 0)
                )
                .map((r, i) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3">{r.name || "-"}</td>
                    <td className="p-3">{currency(r.threshold)}</td>
                    <td className="p-3">
                      {r.type === "percent" ? "نسبة" : "قيمة ثابتة"}
                    </td>
                    <td className="p-3">
                      {r.type === "percent" ? `${r.value}%` : currency(r.value)}
                    </td>
                    <td className="p-3">{r.priority || 0}</td>
                    <td className="p-3">{r.isActive ? "مفعّل" : "موقّف"}</td>
                    <td className="p-3 text-sm">
                      {r.startAt
                        ? new Date(r.startAt).toLocaleString("ar-EG")
                        : "—"}{" "}
                      {" → "}
                      {r.endAt
                        ? new Date(r.endAt).toLocaleString("ar-EG")
                        : "—"}
                    </td>
                    <td className="p-3 flex gap-2 justify-end">
                      <Button size="sm" onClick={() => onEdit(r)}>
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(r._id)}
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
    </div>
  );
};

export default DiscountRulesManager;
