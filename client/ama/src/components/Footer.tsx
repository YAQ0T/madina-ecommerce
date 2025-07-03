import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="mt-12 border-t pt-6 text-center text-gray-600">
      <p>جميع الحقوق محفوظة &copy; 2025 متجر المدينة المنورة</p>
      <p className="mt-2">للتواصل: 0599-XXXXXX</p>
      <div className="mt-4 flex justify-center gap-4">
        <a href="#" className="hover:text-black">
          فيسبوك
        </a>
        <a href="#" className="hover:text-black">
          إنستجرام
        </a>
        <a href="#" className="hover:text-black">
          واتساب
        </a>
      </div>
    </footer>
  );
};

export default Footer;
