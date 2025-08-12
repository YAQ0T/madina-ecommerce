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
    subCategory?: string;
    measures?: string[];
    colors?: string[];
  };
}

const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();
  const [showAdded, setShowAdded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedMeasure, setSelectedMeasure] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const images = product.images?.length
    ? product.images
    : ["https://i.imgur.com/PU1aG4t.jpeg"];

  const handleAddToCart = () => {
    if (product.measures?.length && !selectedMeasure) {
      alert("يرجى اختيار المقاس قبل الإضافة للسلة");
      return;
    }
    if (product.colors?.length && !selectedColor) {
      alert("يرجى اختيار اللون قبل الإضافة للسلة");
      return;
    }

    const productForCart = {
      ...product,
      image: product.images?.[0] || "https://i.imgur.com/PU1aG4t.jpeg",
      selectedMeasure,
      selectedColor,
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
      {/* ✅ الصورة */}
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

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 transition-all duration-300 opacity-0 group-hover:opacity-100 z-20"
            >
              ◀
            </button>
            <button
              onClick={nextImage}
              className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 transition-all duration-300 opacity-0 group-hover:opacity-100 z-20"
            >
              ▶
            </button>
          </>
        )}
      </div>

      {/* ✅ العنوان */}
      <h3 className="text-lg font-medium mb-1">{product.name}</h3>

      {/* ✅ القائمة الفرعية */}
      {product.subCategory && (
        <p className="text-sm text-gray-500 mb-2">{product.subCategory}</p>
      )}

      {/* ✅ اختيار المقاس */}
      {product.measures && product.measures.length > 0 && (
        <div className="mb-2">
          <span className="text-sm font-medium">المقاسات: </span>
          <select
            value={selectedMeasure}
            onChange={(e) => setSelectedMeasure(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">اختر المقاس</option>
            {product.measures.map((measure, i) => (
              <option key={i} value={measure}>
                {measure}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ✅ اختيار اللون */}
      {product.colors && product.colors.length > 0 && (
        <div className="mb-2">
          <span className="text-sm font-medium">الألوان: </span>
          <div className="flex gap-2 mt-1">
            {product.colors.map((color, i) => (
              <button
                key={i}
                onClick={() => setSelectedColor(color)}
                className={clsx(
                  "w-6 h-6 rounded-full border-2",
                  selectedColor === color
                    ? "border-black scale-110"
                    : "border-gray-300"
                )}
                style={{ backgroundColor: color }}
              ></button>
            ))}
          </div>
        </div>
      )}

      {/* ✅ السعر */}
      <p className="font-bold mb-2">₪{product.price}</p>

      {/* ✅ الأزرار */}
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
