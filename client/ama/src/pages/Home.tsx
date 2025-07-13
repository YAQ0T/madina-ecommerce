import React from "react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { products } from "@/data/products";

// استيراد الصور بطريقة صحيحة
import iroko from "@/assets/iroko.jpg";
import fabric from "@/assets/fabric.png";
import sponge from "@/assets/sponge.webp";

const Home: React.FC = () => {
  const featuredProducts = [
    {
      id: 101,
      title: "لوح خشب عالي الجودة",
      description: "لوح خشب متين مناسب للأعمال الاحترافية.",
      price: 150,
      image: iroko,
    },
    {
      id: 102,
      title: "قماش تنجيد فاخر",
      description: "قماش مقاوم للتآكل بألوان متعددة.",
      price: 90,
      image: fabric,
    },
    {
      id: 103,
      title: "إسفنج تنجيد 10 سم",
      description: "إسفنج عالي الكثافة لصناعة الكنب.",
      price: 60,
      image: sponge,
    },
  ];

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
          <Button className="text-base">ابدأ التسوق الآن</Button>
        </div>
        {/* الفئات الرئيسية */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-right">
            الفئات الرئيسية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 text-right hover:shadow">
              <h3 className="text-xl font-semibold mb-2">مواد النجارة</h3>
              <p className="text-gray-600">
                تشكيلة متنوعة من المواد عالية الجودة.
              </p>
            </div>
            <div className="border rounded-lg p-4 text-right hover:shadow">
              <h3 className="text-xl font-semibold mb-2">أقمشة التنجيد</h3>
              <p className="text-gray-600">
                أفضل الأقمشة لتنجيد الكنب والكراسي.
              </p>
            </div>
            <div className="border rounded-lg p-4 text-right hover:shadow">
              <h3 className="text-xl font-semibold mb-2">
                مستلزمات صناعة الكنب
              </h3>
              <p className="text-gray-600">
                كل ما تحتاجه لصناعة الكنب بجودة عالية.
              </p>
            </div>
          </div>
        </section>

        {/* منتجات مختارة */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4 text-right">
            منتجات مختارة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.slice(0, 3).map((product) => (
              <ProductCard
                key={product.id}
                image={product.image}
                title={product.name}
                description={product.description}
                price={product.price}
              />
            ))}
          </div>
        </section>

        {/* بعض المنتجات المتوفرة */}
        <section className="mb-12 mt-12">
          <h2 className="text-2xl font-semibold mb-4 text-right">
            بعض المنتجات المتوفرة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {featuredProducts.map((item) => (
              <ProductCard
                key={item.id}
                image={item.image}
                title={item.title}
                description={item.description}
                price={item.price}
              />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Home;
