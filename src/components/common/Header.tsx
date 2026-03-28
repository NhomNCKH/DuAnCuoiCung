export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">TOEIC AI</h1>
          <nav>
            <ul className="flex space-x-6">
              <li><a href="/" className="text-gray-600 hover:text-gray-800">Trang chủ</a></li>
              <li><a href="/practice" className="text-gray-600 hover:text-gray-800">Luyện tập</a></li>
              <li><a href="/profile" className="text-gray-600 hover:text-gray-800">Hồ sơ</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}