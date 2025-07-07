import React from "react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const Home: React.FC = () => {
  return (
    <>
      <Navbar />

      <main className="container mx-auto p-6">
        {/* العنوان الرئيسي */}
        <h1 className="text-4xl font-bold mb-4 text-right">
          مرحبًا بكم في متجر المدينة المنورة
        </h1>

        {/* وصف تمهيدي */}
        <p className="text-lg mb-6 text-right text-gray-700">
          هنا تجد أفضل مستلزمات النجارة وأقمشة التنجيد وخامات صناعة الكنب.
        </p>

        {/* زر CTA */}
        <div className="flex justify-end mb-10">
          <Button className="text-base">ابدأ التسوق الآن</Button>
        </div>

        {/* قسم الفئات */}
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

        {/* قسم أمثلة بضائع */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-right">
            بعض المنتجات المتوفرة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* منتج 1 */}
            <ProductCard
              image="src\assets\iroko.jpg"
              title="لوح خشب عالي الجودة"
              description="لوح خشب متين مناسب للأعمال الاحترافية."
              price={150}
            />
            {/* منتج 2 */}

            <ProductCard
              image="src\assets\fabric.png"
              title="قماش تنجيد فاخر"
              description="قماش مقاوم للتآكل بألوان متعددة."
              price={90}
            />
            {/* منتج 3 */}

            <ProductCard
              image="src\assets\sponge.webp"
              title="قماش تنجيد فاخر"
              description="قماش مقاوم للتآكل بألوان متعددة."
              price={60}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Home;
