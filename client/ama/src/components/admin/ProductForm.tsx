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
  setNewProduct: React.Dispatch<React.SetStateAction<any>>; // ✅ تصحيح النوع
  productsState: any[];
  setProductsState: React.Dispatch<React.SetStateAction<any[]>>; // ✅ تصحيح النوع
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

  // خيارات نوع الملكية
  const ownershipOptions = [
    { value: "ours", label: "على اسمنا" },
    { value: "local", label: "شراء محلي" },
  ] as const;

  // ✅ خيارات الأولوية
  const priorityOptions = [
    { value: "A", label: "A - أولوية عالية" },
    { value: "B", label: "B - أولوية متوسطة" },
    { value: "C", label: "C - أولوية عادية" },
  ] as const;

  // إضافة صورة
  const handleAddImage = () => {
    if (newImage.trim()) {
      setNewProduct((prev: any) => ({
        ...prev,
        images: [...(prev.images || []), newImage.trim()],
      }));
      setNewImage("");
    }
  };

  // حذف عنصر من مصفوفة
  const handleRemoveItem = (index: number) => {
    setNewProduct((prev: any) => {
      const updated = [...(prev.images || [])];
      updated.splice(index, 1);
      return { ...prev, images: updated };
    });
  };

  // إرسال المنتج (يتضمن ownershipType + priority)
  const handleSubmit = async () => {
    try {
      const ownershipType = ["ours", "local"].includes(
        String(newProduct.ownershipType)
      )
        ? String(newProduct.ownershipType)
        : "ours";

      const priority = ["A", "B", "C"].includes(String(newProduct.priority))
        ? String(newProduct.priority)
        : "C";

      const payload = {
        name: newProduct.name?.trim(),
        mainCategory: newProduct.mainCategory?.trim(),
        subCategory: newProduct.subCategory?.trim(),
        description: newProduct.description?.trim(),
        images: Array.isArray(newProduct.images) ? newProduct.images : [],
        ownershipType,
        priority,
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/products`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (onSuccess) {
        onSuccess();
      } else {
        setProductsState((prev) => [
          ...prev,
          { ...res.data, price: 0, quantity: 0 },
        ]);
      }
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
            setNewProduct((prev: any) => ({ ...prev, name: e.target.value }))
          }
        />

        <Input
          list="main-categories"
          placeholder="التصنيف الرئيسي"
          value={newProduct.mainCategory ?? ""}
          onChange={(e) =>
            setNewProduct((prev: any) => ({
              ...prev,
              mainCategory: e.target.value,
            }))
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
            setNewProduct((prev: any) => ({
              ...prev,
              subCategory: e.target.value,
            }))
          }
        />
        <datalist id="sub-categories">
          {uniqueSubCategories.map((sub, idx) => (
            <option key={idx} value={sub} />
          ))}
        </datalist>

        {/* نوع الملكية */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">نوع الملكية</label>
          <select
            className="border rounded-md p-2 bg-background"
            value={newProduct.ownershipType ?? "ours"}
            onChange={(e) =>
              setNewProduct((prev: any) => ({
                ...prev,
                ownershipType: e.target.value,
              }))
            }
          >
            {ownershipOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            اختر ما إذا كان المنتج على اسمنا أو يتم شراؤه محليًا.
          </p>
        </div>

        {/* ✅ الأولوية */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">أولوية الظهور</label>
          <select
            className="border rounded-md p-2 bg-background"
            value={newProduct.priority ?? "C"}
            onChange={(e) =>
              setNewProduct((prev: any) => ({
                ...prev,
                priority: e.target.value,
              }))
            }
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            ترتيب العرض في القوائم: A أعلى، ثم B، ثم C.
          </p>
        </div>

        <Textarea
          placeholder="وصف المنتج"
          value={newProduct.description ?? ""}
          onChange={(e) =>
            setNewProduct((prev: any) => ({
              ...prev,
              description: e.target.value,
            }))
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
