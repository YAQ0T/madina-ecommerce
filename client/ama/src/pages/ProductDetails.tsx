import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const ProductDetails: React.FC = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    axios
      .get(`http://localhost:3001/api/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error("❌ Failed to fetch product details", err));
  }, [id]);

  if (!product) {
    return <p className="text-center mt-10">جاري تحميل تفاصيل المنتج...</p>;
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 text-right">
        <div className="grid md:grid-cols-2 gap-8">
          <img
            src={product.image}
            alt={product.name}
            className="w-full rounded"
          />
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            <p className="text-gray-700 mb-4">{product.description}</p>
            <p className="text-xl font-semibold mb-6">₪{product.price}</p>
            <Button>إضافة للسلة</Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ProductDetails;
