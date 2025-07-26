import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

interface Props {
  product: {
    _id: string;
    name: string;
    description: string;
    price: number;
    image: string;
  };
}

const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();
  const [showAdded, setShowAdded] = useState(false);

  const handleAddToCart = () => {
    addToCart(product);
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 1500); // 1.5 ثانية وتختفي الرسالة
  };

  return (
    <div className="border rounded-lg p-4 text-right hover:shadow relative flex flex-col justify-between h-full border rounded-xl p-4">
      <img
        src={product.image}
        alt={product.name}
        className="mb-3 w-full h-70 w-full object-contain rounded"
      />
      <h3 className="text-lg font-medium mb-1">{product.name}</h3>
      <p className="text-gray-600 mb-2">{product.description}</p>
      <p className="font-bold mb-2">₪{product.price}</p>

      <div className="flex flex-col justify-between h-full rounded-lg">
        {/* محتوى البطاقة من صورة واسم وسعر الخ... */}

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
      </div>

      {/* ✅ رسالة تم الإضافة */}
      {showAdded && (
        <div className="absolute top-2 left-2 bg-black text-white text-sm px-3 py-1 rounded shadow animate-bounce">
          ✅ تمت الإضافة!
        </div>
      )}
    </div>
  );
};

export default ProductCard;
