// src/components/admin/ProductEditDialog.tsx
import React, { useState, useMemo } from "react";
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
  products: any[];
  token: string;
  onSuccess?: () => void; // لإعادة الجلب بعد النجاح (اختياري)
}

const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  onClose,
  editingProduct,
  setEditingProduct,
  setProductsState,
  products,
  token,
  onSuccess,
}) => {
  const [newImage, setNewImage] = useState("");

  const mainCategories = useMemo(
    () => [...new Set(products.map((p) => p.mainCategory))].filter(Boolean),
    [products]
  );

  const uniqueSubCategories = useMemo(() => {
    const list = products
      .filter((p) => p.mainCategory === editingProduct?.mainCategory)
      .map((p) => p.subCategory)
      .filter(Boolean);
    return [...new Set(list)];
  }, [products, editingProduct?.mainCategory]);

  if (!editingProduct) return null;

  const handleSave = async () => {
    try {
      const payload = {
        name: editingProduct.name?.trim(),
        mainCategory: editingProduct.mainCategory?.trim(),
        subCategory: editingProduct.subCategory?.trim(),
        description: editingProduct.description?.trim(),
        images: Array.isArray(editingProduct.images)
          ? editingProduct.images
          : [],
      };

      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/products/${editingProduct._id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (onSuccess) {
        onSuccess();
      } else {
        const updatedProducts = products.map((p) =>
          p._id === res.data._id
            ? { ...res.data, price: p.price, quantity: p.quantity }
            : p
        );
        setProductsState(updatedProducts);
      }

      setEditingProduct(null);
      onClose();
    } catch (err) {
      console.error("❌ Error editing product", err);
      alert("فشل في تعديل المنتج");
    }
  };

  const handleAddImage = () => {
    if (newImage.trim()) {
      setEditingProduct({
        ...editingProduct,
        images: [...(editingProduct.images || []), newImage.trim()],
      });
      setNewImage("");
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = [...(editingProduct.images || [])];
    updatedImages.splice(index, 1);
    setEditingProduct({ ...editingProduct, images: updatedImages });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>تعديل منتج</DialogTitle>
        <DialogDescription>
          قم بتعديل الحقول التالية ثم اضغط حفظ
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[70vh] overflow-y-auto grid gap-4 py-4 text-right">
        <Input
          placeholder="اسم المنتج"
          value={editingProduct.name ?? ""}
          onChange={(e) =>
            setEditingProduct({ ...editingProduct, name: e.target.value })
          }
        />

        <Input
          list="main-categories-edit"
          placeholder="التصنيف الرئيسي"
          value={editingProduct.mainCategory ?? ""}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              mainCategory: e.target.value,
            })
          }
        />
        <datalist id="main-categories-edit">
          {mainCategories.map((cat, idx) => (
            <option key={idx} value={cat} />
          ))}
        </datalist>

        <Input
          list="sub-categories-edit"
          placeholder="التصنيف الفرعي"
          value={editingProduct.subCategory ?? ""}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              subCategory: e.target.value,
            })
          }
        />
        <datalist id="sub-categories-edit">
          {uniqueSubCategories.map((sub, idx) => (
            <option key={idx} value={sub} />
          ))}
        </datalist>

        <Textarea
          placeholder="وصف المنتج"
          value={editingProduct.description ?? ""}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              description: e.target.value,
            })
          }
        />

        {/* صور */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="رابط صورة جديدة"
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
            />
            <Button type="button" onClick={handleAddImage}>
              إضافة صورة
            </Button>
          </div>

          <ul className="text-sm text-gray-700 space-y-1">
            {(editingProduct.images || []).map((img: string, idx: number) => (
              <li key={idx} className="flex justify-between items-center">
                <span className="truncate max-w-xs">{img}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveImage(idx)}
                >
                  حذف
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleSave}>حفظ التعديلات</Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default ProductEditDialog;
