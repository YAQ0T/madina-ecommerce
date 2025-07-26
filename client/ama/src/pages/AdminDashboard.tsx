import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";
import UserTable from "@/components/admin/UserTable";

// ✅ مكونات الأدمن المفصولة
import ProductForm from "@/components/admin/ProductForm";
import ProductEditDialog from "@/components/admin/ProductEditDialog";
import ProductTable from "@/components/admin/ProductTable";
import CategoryFilterMenus from "@/components/admin/CategoryFilterMenus";
import OrderTable from "@/components/admin/OrderTable";
import OrderDetailsDialog from "@/components/admin/OrderDetailsDialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const AdminDashboard: React.FC = () => {
  const { user, loading, token } = useAuth();
  const navigate = useNavigate();

  const [checkingAuth, setCheckingAuth] = useState(true);

  // المنتجات
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    mainCategory: "",
    subCategory: "",
    description: "",
    image: "",
    countity: "",
  });
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productsState, setProductsState] = useState<any[]>([]);
  const [productFilter, setProductFilter] = useState("all");
  const [selectedMainCategory, setSelectedMainCategory] =
    useState<string>("all");
  const [users, setUsers] = useState<any[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  // الطلبات
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // تجميع التصنيفات
  const categoryMap = productsState.reduce((acc, product) => {
    if (!acc[product.mainCategory]) {
      acc[product.mainCategory] = new Set();
    }
    acc[product.mainCategory].add(product.subCategory);
    return acc;
  }, {} as Record<string, Set<string>>);
  const filteredUsers = users.filter((u) =>
    userRoleFilter === "all" ? true : u.role === userRoleFilter
  );
  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmDelete = confirm(
      `هل أنت متأكد من حذف المستخدم "${userName}"؟`
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:3001/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      console.error("❌ Error deleting user", err);
      alert("فشل في حذف المستخدم");
    }
  };

  useEffect(() => {
    if (!token) return;
    axios
      .get("http://localhost:3001/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("❌ Failed to fetch users", err));
  }, [token]);

  // تحقق من صلاحيات الأدمن
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate("/");
    } else {
      setCheckingAuth(false);
    }
  }, [user, loading, navigate]);

  // جلب المنتجات
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

  // جلب الطلبات
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
            <TabsTrigger value="users">المستخدمين</TabsTrigger>
          </TabsList>

          {/* ✅ تبويب المنتجات */}
          <TabsContent value="products">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">جميع المنتجات</h2>
              <div className="flex gap-2">
                <CategoryFilterMenus
                  selectedMainCategory={selectedMainCategory}
                  setSelectedMainCategory={setSelectedMainCategory}
                  productFilter={productFilter}
                  setProductFilter={setProductFilter}
                  categoryMap={categoryMap}
                />

                <Dialog>
                  <DialogTrigger asChild>
                    <Button>➕ إضافة منتج</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <ProductForm
                      newProduct={newProduct}
                      setNewProduct={setNewProduct}
                      productsState={productsState}
                      setProductsState={setProductsState}
                      token={token}
                    />
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isEditModalOpen}
                  onOpenChange={setIsEditModalOpen}
                >
                  <ProductEditDialog
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    editingProduct={editingProduct}
                    setEditingProduct={setEditingProduct}
                    setProductsState={setProductsState}
                    token={token}
                  />
                </Dialog>
              </div>
            </div>

            <ProductTable
              productsState={productsState}
              setProductsState={setProductsState}
              productFilter={productFilter}
              token={token}
              onEdit={(product) => {
                setEditingProduct(product);
                setIsEditModalOpen(true);
              }}
            />
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
                variant={filter === "on_the_way" ? "default" : "outline"}
                onClick={() => setFilter("on_the_way")}
              >
                🚚 في الطريق
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

            <OrderTable
              orders={orders}
              filter={filter}
              updateStatus={updateStatus}
              setSelectedOrder={setSelectedOrder}
            />

            <OrderDetailsDialog
              selectedOrder={selectedOrder}
              setSelectedOrder={setSelectedOrder}
              setOrders={setOrders}
              token={token}
            />
          </TabsContent>

          <TabsContent value="users">
            <h2 className="text-xl font-semibold mb-4">جميع المستخدمين</h2>
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant={userRoleFilter === "all" ? "default" : "outline"}
                onClick={() => setUserRoleFilter("all")}
              >
                الكل
              </Button>
              <Button
                variant={userRoleFilter === "admin" ? "default" : "outline"}
                onClick={() => setUserRoleFilter("admin")}
              >
                أدمن
              </Button>
              <Button
                variant={userRoleFilter === "user" ? "default" : "outline"}
                onClick={() => setUserRoleFilter("user")}
              >
                مستخدم
              </Button>
            </div>

            <UserTable
              users={filteredUsers}
              onDelete={handleDeleteUser}
              currentAdminId={user?._id}
            />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </>
  );
};

export default AdminDashboard;
