import React from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { products } from "@/data/products";

const ProductDetails: React.FC = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === Number(id));

  if (!product) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto p-6 text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">
            المنتج غير موجود
          </h2>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 max-w-3xl">
        <div className="grid md:grid-cols-2 gap-6">
          <img
            src={product.image}
            alt={product.name}
            className="w-full rounded shadow"
          />
          <div className="text-right">
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            <p className="text-gray-700 mb-4">{product.description}</p>
            <p className="text-xl font-semibold text-green-600 mb-6">
              ₪{product.price}
            </p>
            <Button className="w-full">إضافة للسلة</Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ProductDetails;
