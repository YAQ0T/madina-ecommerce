import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { user, loading, token } = useAuth();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    mainCategory: "",
    subCategory: "",
    description: "",
    image: "",
  });
  const [productFilter, setProductFilter] = useState("all");

  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const filteredOrders = orders.filter((order) =>
    filter === "all" ? true : order.status === filter
  );
  const [productsState, setProductsState] = useState<any[]>([]);
  const categoryMap = productsState.reduce((acc, product) => {
    if (!acc[product.mainCategory]) {
      acc[product.mainCategory] = new Set();
    }
    acc[product.mainCategory].add(product.subCategory);
    return acc;
  }, {} as Record<string, Set<string>>);
  const [selectedMainCategory, setSelectedMainCategory] =
    useState<string>("all");

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate("/");
    } else {
      setCheckingAuth(false);
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!token) return;
    axios
      .get("http://localhost:3001/api/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setProductsState(res.data))
      .catch((err) => console.error("❌ Failed to fetch products", err));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    axios
      .get("http://localhost:3001/api/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setOrders(res.data))
      .catch((err) => console.error("Order Fetch Error:", err));
  }, [token]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await axios.put(
        `http://localhost:3001/api/orders/${orderId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          جارٍ التحقق من الصلاحيات...
        </p>
      </div>
    );
  }

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
              <div className="flex gap-2">
                {/* Filter Dropdown */}
                {/* Filter Dropdown */}
                {/* 🔽 تصفية حسب التصنيف الفرعي (يظهر فقط عند اختيار تصنيف رئيسي) */}
                {selectedMainCategory !== "all" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">🧮 تصفية فرعية</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {Array.from(categoryMap[selectedMainCategory] || []).map(
                        (sub) => (
                          <DropdownMenuItem
                            key={String(sub)}
                            onClick={() => setProductFilter(sub as string)}
                          >
                            {String(sub)}
                          </DropdownMenuItem>
                        )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* 🔽 تصفية حسب التصنيف الرئيسي */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">🧮 تصفية رئيسية</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedMainCategory("all");
                        setProductFilter("all");
                      }}
                    >
                      الكل
                    </DropdownMenuItem>

                    {Object.keys(categoryMap).map((main) => (
                      <DropdownMenuItem
                        key={main}
                        onClick={() => {
                          setSelectedMainCategory(main);
                          setProductFilter(main);
                        }}
                      >
                        {main}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

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
                          setNewProduct({
                            ...newProduct,
                            price: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="التصنيف الرئيسي"
                        value={newProduct.mainCategory}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            mainCategory: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="التصنيف الفرعي"
                        value={newProduct.subCategory}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            subCategory: e.target.value,
                          })
                        }
                      />

                      <Input
                        placeholder="رابط الصورة"
                        value={newProduct.image}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            image: e.target.value,
                          })
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
                              },
                              {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );

                            // إضافة المنتج الجديد للـ state
                            setProductsState([...productsState, res.data]);

                            // تصفير النموذج
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
                        }}
                      >
                        حفظ المنتج
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog
                  open={isEditModalOpen}
                  onOpenChange={setIsEditModalOpen}
                >
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
                                  },
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
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
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2">#</th>
                    <th className="border px-4 py-2">الاسم</th>
                    <th className="border px-4 py-2">السعر</th>
                    <th className="border px-4 py-2">التصنيف الرئيسي</th>
                    <th className="border px-4 py-2">التصنيف الفرعي</th>
                    <th className="border px-4 py-2">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {productsState
                    .filter((product) => {
                      if (productFilter === "all") return true;
                      return (
                        product.mainCategory === productFilter ||
                        product.subCategory === productFilter
                      );
                    })
                    .map((product, idx) => (
                      <tr key={product._id}>
                        <td className="border px-4 py-2">{idx + 1}</td>
                        <td className="border px-4 py-2">{product.name}</td>
                        <td className="border px-4 py-2">₪{product.price}</td>
                        <td className="border px-4 py-2">
                          {product.mainCategory}
                        </td>
                        <td className="border px-4 py-2">
                          {product.subCategory}
                        </td>
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
                                    `http://localhost:3001/api/products/${product._id}`,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    }
                                  );
                                  setProductsState((prev) =>
                                    prev.filter((p) => p._id !== product._id)
                                  );
                                } catch (err) {
                                  console.error(
                                    "❌ Error deleting product",
                                    err
                                  );
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
                      <th className="border px-4 py-2">تاريخ الطلب</th>
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
                        <td className="border px-4 py-2 space-x-4 space-x-reverse space-y-2 ">
                          <Button
                            size="sm"
                            onClick={() => updateStatus(order._id, "pending")}
                            variant="outline"
                          >
                            ⏳ قيد الانتظار
                          </Button>
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
                        <td className="border px-4 py-2">
                          {new Date(order.createdAt).toLocaleDateString(
                            "ar-EG"
                          )}
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
                    <p>
                      <strong>تاريخ الطلب:</strong>{" "}
                      {new Date(selectedOrder.createdAt).toLocaleString(
                        "ar-EG"
                      )}
                    </p>

                    <div>
                      <strong>المنتجات:</strong>
                      <ul className="list-disc pr-5">
                        {selectedOrder.items.map((item: any, i: number) => (
                          <li key={i}>
                            {item.productId
                              ? `${item.productId.name} × ${item.quantity}`
                              : `منتج محذوف × ${item.quantity}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        const confirmDelete = confirm(
                          "هل أنت متأكد من حذف هذا الطلب نهائيًا؟"
                        );
                        if (confirmDelete) {
                          try {
                            await axios.delete(
                              `http://localhost:3001/api/orders/${selectedOrder._id}`,
                              {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );
                            setOrders((prev) =>
                              prev.filter((o) => o._id !== selectedOrder._id)
                            );
                            setSelectedOrder(null);
                          } catch (err) {
                            console.error("❌ Error deleting order", err);
                            alert("فشل في حذف الطلب");
                          }
                        }
                      }}
                    >
                      🗑️ حذف نهائي
                    </Button>
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
