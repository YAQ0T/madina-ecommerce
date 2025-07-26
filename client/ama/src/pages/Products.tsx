import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import CategorySidebar from "@/components/CategorySidebar";
import { useLocation } from "react-router-dom";
import axios from "axios";

const Products: React.FC = () => {
  const [selectedMainCategory, setSelectedMainCategory] = useState("الكل");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
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
      setSelectedMainCategory(category);
    }
  }, [location.search]);

  const handleCategorySelect = (main: string, sub: string = "") => {
    setSelectedMainCategory(main);
    setSelectedSubCategory(sub);
  };

  const categoryGroups = products.reduce((acc, product) => {
    const { mainCategory, subCategory } = product;
    if (!mainCategory) return acc;

    const existing = acc.find((cat) => cat.mainCategory === mainCategory);
    if (existing) {
      if (subCategory && !existing.subCategories.includes(subCategory)) {
        existing.subCategories.push(subCategory);
      }
    } else {
      acc.push({
        mainCategory,
        subCategories: subCategory ? [subCategory] : [],
      });
    }

    return acc;
  }, [] as { mainCategory: string; subCategories: string[] }[]);

  const filteredProducts = products.filter((product) => {
    const byMain =
      selectedMainCategory === "الكل" ||
      product.mainCategory === selectedMainCategory;
    const bySub =
      selectedSubCategory === "" || product.subCategory === selectedSubCategory;
    const byName =
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const byPrice = maxPrice === "" || product.price <= parseFloat(maxPrice);

    return byMain && bySub && byName && byPrice;
  });

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-right">جميع المنتجات</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-1/4">
            <CategorySidebar
              categories={categoryGroups}
              onFilter={handleCategorySelect}
              selectedMain={selectedMainCategory}
              selectedSub={selectedSubCategory}
            />
          </aside>

          <section className="flex-1">
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
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

            {filteredProducts.length === 0 ? (
              <p className="text-center text-gray-600 text-lg">
                لا يوجد منتجات مطابقة للبحث
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-start">
                {filteredProducts
                  .filter((product) => product.quantity > 0)
                  .map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Products;
