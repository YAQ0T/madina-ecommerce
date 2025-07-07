import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Contact: React.FC = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4 text-right">تواصل معنا</h1>
        <p className="text-lg mb-6 text-right text-gray-700">
          يسعدنا تواصلك معنا لأي استفسار أو طلب. يمكنك تعبئة النموذج أدناه أو
          الاتصال بنا مباشرة.
        </p>

        <form className="grid grid-cols-1 gap-4 max-w-lg mx-auto text-right">
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">
              الاسم الكامل
            </label>
            <input
              id="name"
              type="text"
              placeholder="أدخل اسمك"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div>
            <label htmlFor="email" className="block mb-1 font-medium">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              placeholder="example@example.com"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div>
            <label htmlFor="message" className="block mb-1 font-medium">
              الرسالة
            </label>
            <textarea
              id="message"
              rows={4}
              placeholder="اكتب رسالتك هنا..."
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div className="text-left">
            <Button type="submit">إرسال الرسالة</Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default Contact;
