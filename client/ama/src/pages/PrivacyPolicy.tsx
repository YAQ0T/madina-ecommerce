import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 text-right space-y-4">
        <h1 className="text-3xl font-bold mb-4">سياسة الخصوصية</h1>
        <p>
          نحن نحترم خصوصيتك ونلتزم بحماية المعلومات الشخصية التي تقدمها لنا.
          نستخدم هذه المعلومات فقط لأغراض تنفيذ الطلبات وتحسين تجربتك على
          الموقع.
        </p>
        <p>
          لا نقوم بمشاركة أو بيع معلوماتك الشخصية لأي طرف ثالث بدون إذنك، إلا في
          الحالات القانونية أو لتنفيذ العمليات.
        </p>
        <p>
          باستخدامك لموقعنا، فإنك توافق على سياسة الخصوصية هذه. يمكننا تعديلها
          في أي وقت، وسيتم نشر التعديلات في هذه الصفحة.
        </p>
      </main>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
