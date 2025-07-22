import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // شادCN Input
import ProductCard from "@/components/ProductCard";
import { useLocation } from "react-router-dom";

import axios from "axios";

const Products: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const location = useLocation();

  useEffect(() => {
    axios
      .get("http://localhost:3001/api/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("❌ Failed to fetch products", err));
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    if (category) {
      setSelectedCategory(category);
    }
  }, [location.search]);

  // استخرج كل الفئات بدون تكرار
  const categories = [
    "الكل",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  // فلترة حسب الفئة + الاسم + السعر
  const filteredProducts = products.filter((product) => {
    const byCategory =
      selectedCategory === "الكل" || product.category === selectedCategory;
    const byName =
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const byPrice = maxPrice === "" || product.price <= parseFloat(maxPrice);

    return byCategory && byName && byPrice;
  });

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-right">جميع المنتجات</h1>

        {/* الفلاتر */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* أزرار الفئات */}
          <div className="flex flex-wrap gap-2 justify-end">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* البحث والسعر */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              type="text"
              placeholder="ابحث باسم المنتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Input
              type="number"
              placeholder="سعر أقصى"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        {/* المنتجات أو لا يوجد نتائج */}
        {filteredProducts.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">
            لا يوجد منتجات مطابقة للبحث
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-start">
            {filteredProducts.map((product) => (
              <ProductCard product={product} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default Products;
