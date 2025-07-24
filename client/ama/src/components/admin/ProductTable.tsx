// src/components/admin/ProductTable.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";

interface ProductTableProps {
  productsState: any[];
  setProductsState: (products: any[]) => void;
  productFilter: string;
  token: string;
  onEdit: (product: any) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  productsState,
  setProductsState,
  productFilter,
  token,
  onEdit,
}) => {
  const handleDelete = async (productId: string, productName: string) => {
    const confirmDelete = confirm(`هل أنت متأكد من حذف "${productName}"؟`);
    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:3001/api/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProductsState((prev) => prev.filter((p) => p._id !== productId));
    } catch (err) {
      console.error("❌ Error deleting product", err);
      alert("فشل في حذف المنتج");
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">#</th>
            <th className="border px-4 py-2">الاسم</th>
            <th className="border px-4 py-2">السعر</th>
            <th className="border px-4 py-2">التصنيف الرئيسي</th>
            <th className="border px-4 py-2">التصنيف الفرعي</th>
            <th className="border px-4 py-2">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {productsState
            .filter((product) => {
              if (productFilter === "all") return true;
              return (
                product.mainCategory === productFilter ||
                product.subCategory === productFilter
              );
            })
            .map((product, idx) => (
              <tr key={product._id}>
                <td className="border px-4 py-2">{idx + 1}</td>
                <td className="border px-4 py-2">{product.name}</td>
                <td className="border px-4 py-2">₪{product.price}</td>
                <td className="border px-4 py-2">{product.mainCategory}</td>
                <td className="border px-4 py-2">{product.subCategory}</td>
                <td className="border px-4 py-2 space-x-2 space-x-reverse">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(product)}
                  >
                    ✏️ تعديل
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
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;
