// src/components/admin/ProductTable.tsx
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import VariantManagerDialog from "@/components/admin/VariantManagerDialog";

interface ProductTableProps {
  productsState: any[];
  setProductsState: React.Dispatch<React.SetStateAction<any[]>>; // ✅ تصحيح النوع
  productFilter: string;
  token: string;
  onEdit: (product: any) => void;
  onRefreshProducts?: () => void; // لإعادة تحميل المنتجات مع الإحصاءات بعد تغييرات المتغيرات
}

const badgeBase =
  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium";
const badgeOurs = `${badgeBase} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300`;
const badgeLocal = `${badgeBase} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300`;

// شارة بسيطة لعرض الأولوية
function PriorityBadge({ value }: { value?: string }) {
  const v = (value || "C").toUpperCase();
  const map: Record<string, string> = {
    A: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
    B: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    C: "bg-gray-100 text-gray-800 dark:bg-zinc-900/30 dark:text-gray-300",
  };
  const cls = `${badgeBase} ${map[v] || map.C}`;
  return (
    <span className={cls} title="أولوية الظهور">
      {v}
    </span>
  );
}

function OwnershipBadge({ value }: { value?: string }) {
  const v = (value || "ours").toLowerCase();
  if (v === "local")
    return (
      <span className={badgeLocal} title="شراء محلي">
        شراء محلي
      </span>
    );
  return (
    <span className={badgeOurs} title="على اسمنا">
      على اسمنا
    </span>
  );
}

const ProductTable: React.FC<ProductTableProps> = ({
  productsState,
  setProductsState,
  productFilter,
  token,
  onEdit,
  onRefreshProducts,
}) => {
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleDelete = async (productId: string, productName: string) => {
    const confirmDelete = confirm(`هل أنت متأكد من حذف "${productName}"؟`);
    if (!confirmDelete) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/products/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProductsState((prev) => prev.filter((p) => p._id !== productId));
    } catch (err) {
      console.error("❌ Error deleting product", err);
      alert("فشل في حذف المنتج");
    }
  };

  // ✅ تغيير أولوية المنتج (Inline)
  const handlePriorityChange = async (
    productId: string,
    newPriority: string
  ) => {
    const clean = ["A", "B", "C"].includes(newPriority) ? newPriority : "C";

    // تحديث متفائل
    setProductsState((prev) =>
      prev.map((p) => (p._id === productId ? { ...p, priority: clean } : p))
    );
    setSavingId(productId);

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/products/${productId}`,
        { priority: clean },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("❌ Error updating priority", err);
      alert("فشل في تحديث الأولوية");
      // في حالة الخطأ، يُفضّل إعادة الجلب إن كان متاحًا
      if (onRefreshProducts) onRefreshProducts();
    } finally {
      setSavingId(null);
    }
  };

  // فلترة حسب التصنيف كما كانت
  const list = useMemo(() => {
    const filtered = productsState.filter((product) => {
      if (productFilter === "all") return true;
      return (
        product.mainCategory === productFilter ||
        product.subCategory === productFilter
      );
    });

    // ترتيب بسيط (أحدث أولاً) إن كان createdAt موجود
    return [...filtered].sort((a, b) => {
      const ad = new Date(a.createdAt || 0).getTime();
      const bd = new Date(b.createdAt || 0).getTime();
      return bd - ad;
    });
  }, [productsState, productFilter]);

  // دوال مساعدة لعرض السعر/الكمية مع fallback
  const getDisplayPrice = (p: any) => {
    const v =
      typeof p?.minPrice === "number"
        ? p.minPrice
        : typeof p?.price === "number"
        ? p.price
        : 0;
    return `₪${v}`;
  };

  const getDisplayQuantity = (p: any) => {
    if (typeof p?.totalStock === "number") return p.totalStock;
    if (typeof p?.quantity === "number") return p.quantity;
    return 0;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right border">
        <thead className="bg-gray-100 dark:bg-zinc-900/50">
          <tr>
            <th className="border px-4 py-2">#</th>
            <th className="border px-4 py-2">الاسم</th>
            <th className="border px-4 py-2">نوع الملكية</th>
            {/* ✅ عمود الأولوية */}
            <th className="border px-4 py-2">الأولوية</th>
            <th className="border px-4 py-2">أقل سعر</th>
            <th className="border px-4 py-2">الكمية الإجمالية</th>
            <th className="border px-4 py-2">التصنيف الرئيسي</th>
            <th className="border px-4 py-2">التصنيف الفرعي</th>
            <th className="border px-4 py-2">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {list.map((product, idx) => (
            <tr
              key={product._id}
              className="odd:bg-white even:bg-gray-50 dark:odd:bg-zinc-900 dark:even:bg-zinc-950"
            >
              <td className="border px-4 py-2 align-top">{idx + 1}</td>
              <td className="border px-4 py-2 align-top">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{product.name}</span>
                  {Array.isArray(product.images) && product.images[0] && (
                    <a
                      href={product.images[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate max-w-[220px]"
                      title="فتح أول صورة"
                    >
                      معاينة الصورة
                    </a>
                  )}
                </div>
              </td>

              <td className="border px-4 py-2 align-top">
                <OwnershipBadge value={product.ownershipType} />
              </td>

              {/* ✅ خلية التحكم بالأولوية */}
              <td className="border px-4 py-2 align-top">
                <div className="flex items-center gap-2 justify-end">
                  <PriorityBadge value={product.priority} />
                  <select
                    className="border rounded-md p-1 text-sm bg-background"
                    value={(product.priority || "C").toUpperCase()}
                    onChange={(e) =>
                      handlePriorityChange(product._id, e.target.value)
                    }
                    disabled={savingId === product._id}
                    title="تغيير أولوية الظهور"
                  >
                    <option value="A">A - عالية</option>
                    <option value="B">B - متوسطة</option>
                    <option value="C">C - عادية</option>
                  </select>
                </div>
              </td>

              <td className="border px-4 py-2 align-top">
                {getDisplayPrice(product)}
              </td>
              <td className="border px-4 py-2 align-top">
                {getDisplayQuantity(product)}
              </td>
              <td className="border px-4 py-2 align-top">
                {product.mainCategory}
              </td>
              <td className="border px-4 py-2 align-top">
                {product.subCategory}
              </td>
              <td className="border px-4 py-2 align-top">
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(product)}
                  >
                    ✏️ تعديل
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setManageOpen(true);
                    }}
                  >
                    🎛️ المتغيّرات
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product._id, product.name)}
                  >
                    🗑️ حذف
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="border px-4 py-6 text-center text-gray-500"
              >
                لا توجد منتجات مطابقة
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* مودال إدارة المتغيّرات */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="w-[95vw] sm:max-w-7xl max-h-[85vh] overflow-y-auto p-6">
          {selectedProduct && (
            <VariantManagerDialog
              product={selectedProduct}
              token={token}
              onClose={() => setManageOpen(false)}
              onChanged={onRefreshProducts}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductTable;
