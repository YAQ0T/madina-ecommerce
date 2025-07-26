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
import React from "react";

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
  const handleSubmit = async () => {
    try {
      const res = await axios.post(
        "http://localhost:3001/api/products",
        {
          ...newProduct,
          price: parseFloat(newProduct.price),
          countity: parseInt(newProduct.countity),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProductsState([...productsState, res.data]);
      setNewProduct({
        name: "",
        price: "",
        mainCategory: "",
        subCategory: "",
        description: "",
        image: "",
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
          placeholder="التصنيف الرئيسي"
          value={newProduct.mainCategory ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, mainCategory: e.target.value })
          }
        />
        <Input
          placeholder="التصنيف الفرعي"
          value={newProduct.subCategory ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, subCategory: e.target.value })
          }
        />
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
          value={newProduct.countity ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, countity: e.target.value })
          }
        />
        <Input
          placeholder="رابط الصورة"
          value={newProduct.image ?? ""}
          onChange={(e) =>
            setNewProduct({ ...newProduct, image: e.target.value })
          }
        />
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit}>حفظ المنتج</Button>
      </DialogFooter>
    </>
  );
};

export default ProductForm;
