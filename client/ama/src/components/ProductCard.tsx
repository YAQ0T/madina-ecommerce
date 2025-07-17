// src/components/ProductCard.tsx
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";

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

  return (
    <div className="border rounded-lg p-4 text-right hover:shadow">
      <img
        src={product.image}
        alt={product.name}
        className="mb-3 w-full rounded"
      />
      <h3 className="text-lg font-medium mb-1">{product.name}</h3>
      <p className="text-gray-600 mb-2">{product.description}</p>
      <p className="font-bold mb-2">₪{product.price}</p>
      <Button onClick={() => addToCart(product)} className="w-full">
        إضافة للسلة
      </Button>
      <Link to={`/products/${product._id}`}>
        <Button variant="secondary" className="w-full mt-2">
          عرض التفاصيل
        </Button>
      </Link>
    </div>
  );
};

export default ProductCard;
