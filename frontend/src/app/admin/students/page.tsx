'use client';

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quản lý học viên</h1>
        <p className="text-gray-600">Theo dõi và quản lý thông tin học viên</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <p className="text-gray-500">Danh sách học viên đang được tải...</p>
      </div>
    </div>
  );
}