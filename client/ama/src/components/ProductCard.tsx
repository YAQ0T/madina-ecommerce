import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import clsx from "clsx";

interface Props {
  product: {
    _id: string;
    name: string;
    description: string;
    price: number;
    images?: string[];
  };
}

const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();
  const [showAdded, setShowAdded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const images = product.images?.length
    ? product.images
    : ["https://i.imgur.com/PU1aG4t.jpeg"];

  const handleAddToCart = () => {
    const productForCart = {
      ...product,
      image: product.images?.[0] || "https://i.imgur.com/PU1aG4t.jpeg", // 👈 استخدم أول صورة
    };

    addToCart(productForCart);
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 1500);
  };

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="group border rounded-lg p-4 text-right hover:shadow relative flex flex-col justify-between h-full">
      {/* ✅ سلايدر الصور بانتقال ناعم */}
      <div className="relative w-full h-64 mb-3 overflow-hidden rounded">
        {images.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={product.name}
            width={400}
            height={250}
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

        {/* الأسهم */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 z-20"
            >
              ◀
            </button>
            <button
              onClick={nextImage}
              className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 z-20"
            >
              ▶
            </button>
          </>
        )}
      </div>

      {/* التفاصيل */}
      <h3 className="text-lg font-medium mb-1">{product.name}</h3>
      <p className="text-gray-600 mb-2 truncate">{product.description}</p>
      <p className="font-bold mb-2">₪{product.price}</p>

      <div className="mt-auto">
        <Button onClick={handleAddToCart} className="w-full">
          إضافة للسلة
        </Button>
        <Link to={`/products/${product._id}`}>
          <Button variant="secondary" className="w-full mt-2">
            عرض التفاصيل
          </Button>
        </Link>
      </div>

      {showAdded && (
        <div className="absolute top-2 left-2 bg-black text-white text-sm px-3 py-1 rounded shadow animate-bounce">
          ✅ تمت الإضافة!
        </div>
      )}
    </div>
  );
};

export default ProductCard;
