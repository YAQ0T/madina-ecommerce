// src/components/admin/ProductForm.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import React, { useState, useMemo } from "react";

interface ProductFormProps {
  newProduct: any;
  setNewProduct: (data: any) => void;
  productsState: any[];
  setProductsState: (data: any[]) => void;
  token: string;
  onSuccess?: () => void; // لإعادة الجلب بعد النجاح (اختياري)
}

const ProductForm: React.FC<ProductFormProps> = ({
  newProduct,
  setNewProduct,
  productsState,
  setProductsState,
  token,
  onSuccess,
}) => {
  const [newImage, setNewImage] = useState("");

  const mainCategories = useMemo(
    () =>
      [...new Set(productsState.map((p) => p.mainCategory))].filter(Boolean),
    [productsState]
  );

  const uniqueSubCategories = useMemo(() => {
    const list = productsState
      .filter((p) => p.mainCategory === newProduct.mainCategory)
      .map((p) => p.subCategory)
      .filter(Boolean);
    return [...new Set(list)];
  }, [productsState, newProduct.mainCategory]);

  // إضافة صورة
  const handleAddImage = () => {
    if (newImage.trim()) {
      setNewProduct({
        ...newProduct,
        images: [...(newProduct.images || []), newImage.trim()],
      });
      setNewImage("");
    }
  };

  // حذف عنصر من مصفوفة
  const handleRemoveItem = (index: number) => {
    const updated = [...(newProduct.images || [])];
    updated.splice(index, 1);
    setNewProduct({ ...newProduct, images: updated });
  };

  // إرسال المنتج (بدون price/quantity/discount/tags/measures/colors)
  const handleSubmit = async () => {
    try {
      const payload = {
        name: newProduct.name?.trim(),
        mainCategory: newProduct.mainCategory?.trim(),
        subCategory: newProduct.subCategory?.trim(),
        description: newProduct.description?.trim(),
        images: Array.isArray(newProduct.images) ? newProduct.images : [],
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/products`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // إمّا نحدّث الحالة محليًا أو نعيد الجلب
      if (onSuccess) {
        onSuccess();
      } else {
        setProductsState([
          ...productsState,
          { ...res.data, price: 0, quantity: 0 },
        ]);
      }

      // إعادة تعيين الحقول
      setNewProduct({
        name: "",
        mainCategory: "",
        subCategory: "",
        description: "",
        images: [],
      });
    } catch (err) {
      console.error("❌ Error adding product", err);
      alert("فشل في إضافة المنتج");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>إضافة منتج جديد</DialogTitle>
        <DialogDescription>
          قم بملء الحقول التالية لإضافة منتج إلى المتجر
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[70vh] overflow-y-auto grid gap-4 py-4 text-right">
        <Input
          placeholder="اسم المنتج"
          value={newProduct.name ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, name: e.target.value })
          }
        />

        <Input
          list="main-categories"
          placeholder="التصنيف الرئيسي"
          value={newProduct.mainCategory ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, mainCategory: e.target.value })
          }
        />
        <datalist id="main-categories">
          {mainCategories.map((cat, idx) => (
            <option key={idx} value={cat} />
          ))}
        </datalist>

        <Input
          list="sub-categories"
          placeholder="التصنيف الفرعي"
          value={newProduct.subCategory ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, subCategory: e.target.value })
          }
        />
        <datalist id="sub-categories">
          {uniqueSubCategories.map((sub, idx) => (
            <option key={idx} value={sub} />
          ))}
        </datalist>

        <Textarea
          placeholder="وصف المنتج"
          value={newProduct.description ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, description: e.target.value })
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
              إضافة
            </Button>
          </div>
          <ul className="text-sm space-y-1">
            {(newProduct.images || []).map((img: string, idx: number) => (
              <li key={idx} className="flex justify-between items-center">
                <span className="truncate max-w-xs">{img}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveItem(idx)}
                >
                  حذف
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit}>حفظ المنتج</Button>
      </DialogFooter>
    </>
  );
};

export default ProductForm;
