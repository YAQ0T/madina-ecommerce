import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import axios from "axios";
const AdminDashboard: React.FC = () => {
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    image: "",
  });
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const filteredOrders = orders.filter((order) =>
    filter === "all" ? true : order.status === filter
  );
  const [productsState, setProductsState] = useState<any[]>([]);

  useEffect(() => {
    axios
      .get("http://localhost:3001/api/products")
      .then((res) => setProductsState(res.data))
      .catch((err) => console.error("❌ Failed to fetch products", err));
  }, []);

  useEffect(() => {
    axios
      .get("http://localhost:3001/api/orders")
      .then((res) => setOrders(res.data))
      .catch((err) => console.error("Order Fetch Error:", err));
  }, []);
  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await axios.put(`http://localhost:3001/api/orders/${orderId}`, {
        status: newStatus,
      });
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

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
                      onClick={async () => {
                        try {
                          const res = await axios.post(
                            "http://localhost:3001/api/products",
                            {
                              ...newProduct,
                              price: parseFloat(newProduct.price),
                            }
                          );

                          // إضافة المنتج الجديد للـ state
                          setProductsState([...productsState, res.data]);

                          // تصفير النموذج
                          setNewProduct({
                            name: "",
                            price: "",
                            category: "",
                            description: "",
                            image: "",
                          });
                        } catch (err) {
                          console.error("❌ Error adding product", err);
                          alert("فشل في إضافة المنتج");
                        }
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
                          onClick={async () => {
                            try {
                              const res = await axios.put(
                                `http://localhost:3001/api/products/${editingProduct._id}`,
                                {
                                  ...editingProduct,
                                  price: parseFloat(editingProduct.price),
                                }
                              );

                              // تحديث الـ state بالمنتج الجديد
                              setProductsState((prev) =>
                                prev.map((p) =>
                                  p._id === res.data._id ? res.data : p
                                )
                              );

                              // إغلاق المودال
                              setIsEditModalOpen(false);
                              setEditingProduct(null);
                            } catch (err) {
                              console.error("❌ Error editing product", err);
                              alert("فشل في تعديل المنتج");
                            }
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
                          onClick={async () => {
                            const confirmDelete = confirm(
                              `هل أنت متأكد من حذف "${product.name}"؟`
                            );
                            if (confirmDelete) {
                              try {
                                await axios.delete(
                                  `http://localhost:3001/api/products/${product._id}`
                                );
                                setProductsState((prev) =>
                                  prev.filter((p) => p._id !== product._id)
                                );
                              } catch (err) {
                                console.error("❌ Error deleting product", err);
                                alert("فشل في حذف المنتج");
                              }
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
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                الكل
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                onClick={() => setFilter("pending")}
              >
                قيد الانتظار
              </Button>
              <Button
                variant={filter === "delivered" ? "default" : "outline"}
                onClick={() => setFilter("delivered")}
              >
                تم التوصيل
              </Button>
              <Button
                variant={filter === "cancelled" ? "default" : "outline"}
                onClick={() => setFilter("cancelled")}
              >
                ملغى
              </Button>
            </div>

            {orders.length === 0 ? (
              <p className="text-gray-600">لا توجد طلبات حالياً.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-4 py-2">#</th>
                      <th className="border px-4 py-2">الاسم</th>
                      <th className="border px-4 py-2">الهاتف</th>
                      <th className="border px-4 py-2">العنوان</th>
                      <th className="border px-4 py-2">الإجمالي</th>
                      <th className="border px-4 py-2">الحالة</th>
                      <th className="border px-4 py-2">عدد المنتجات</th>
                      <th className="border px-4 py-2">تحديث الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, idx) => (
                      <tr key={order._id}>
                        <td className="border px-4 py-2">
                          <Button
                            variant="link"
                            onClick={() => setSelectedOrder(order)}
                            className="text-blue-600 underline p-0"
                          >
                            {idx + 1}
                          </Button>
                        </td>
                        <td className="border px-4 py-2">{order.user.name}</td>
                        <td className="border px-4 py-2">{order.user.phone}</td>
                        <td className="border px-4 py-2">{order.address}</td>
                        <td className="border px-4 py-2">₪{order.total}</td>
                        <td className="border px-4 py-2">{order.status}</td>
                        <td className="border px-4 py-2">
                          {order.items.length}
                        </td>
                        <td className="border px-4 py-2 space-x-2 space-x-reverse">
                          <Button
                            size="sm"
                            onClick={() => updateStatus(order._id, "delivered")}
                            variant="outline"
                          >
                            ✅ تم التوصيل
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(order._id, "cancelled")}
                            variant="destructive"
                          >
                            ❌ إلغاء
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedOrder && (
              <Dialog
                open={!!selectedOrder}
                onOpenChange={() => setSelectedOrder(null)}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تفاصيل الطلب</DialogTitle>
                  </DialogHeader>

                  <div className="text-right space-y-2">
                    <p>
                      <strong>الاسم:</strong> {selectedOrder.user.name}
                    </p>
                    <p>
                      <strong>الهاتف:</strong> {selectedOrder.user.phone}
                    </p>
                    <p>
                      <strong>العنوان:</strong> {selectedOrder.address}
                    </p>
                    <p>
                      <strong>الإجمالي:</strong> ₪{selectedOrder.total}
                    </p>
                    <p>
                      <strong>الحالة:</strong> {selectedOrder.status}
                    </p>

                    <div>
                      <strong>المنتجات:</strong>
                      <ul className="list-disc pr-5">
                        {selectedOrder.items.map((item: any, i: number) => (
                          <li key={i}>
                            {console.log(item)}
                            {item.productId.name} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => setSelectedOrder(null)}>
                      إغلاق
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </>
  );
};

export default AdminDashboard;
