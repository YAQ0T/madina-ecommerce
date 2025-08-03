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
import React, { useState } from "react";

interface ProductFormProps {
  newProduct: any;
  setNewProduct: (data: any) => void;
  productsState: any[];
  setProductsState: (data: any[]) => void;
  token: string;
}

const ProductForm: React.FC<ProductFormProps> = ({
  newProduct,
  setNewProduct,
  productsState,
  setProductsState,
  token,
}) => {
  const [newImage, setNewImage] = useState("");

  const handleAddImage = () => {
    if (newImage.trim()) {
      setNewProduct({
        ...newProduct,
        images: [...(newProduct.images || []), newImage],
      });
      setNewImage("");
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = [...newProduct.images];
    updatedImages.splice(index, 1);
    setNewProduct({ ...newProduct, images: updatedImages });
  };

  const handleSubmit = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/products`,
        {
          ...newProduct,
          price: parseFloat(newProduct.price),
          quantity: parseInt(newProduct.quantity), // ✅ لازم تكون بهذا الشكل
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProductsState([...productsState, res.data]);

      // ✅ إعادة تعيين الحقول بعد الحفظ
      setNewProduct({
        name: "",
        price: "",
        mainCategory: "",
        subCategory: "",
        description: "",
        images: [],
        quantity: "", // تأكد أنها reset
      });
    } catch (err) {
      console.error("❌ Error adding product", err);
      alert("فشل في إضافة المنتج");
    }
  };

  const mainCategories = [
    ...new Set(productsState.map((p) => p.mainCategory)),
  ].filter(Boolean);

  const subCategoriesForSelectedMain = productsState
    .filter((p) => p.mainCategory === newProduct.mainCategory)
    .map((p) => p.subCategory)
    .filter(Boolean);

  const uniqueSubCategories = [...new Set(subCategoriesForSelectedMain)];

  return (
    <>
      <DialogHeader>
        <DialogTitle>إضافة منتج جديد</DialogTitle>
        <DialogDescription>
          قم بملء الحقول التالية لإضافة منتج إلى المتجر
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4 text-right">
        <Input
          placeholder="اسم المنتج"
          value={newProduct.name ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, name: e.target.value })
          }
        />
        <Input
          type="number"
          placeholder="السعر"
          value={newProduct.price ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, price: e.target.value })
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
        <Input
          type="number"
          placeholder="الكمية المتوفرة"
          value={newProduct.quantity ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, quantity: e.target.value })
          }
        />

        {/* ✅ إدخال صور متعددة */}
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
          <ul className="text-sm text-gray-700 space-y-1">
            {(newProduct.images || []).map((img: string, idx: number) => (
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
        <Button onClick={handleSubmit}>حفظ المنتج</Button>
      </DialogFooter>
    </>
  );
};

export default ProductForm;
