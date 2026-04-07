// app/privacy/page.tsx
"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Eye,
  Database,
  Mail,
  Cookie,
  FileText,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
  const sections = [
    {
      icon: Shield,
      title: "1. Cam kết bảo mật",
      content:
        "Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn. Mọi dữ liệu được thu thập đều được bảo mật và chỉ sử dụng cho mục đích cải thiện trải nghiệm học tập.",
    },
    {
      icon: Database,
      title: "2. Thông tin thu thập",
      content:
        "Chúng tôi thu thập thông tin bao gồm: tên, email, thông tin thanh toán, dữ liệu học tập và tương tác trên nền tảng. Tất cả đều được bảo vệ nghiêm ngặt.",
    },
    {
      icon: Lock,
      title: "3. Bảo mật dữ liệu",
      content:
        "Dữ liệu của bạn được mã hóa và lưu trữ an toàn trên hệ thống blockchain, đảm bảo không thể bị can thiệp hoặc làm giả.",
    },
    {
      icon: Eye,
      title: "4. Quyền của người dùng",
      content:
        "Bạn có quyền yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân của mình bất cứ lúc nào thông qua tài khoản hoặc liên hệ hỗ trợ.",
    },
    {
      icon: Cookie,
      title: "5. Cookie và công nghệ theo dõi",
      content:
        "Chúng tôi sử dụng cookie để cải thiện trải nghiệm người dùng và phân tích hiệu suất. Bạn có thể tùy chỉnh cài đặt cookie trong trình duyệt.",
    },
    {
      icon: Mail,
      title: "6. Liên lạc và thông báo",
      content:
        "Chúng tôi có thể gửi email thông báo về khóa học, cập nhật tính năng mới. Bạn có thể hủy đăng ký bất cứ lúc nào.",
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-blue-50" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 rounded-full px-4 py-2 mb-6">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Chính sách bảo mật
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Bảo vệ thông tin
              <span className="block text-blue-700">
                của bạn là ưu tiên hàng đầu
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              Chúng tôi cam kết bảo mật và minh bạch trong việc thu thập, sử
              dụng dữ liệu của bạn.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Last Updated */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-blue-100">
          <p className="text-sm text-gray-500">
            Cập nhật lần cuối:{" "}
            <span className="font-medium text-blue-600">25 tháng 3, 2025</span>
          </p>
        </div>
      </div>

      {/* Content Sections */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-6"
          >
            {sections.map((section) => (
              <motion.div
                key={section.title}
                variants={item}
                whileHover={{ x: 8 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                      {section.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Data Retention */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 bg-blue-50 rounded-2xl p-6 border border-blue-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  Thời gian lưu trữ dữ liệu
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Dữ liệu của bạn được lưu trữ trong suốt thời gian sử dụng tài
                  khoản. Sau khi tài khoản bị xóa, dữ liệu sẽ được ẩn danh và
                  chỉ giữ lại cho mục đích thống kê trong vòng 30 ngày.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <p className="text-gray-600 mb-4">
              Nếu có bất kỳ thắc mắc về chính sách bảo mật, vui lòng liên hệ:
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Liên hệ hỗ trợ
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:privacy@educhain.com"
                className="inline-flex items-center gap-2 px-6 py-3 border border-blue-300 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all"
              >
                <Mail className="w-4 h-4" />
                privacy@educhain.com
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
