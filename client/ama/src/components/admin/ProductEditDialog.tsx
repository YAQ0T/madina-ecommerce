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
  const [newTag, setNewTag] = useState("");
  const [newMeasure, setNewMeasure] = useState("");
  const [newColor, setNewColor] = useState("");

  if (!editingProduct) return null;

  const handleSave = async () => {
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/products/${editingProduct._id}`,
        {
          ...editingProduct,
          price: parseFloat(editingProduct.price),
          quantity: parseInt(editingProduct.quantity),
          discount: parseFloat(editingProduct.discount) || 0,
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
  const handleAddToArray = (field: string, value: string) => {
    if (value.trim()) {
      setEditingProduct({
        ...editingProduct,
        [field]: [...(editingProduct[field] || []), value],
      });
      if (field === "tags") setNewTag("");
      if (field === "measures") setNewMeasure("");
      if (field === "colors") setNewColor("");
    }
  };
  const handleRemoveFromArray = (field: string, index: number) => {
    const updated = [...editingProduct[field]];
    updated.splice(index, 1);
    setEditingProduct({ ...editingProduct, [field]: updated });
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
        {/* Discount */}
        <Input
          type="number"
          placeholder="الخصم (%)"
          value={editingProduct.discount ?? ""}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              discount: e.target.value,
            })
          }
        />

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="أضف وسم جديد"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => handleAddToArray("tags", newTag)}
            >
              إضافة
            </Button>
          </div>
          <ul className="text-sm text-gray-700 space-y-1">
            {(editingProduct.tags || []).map((tag: string, idx: number) => (
              <li key={idx} className="flex justify-between items-center">
                <span>{tag}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveFromArray("tags", idx)}
                >
                  حذف
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {/* Measures */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="أضف مقاس جديد"
              value={newMeasure}
              onChange={(e) => setNewMeasure(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => handleAddToArray("measures", newMeasure)}
            >
              إضافة
            </Button>
          </div>
          <ul className="text-sm text-gray-700 space-y-1">
            {(editingProduct.measures || []).map((m: string, idx: number) => (
              <li key={idx} className="flex justify-between items-center">
                <span>{m}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveFromArray("measures", idx)}
                >
                  حذف
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {/* Colors */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="أضف لون جديد"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => handleAddToArray("colors", newColor)}
            >
              إضافة
            </Button>
          </div>
          <ul className="text-sm text-gray-700 space-y-1">
            {(editingProduct.colors || []).map((c: string, idx: number) => (
              <li key={idx} className="flex justify-between items-center">
                <span>{c}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveFromArray("colors", idx)}
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
