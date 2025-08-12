// src/components/admin/ProductTable.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import VariantManagerDialog from "@/components/admin/VariantManagerDialog";

interface ProductTableProps {
  productsState: any[];
  setProductsState: (products: any[]) => void;
  productFilter: string;
  token: string;
  onEdit: (product: any) => void;
  onRefreshProducts?: () => void; // لإعادة تحميل المنتجات مع الإحصاءات بعد تغييرات المتغيرات
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

  const handleDelete = async (productId: string, productName: string) => {
    const confirmDelete = confirm(`هل أنت متأكد من حذف "${productName}"؟`);
    if (!confirmDelete) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/products/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProductsState(productsState.filter((p) => p._id !== productId));
    } catch (err) {
      console.error("❌ Error deleting product", err);
      alert("فشل في حذف المنتج");
    }
  };

  const list = productsState.filter((product) => {
    if (productFilter === "all") return true;
    return (
      product.mainCategory === productFilter ||
      product.subCategory === productFilter
    );
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">#</th>
            <th className="border px-4 py-2">الاسم</th>
            <th className="border px-4 py-2">أقل سعر</th>
            <th className="border px-4 py-2">الكمية الإجمالية</th>
            <th className="border px-4 py-2">التصنيف الرئيسي</th>
            <th className="border px-4 py-2">التصنيف الفرعي</th>
            <th className="border px-4 py-2">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {list.map((product, idx) => (
            <tr key={product._id}>
              <td className="border px-4 py-2">{idx + 1}</td>
              <td className="border px-4 py-2">{product.name}</td>
              <td className="border px-4 py-2">₪{product.price ?? 0}</td>
              <td className="border px-4 py-2">{product.quantity ?? 0}</td>
              <td className="border px-4 py-2">{product.mainCategory}</td>
              <td className="border px-4 py-2">{product.subCategory}</td>
              <td className="border px-4 py-2 flex gap-2 justify-end">
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
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td
                colSpan={7}
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
