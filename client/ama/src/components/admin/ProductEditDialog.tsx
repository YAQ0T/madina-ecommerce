// src/components/admin/ProductEditDialog.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axios from "axios";

interface ProductEditDialogProps {
  onClose: () => void;
  editingProduct: any;
  setEditingProduct: (product: any) => void;
  setProductsState: (products: any[]) => void;
  products: any[]; // ✅ أضفنا هذا السطر
  token: string;
}

const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  onClose,
  editingProduct,
  setEditingProduct,
  setProductsState,
  products, // ✅ استخدمناه هون
  token,
}) => {
  if (!editingProduct) return null;

  const handleSave = async () => {
    try {
      const res = await axios.put(
        `http://localhost:3001/api/products/${editingProduct._id}`,
        {
          ...editingProduct,
          price: parseFloat(editingProduct.price),
          quantity: parseInt(editingProduct.quantity),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedProducts = products.map((p) =>
        p._id === res.data._id ? res.data : p
      );

      setProductsState(updatedProducts); // ✅ نمرر مصفوفة مباشرة
      setEditingProduct(null);
      onClose();
    } catch (err) {
      console.error("❌ Error editing product", err);
      alert("فشل في تعديل المنتج");
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>تعديل منتج</DialogTitle>
        <DialogDescription>
          قم بملء الحقول التالية لتعديل المنتج
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4 text-right">
        <Input
          placeholder="اسم المنتج"
          value={editingProduct.name}
          onChange={(e) =>
            setEditingProduct({ ...editingProduct, name: e.target.value })
          }
        />
        <Input
          type="number"
          placeholder="السعر"
          value={editingProduct.price}
          onChange={(e) =>
            setEditingProduct({ ...editingProduct, price: e.target.value })
          }
        />
        <Input
          placeholder="الفئة"
          value={editingProduct.mainCategory}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              mainCategory: e.target.value,
            })
          }
        />
        <Textarea
          placeholder="وصف المنتج"
          value={editingProduct.description}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              description: e.target.value,
            })
          }
        />
        <Input
          type="number"
          placeholder="الكمية"
          value={editingProduct.quantity}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              quantity: e.target.value,
            })
          }
        />

        <Input
          placeholder="رابط الصورة"
          value={editingProduct.image}
          onChange={(e) =>
            setEditingProduct({ ...editingProduct, image: e.target.value })
          }
        />
      </div>

      <DialogFooter>
        <Button onClick={handleSave}>حفظ التعديلات</Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default ProductEditDialog;
