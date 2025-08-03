import React, { useState } from "react";
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
}

const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  onClose,
  editingProduct,
  setEditingProduct,
  setProductsState,
  products,
  token,
}) => {
  const [newImage, setNewImage] = useState("");

  if (!editingProduct) return null;

  const handleSave = async () => {
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/products/${editingProduct._id}`,
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

      setProductsState(updatedProducts);
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
        images: [...(editingProduct.images || []), newImage],
      });
      setNewImage("");
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = [...editingProduct.images];
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
          placeholder="التصنيف الرئيسي"
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

        {/* ✅ تعديل الصور المتعددة */}
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
