import React from "react";
import { Button } from "@/components/ui/button";

interface UserTableProps {
  users: any[];
  onDelete: (userId: string, userName: string) => void;
  currentAdminId: string; // لمنع حذف نفسه
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  onDelete,
  currentAdminId,
}) => {
  if (!users || users.length === 0) {
    return <p className="text-gray-600">لا يوجد مستخدمين حالياً.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">#</th>
            <th className="border px-4 py-2">الاسم</th>
            <th className="border px-4 py-2">البريد الإلكتروني</th>
            <th className="border px-4 py-2">الهاتف</th>
            <th className="border px-4 py-2">الدور</th>
            <th className="border px-4 py-2">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => (
            <tr key={user._id}>
              <td className="border px-4 py-2">{idx + 1}</td>
              <td className="border px-4 py-2">{user.name}</td>
              <td className="border px-4 py-2">{user.email}</td>
              <td className="border px-4 py-2">{user.phone || "-"}</td>
              <td className="border px-4 py-2">
                {user.role === "admin" ? "أدمن" : "مستخدم"}
              </td>
              <td className="border px-4 py-2">
                {user._id !== currentAdminId && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(user._id, user.name)}
                  >
                    🗑️ حذف
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
