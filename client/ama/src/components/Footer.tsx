import React from "react";
import { Link } from "react-router-dom";
import VisaLogo from "@/assets/Visa_Inc._logo.svg";
import MastercardLogo from "@/assets/Mastercard-logo.svg";

const Footer: React.FC = () => {
  return (
    <footer className="dark:text-gray-200 mt-12 border-t pt-6 text-center text-gray-600">
      <p>جميع الحقوق محفوظة &copy; 2025 متجر ديكوري</p>
      <p className="dark:text-gray-200 mt-2">للتواصل: 0599-XXXXXX</p>

      {/* روابط السوشيال ميديا */}
      <div className="dark:text-gray-200 mt-4 flex justify-center gap-4">
        <a href="#" className="dark:text-gray-200 hover:text-black">
          فيسبوك
        </a>
        <a href="#" className="dark:text-gray-200 hover:text-black">
          إنستجرام
        </a>
        <a href="#" className="dark:text-gray-200 hover:text-black">
          واتساب
        </a>
      </div>

      {/* روابط قانونية */}
      <div className="dark:text-gray-200 mt-4 flex justify-center gap-4 text-sm">
        <Link
          to="/privacy-policy"
          className="dark:text-gray-200 hover:text-black"
        >
          سياسة الخصوصية
        </Link>
        <Link to="/terms" className="dark:text-gray-200 hover:text-black">
          الشروط والأحكام
        </Link>
      </div>

      {/* شعارات الدفع */}
      <div className="mt-6 flex justify-center gap-6">
        <img src={VisaLogo} alt="Visa" className="h-8 object-contain" />
        <img
          src={MastercardLogo}
          alt="Mastercard"
          className="h-8 object-contain"
        />
      </div>
    </footer>
  );
};

export default Footer;
