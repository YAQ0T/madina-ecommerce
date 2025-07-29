import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 ">
        <h1 className="text-4xl font-bold mb-4 text-right ">
          مرحبًا بكم في متجر ديكوري
        </h1>
        <p className="text-lg mb-6 text-right text-gray-700 dark:text-gray-200">
          هنا تجد أفضل مستلزمات النجارة وأقمشة التنجيد وخامات صناعة الكنب.
        </p>
        <div className="flex justify-end mb-10 ">
          <Button className="text-base" onClick={() => navigate(`/products`)}>
            ابدأ التسوق الآن
          </Button>
        </div>
        {/* مستلزمات نجارين
جوارير / سحابات ومفصلات
مستلزمات منجدين
مقابض ابواب
مقابض خزائن المطبخ
اكسسورات مطابخ 
اكسسورات غرف نوم
اقمشة كنب */}
        {/* عرض مرئي جميل لما نقدمه */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-right">ماذا نقدم؟</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div
              onClick={() => navigate("/products?category=wood")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/BEfwYpQ.png"
                  alt="مستلزمات نجارين"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right dark:bg-gray-300">
                <h3 className="text-lg font-bold mb-1 dark:text-black">
                  مستلزمات نجارين
                </h3>
                <p className="text-gray-600 text-sm">
                  كل ما يحتاجه النجار من أدوات وخامات لتجهيز الأثاث والأبواب
                  والخزائن بجودة عالية.
                </p>
              </div>
            </div>
            <div
              onClick={() => navigate("/products?category=fabric")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/bf8geWx.jpeg"
                  alt="جوارير / سحابات ومفصلات"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right dark:bg-gray-300">
                <h3 className="text-lg font-bold mb-1 dark:text-black">
                  جوارير / سحابات ومفصلات
                </h3>
                <p className="text-gray-600 text-sm">
                  مجموعة متنوعة من السحابات والمفصلات والجوارير التي تضمن حركة
                  سلسة ومتانة للأثاث.
                </p>
              </div>
            </div>
            <div
              onClick={() => navigate("/products?category=sofa")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/oW6JO0A.png"
                  alt="مستلزمات الكنب"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right dark:bg-gray-300">
                <h3 className="text-lg font-bold mb-1 dark:text-black">
                  مستلزمات منجدين
                </h3>
                <p className="text-gray-600 text-sm">
                  تشكيلة من الأدوات والخامات الضرورية لأعمال التنجيد وتجديد
                  الأرائك والكراسي.
                </p>
              </div>
            </div>
            <div
              onClick={() => navigate("/products?category=wood")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/uazWZhd.jpeg"
                  alt="مقابض ابواب"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right dark:bg-gray-300">
                <h3 className="text-lg font-bold mb-1 dark:text-black">
                  مقابض ابواب
                </h3>
                <p className="text-gray-600 text-sm">
                  تصاميم أنيقة وعملية لمقابض الأبواب، تناسب مختلف أنماط الديكور.
                </p>
              </div>
            </div>
            <div
              onClick={() => navigate("/products?category=fabric")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/CCEly6H.jpeg"
                  alt="مقابض خزائن"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right dark:bg-gray-300">
                <h3 className="text-lg font-bold mb-1 dark:text-black">
                  مقابض خزائن
                </h3>
                <p className="text-gray-600 text-sm">
                  مجموعة مميزة من المقابض التي تضيف لمسة جمالية وعملية لخزائن
                  المطبخ.
                </p>
              </div>
            </div>
            <div
              onClick={() => navigate("/products?category=sofa")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/CCEly6H.jpeg"
                  alt="اكسسورات مطابخ"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right dark:bg-gray-300">
                <h3 className="text-lg font-bold mb-1 dark:text-black">
                  اكسسورات مطابخ
                </h3>
                <p className="text-gray-600 text-sm">
                  اكسسوارات ذكية وعصرية تساعد على تنظيم المساحات وتسهيل
                  الاستخدام اليومي في المطبخ.
                </p>
              </div>
            </div>
            <div
              onClick={() => navigate("/products?category=wood")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/uazWZhd.jpeg"
                  alt="اكسسورات غرف نوم"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right dark:bg-gray-300">
                <h3 className="text-lg font-bold mb-1 dark:text-black">
                  اكسسورات غرف نوم
                </h3>
                <p className="text-gray-600 text-sm">
                  خشب، مسامير، وأدوات بناء الكنب.
                </p>
              </div>
            </div>
            <div
              onClick={() => navigate("/products?category=fabric")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/CCEly6H.jpeg"
                  alt="اكسسورات غرف نوم"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right dark:bg-gray-300">
                <h3 className="text-lg font-bold mb-1 dark:text-black">
                  اكسسورات غرف نوم
                </h3>
                <p className="text-gray-600 text-sm">
                  تفاصيل أنيقة تكمل ديكور غرفة النوم، من وحدات تخزين إلى قطع
                  زخرفية عملية.
                </p>
              </div>
            </div>
            <div
              onClick={() => navigate("/products?category=sofa")}
              className="cursor-pointer group overflow-hidden rounded-xl shadow-lg bg-white"
            >
              <div className="overflow-hidden h-56">
                <img
                  src="https://i.imgur.com/bf8geWx.jpeg"
                  alt="اقمشة كنب"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-right dark:bg-gray-300">
                <h3 className="text-lg font-bold mb-1 dark:text-black">
                  اقمشة كنب
                </h3>
                <p className="text-gray-600 text-sm">
                  تشكيلة من أقمشة الكنب المتينة والأنيقة، بتصاميم وألوان متعددة
                  تناسب جميع الأذواق.
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
