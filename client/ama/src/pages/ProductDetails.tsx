import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import clsx from "clsx";

const ProductDetails: React.FC = () => {
  const { addToCart } = useCart();
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error("❌ Failed to fetch product details", err));
  }, [id]);

  if (!product) {
    return <p className="text-center mt-10">جاري تحميل تفاصيل المنتج...</p>;
  }

  const images = product.images?.length
    ? product.images
    : ["https://i.imgur.com/PU1aG4t.jpeg"];

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 text-right">
        <div className="grid md:grid-cols-2 gap-8">
          {/* ✅ سلايدر الصور */}
          <div className="relative w-full h-[400px] overflow-hidden rounded group">
            {images.map((src: string, index: number) => (
              <img
                key={index}
                src={src}
                alt={product.name}
                className={clsx(
                  "absolute top-0 left-0 w-full h-full object-contain transition-all duration-500 pointer-events-none",
                  {
                    "opacity-100 translate-x-0 z-10": index === currentImage,
                    "opacity-0 translate-x-full z-0": index > currentImage,
                    "opacity-0 -translate-x-full z-0": index < currentImage,
                  }
                )}
              />
            ))}

            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 hover:scale-105 transition opacity-0 group-hover:opacity-100 z-20"
                >
                  ◀
                </button>
                <button
                  onClick={nextImage}
                  className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 hover:scale-105 transition opacity-0 group-hover:opacity-100 z-20"
                >
                  ▶
                </button>
              </>
            )}
          </div>

          {/* ✅ التفاصيل */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            <p className="text-gray-700 mb-4">{product.description}</p>
            <p className="text-xl font-semibold mb-6">₪{product.price}</p>
            <Button onClick={() => addToCart(product)}>إضافة للسلة</Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ProductDetails;
