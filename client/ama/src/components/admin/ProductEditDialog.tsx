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
import { useTranslation } from "@/i18n";

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
  const { t } = useTranslation();
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

  // خيارات نوع الملكية
  const ownershipOptions = ["ours", "local"] as const;

  if (!editingProduct) return null;

  const handleSave = async () => {
    try {
      const ownershipType = ["ours", "local"].includes(
        String(editingProduct.ownershipType)
      )
        ? String(editingProduct.ownershipType)
        : "ours";

      const payload = {
        name: editingProduct.name?.trim(),
        mainCategory: editingProduct.mainCategory?.trim(),
        subCategory: editingProduct.subCategory?.trim(),
        description: editingProduct.description?.trim(),
        images: Array.isArray(editingProduct.images)
          ? editingProduct.images
          : [],
        ownershipType, // 👈 إرسال نوع الملكية
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
      alert(t("admin.productEdit.alerts.updateFailed"));
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
        <DialogTitle>{t("admin.productEdit.title")}</DialogTitle>
        <DialogDescription>
          {t("admin.productEdit.subtitle")}
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[70vh] overflow-y-auto grid gap-4 py-4 text-right">
        <Input
          placeholder={t("admin.productEdit.placeholders.name")}
          value={editingProduct.name ?? ""}
          onChange={(e) =>
            setEditingProduct({ ...editingProduct, name: e.target.value })
          }
        />

        <Input
          list="main-categories-edit"
          placeholder={t("admin.productEdit.placeholders.mainCategory")}
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
          placeholder={t("admin.productEdit.placeholders.subCategory")}
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

        {/* نوع الملكية */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            {t("admin.productEdit.labels.ownership")}
          </label>
          <select
            className="border rounded-md p-2 bg-background"
            value={editingProduct.ownershipType ?? "ours"}
            onChange={(e) =>
              setEditingProduct({
                ...editingProduct,
                ownershipType: e.target.value,
              })
            }
          >
            {ownershipOptions.map((opt) => (
              <option key={opt} value={opt}>
                {t(`admin.common.ownership.${opt}` as const)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {t("admin.productEdit.helpers.ownership")}
          </p>
        </div>

        <Textarea
          placeholder={t("admin.productEdit.placeholders.description")}
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
              placeholder={t("admin.productEdit.placeholders.image")}
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
            />
            <Button type="button" onClick={handleAddImage}>
              {t("admin.productEdit.actions.addImage")}
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
                  {t("common.actions.delete")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleSave}>{t("admin.productEdit.actions.save")}</Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default ProductEditDialog;
