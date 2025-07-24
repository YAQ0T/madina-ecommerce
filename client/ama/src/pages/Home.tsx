import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import axios from "axios";

const Home: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:3001/api/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("❌ Failed to fetch products", err));
  }, []);

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-4 text-right">
          مرحبًا بكم في متجر المدينة المنورة
        </h1>
        <p className="text-lg mb-6 text-right text-gray-700">
          هنا تجد أفضل مستلزمات النجارة وأقمشة التنجيد وخامات صناعة الكنب.
        </p>
        <div className="flex justify-end mb-10">
          <Button className="text-base" onClick={() => navigate(`/products`)}>
            ابدأ التسوق الآن
          </Button>
        </div>

        {/* منتجات مختارة */}
        {/* عرض مرئي لأهم الفئات */}
        {/* عرض مرئي جميل لما نقدمه */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-right">ماذا نقدم؟</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* صورة: مواد النجارة */}
            <div
              onClick={() => navigate("/products?category=wood")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/uazWZhd.jpeg"
                  alt="مواد النجارة"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right">
                <h3 className="text-lg font-bold mb-1">مواد النجارة</h3>
                <p className="text-gray-600 text-sm">
                  خشب، مسامير، وأدوات بناء الكنب.
                </p>
              </div>
            </div>

            {/* صورة: أقمشة التنجيد */}
            <div
              onClick={() => navigate("/products?category=fabric")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/CCEly6H.jpeg"
                  alt="أقمشة التنجيد"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right">
                <h3 className="text-lg font-bold mb-1">أقمشة التنجيد</h3>
                <p className="text-gray-600 text-sm">
                  تشكيلات متنوعة وفاخرة لتنجيد الكنب والكراسي.
                </p>
              </div>
            </div>

            {/* صورة: مستلزمات الكنب */}
            <div
              onClick={() => navigate("/products?category=sofa")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/bf8geWx.jpeg"
                  alt="مستلزمات الكنب"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right">
                <h3 className="text-lg font-bold mb-1">مستلزمات صناعة الكنب</h3>
                <p className="text-gray-600 text-sm">
                  إسفنج، أربطة، وإكسسوارات تصنيع الكنب.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Home;
