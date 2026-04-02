// src/components/Footer.tsx
import Image from "next/image";
import Link from "next/link";
import { Facebook, Twitter, Youtube, Instagram, Mail, Phone, MapPin, Globe } from "lucide-react";

export default function Footer() {
  const features = [
    {
      title: "Kho đề phong phú",
      description: "IELTS, TOEIC, HSK, TOPIK, THPT...",
      icon: "📚"
    },
    {
      title: "Giao diện thân thiện",
      description: "Giống thi thật, dễ sử dụng",
      icon: "🎯"
    },
    {
      title: "Linh hoạt thời gian",
      description: "Tự chọn part và thời gian làm bài",
      icon: "⏰"
    },
    {
      title: "Công cụ hỗ trợ",
      description: "Highlight, ghi chú, từ điển...",
      icon: "🛠️"
    }
  ];

    const aboutLinks = [
    { name: "Giới thiệu", href: "/pages/about" },
    { name: "Liên hệ", href: "/pages/contact" },
    { name: "Điều khoản bảo mật", href: "/pages/privacy" },
    { name: "Điều khoản sử dụng", href: "/pages/terms" }
    ];

  const resourceLinks = [
    { name: "Thư viện đề thi", href: "/student/practicetest" },
    { name: "Blog", href: "/pages/blog" },
    { name: "Tổng hợp tài liệu", href: "/resources" }
  ];

  const policyLinks = [
    { name: "Hướng dẫn sử dụng", href: "/guide" },
    { name: "Hướng dẫn thanh toán", href: "/payment-guide" },
    { name: "Điều khoản và Điều Kiện Giao Dịch", href: "/terms-of-service" },
    { name: "Chính sách giá bán", href: "/pricing-policy" },
    { name: "Chính sách kiểm hàng", href: "/inspection-policy" },
    { name: "Chính sách giao, nhận hàng", href: "/delivery-policy" },
    { name: "Phản hồi, khiếu nại", href: "/feedback" }
  ];

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com", color: "hover:text-blue-600" },
    { icon: Twitter, href: "https://twitter.com", color: "hover:text-blue-400" },
    { icon: Youtube, href: "https://youtube.com", color: "hover:text-red-600" },
    { icon: Instagram, href: "https://instagram.com", color: "hover:text-pink-600" }
  ];

  return (
    <footer className="bg-white rounded-2xl shadow-sm overflow-hidden mt-12 border border-gray-100">
      <div className="px-6 py-12 md:px-12">
        {/* Logo và slogan */}
        <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
            {/* Ảnh logo */}
            <img 
            src="/icon/icon_website.svg"  // Đường dẫn đến file ảnh logo
            alt="TOEIC MASTER Logo"
            className="w-30 h-12 object-contain"
            />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            TOEIC MASTER
            </h2>
        </div>
        <p className="text-gray-600 text-lg font-medium">
            LUYỆN ĐỀ ONLINE KHÔNG GIỚI HẠN
        </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="text-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group cursor-pointer"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="text-gray-800 font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Report Feature */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-12 text-center border border-blue-100">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <h3 className="text-gray-800 font-semibold">Report điểm tự động + đánh giá chi tiết bài làm</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Nhận kết quả ngay sau khi hoàn thành bài thi với phân tích chi tiết từng phần
          </p>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-8 border-t border-gray-200">
          {/* Column 1 - About */}
          <div>
            <h3 className="text-gray-800 font-bold text-lg mb-4">VỀ EDUCHAIN</h3>
            <ul className="space-y-2">
              {aboutLinks.map((item, idx) => (
                <li key={idx}>
                  <Link
                    href={item.href}
                    className="text-gray-500 hover:text-blue-600 text-sm transition-colors inline-block"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2 - Resources */}
          <div>
            <h3 className="text-gray-800 font-bold text-lg mb-4">TÀI NGUYÊN</h3>
            <ul className="space-y-2">
              {resourceLinks.map((item, idx) => (
                <li key={idx}>
                  <Link
                    href={item.href}
                    className="text-gray-500 hover:text-blue-600 text-sm transition-colors inline-block"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Policies */}
          <div>
            <h3 className="text-gray-800 font-bold text-lg mb-4">CHÍNH SÁCH CHUNG</h3>
            <ul className="space-y-2">
              {policyLinks.map((item, idx) => (
                <li key={idx}>
                  <Link
                    href={item.href}
                    className="text-gray-500 hover:text-blue-600 text-sm transition-colors inline-block"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Contact */}
          <div>
            <h3 className="text-gray-800 font-bold text-lg mb-4">LIÊN HỆ</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-500 text-sm">
                <Mail className="w-4 h-4" />
                <span>support@educhain.com</span>
              </li>
              <li className="flex items-center gap-3 text-gray-500 text-sm">
                <Phone className="w-4 h-4" />
                <span>+84 123 456 789</span>
              </li>
              <li className="flex items-center gap-3 text-gray-500 text-sm">
                <MapPin className="w-4 h-4" />
                <span>Hà Nội, Việt Nam</span>
              </li>
              <li className="flex items-center gap-3 text-gray-500 text-sm">
                <Globe className="w-4 h-4" />
                <span>www.educhain.com</span>
              </li>
            </ul>

            {/* Social Links */}
            <div className="flex gap-3 mt-4">
              {socialLinks.map((social, idx) => (
                <Link
                  key={idx}
                  href={social.href}
                  target="_blank"
                  className={`p-2 bg-gray-100 rounded-lg text-gray-500 hover:text-white transition-all ${social.color} hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600`}
                >
                  <social.icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} EduChain. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}