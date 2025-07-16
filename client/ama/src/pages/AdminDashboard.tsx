import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { products } from "@/data/products";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const AdminDashboard: React.FC = () => {
  const [productsState, setProductsState] = useState(products);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    image: "",
  });
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [orders, setOrders] = useState([
  {
    id: 1,
    customer: "أحمد سلامة",
    phone: "0599XXXXXX",
    status: "قيد التنفيذ",
    total: 240,
    items: [
      { name: "لوح خشب", quantity: 2, price: 60 },
      { name: "إسفنجة", quantity: 2, price: 60 },
    ],
  },  {
    id: 2,
    customer: "أحمد سلامة",
    phone: "0599XXXXXX",
    status: "قيد التنفيذ",
    total: 240,
    items: [
      { name: "لوح خشب", quantity: 2, price: 60 },
      { name: "إسفنجة", quantity: 2, price: 60 },
    ],
  },
]);

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 text-right">
        <h1 className="text-3xl font-bold mb-6">لوحة تحكم الأدمن</h1>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="flex justify-end mb-6">
            <TabsTrigger value="products">المنتجات</TabsTrigger>
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
          </TabsList>

          {/* ✅ تبويب المنتجات */}
          <TabsContent value="products">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">جميع المنتجات</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>➕ إضافة منتج</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة منتج جديد</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4 py-4 text-right">
                    <Input
                      placeholder="اسم المنتج"
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, name: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="السعر"
                      value={newProduct.price}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, price: e.target.value })
                      }
                    />
                    <Input
                      placeholder="الفئة"
                      value={newProduct.category}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          category: e.target.value,
                        })
                      }
                    />
                    <Textarea
                      placeholder="وصف المنتج"
                      value={newProduct.description}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          description: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="رابط الصورة"
                      value={newProduct.image}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, image: e.target.value })
                      }
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={() => {
                        const id = Math.floor(Math.random() * 100000);
                        setProductsState([
                          ...productsState,
                          {
                            id,
                            ...newProduct,
                            price: parseFloat(newProduct.price),
                          },
                        ]);
                        setNewProduct({
                          name: "",
                          price: "",
                          category: "",
                          description: "",
                          image: "",
                        });
                      }}
                    >
                      حفظ المنتج
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تعديل منتج</DialogTitle>
                  </DialogHeader>
                  {editingProduct && (
                    <>
                      <div className="grid gap-4 py-4 text-right">
                        <Input
                          placeholder="اسم المنتج"
                          value={editingProduct.name}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              name: e.target.value,
                            })
                          }
                        />
                        <Input
                          type="number"
                          placeholder="السعر"
                          value={editingProduct.price}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              price: e.target.value,
                            })
                          }
                        />
                        <Input
                          placeholder="الفئة"
                          value={editingProduct.category}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              category: e.target.value,
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
                          placeholder="رابط الصورة"
                          value={editingProduct.image}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              image: e.target.value,
                            })
                          }
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            setProductsState((prev) =>
                              prev.map((p) =>
                                p.id === editingProduct.id
                                  ? {
                                      ...editingProduct,
                                      price: parseFloat(editingProduct.price),
                                    }
                                  : p
                              )
                            );
                            setIsEditModalOpen(false);
                            setEditingProduct(null);
                          }}
                        >
                          حفظ التعديلات
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              {/* ممكن نربطه بـ Modal أو صفحة تانية */}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2">#</th>
                    <th className="border px-4 py-2">الاسم</th>
                    <th className="border px-4 py-2">السعر</th>
                    <th className="border px-4 py-2">الفئة</th>
                    <th className="border px-4 py-2">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {productsState.map((product, idx) => (
                    <tr key={product.id}>
                      <td className="border px-4 py-2">{idx + 1}</td>
                      <td className="border px-4 py-2">{product.name}</td>
                      <td className="border px-4 py-2">₪{product.price}</td>
                      <td className="border px-4 py-2">{product.category}</td>
                      <td className="border px-4 py-2 space-x-2 space-x-reverse">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsEditModalOpen(true);
                          }}
                        >
                          ✏️ تعديل
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const confirmDelete = confirm(
                              `هل أنت متأكد من حذف "${product.name}"؟`
                            );
                            if (confirmDelete) {
                              setProductsState(
                                productsState.filter((p) => p.id !== product.id)
                              );
                            }
                          }}
                        >
                          🗑️ حذف
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ✅ تبويب الطلبات */}
<TabsContent value="orders">
  <h2 className="text-xl font-semibold mb-4">الطلبات</h2>

  {orders.length === 0 ? (
    <p className="text-gray-600">لا توجد طلبات حالياً.</p>
  ) : (
    <div className="space-y-6">
      {orders.map((order) => (
        <div key={order.id} className="border rounded-lg p-4 text-right shadow-sm">
          <h3 className="font-bold mb-2">طلب رقم #{order.id}</h3>
          <p>العميل: {order.customer}</p>
          <p>رقم الهاتف: {order.phone}</p>
          <p>الحالة: {order.status}</p>
          <p className="font-semibold mt-2">المنتجات:</p>
          <ul className="list-disc pr-5 text-sm text-gray-700">
            {order.items.map((item, idx) => (
              <li key={idx}>
                {item.name} × {item.quantity} — ₪{item.price * item.quantity}
              </li>
            ))}
          </ul>
          <p className="font-bold mt-2">المجموع: ₪{order.total}</p>
        </div>
      ))}
    </div>
  )}
</TabsContent>
        </Tabs>
      </main>
      <Footer />
    </>
  );
};

export default AdminDashboard;
