// app/terms/page.tsx
"use client";

import { motion } from "framer-motion";
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Scale, 
  Users, 
  CreditCard, 
  Shield, 
  BookOpen,
  ArrowRight,
  MessageSquare,
  Globe,
  Zap
} from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  const sections = [
    {
      icon: FileText,
      title: "1. Chấp nhận điều khoản",
      content: "Khi sử dụng dịch vụ của EduChain, bạn đồng ý tuân thủ các điều khoản và điều kiện này. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.",
    },
    {
      icon: Users,
      title: "2. Tài khoản người dùng",
      content: "Bạn chịu trách nhiệm bảo mật thông tin tài khoản. Mọi hoạt động từ tài khoản của bạn đều được coi là do bạn thực hiện.",
    },
    {
      icon: BookOpen,
      title: "3. Quyền sở hữu trí tuệ",
      content: "Tất cả nội dung khóa học, bài tập, và tài liệu trên nền tảng đều thuộc sở hữu của EduChain. Không được sao chép, phân phối khi chưa có sự cho phép.",
    },
    {
      icon: CreditCard,
      title: "4. Thanh toán và hoàn tiền",
      content: "Học phí được thanh toán trước khi bắt đầu khóa học. Chúng tôi hỗ trợ hoàn tiền trong vòng 7 ngày nếu bạn không hài lòng với chất lượng khóa học.",
    },
    {
      icon: Shield,
      title: "5. Chứng chỉ Blockchain",
      content: "Chứng chỉ được cấp dựa trên kết quả học tập thực tế. Mỗi chứng chỉ có mã hash duy nhất trên Blockchain, đảm bảo tính xác thực.",
    },
    {
      icon: Scale,
      title: "6. Giới hạn trách nhiệm",
      content: "EduChain không chịu trách nhiệm về bất kỳ thiệt hại nào phát sinh từ việc sử dụng dịch vụ ngoài phạm vi kiểm soát của chúng tôi.",
    },
  ];

  const guidelines = [
    "Không được sử dụng tài khoản để gian lận trong các bài kiểm tra",
    "Không được chia sẻ tài khoản cho người khác",
    "Tôn trọng quyền sở hữu trí tuệ của nội dung khóa học",
    "Không được sử dụng nền tảng cho mục đích bất hợp pháp",
    "Báo cáo ngay nếu phát hiện lỗi hoặc vi phạm",
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
              <Scale className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Điều khoản sử dụng</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Điều khoản
              <span className="block text-blue-700">
                sử dụng dịch vụ
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              Vui lòng đọc kỹ các điều khoản trước khi sử dụng dịch vụ của EduChain.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Last Updated */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-blue-100">
          <p className="text-sm text-gray-500">
            Có hiệu lực từ: <span className="font-medium text-blue-600">1 tháng 1, 2025</span>
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
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{section.title}</h2>
                    <p className="text-gray-600 leading-relaxed">{section.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* User Guidelines */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Hướng dẫn sử dụng</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {guidelines.map((guideline, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{guideline}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Termination */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 bg-yellow-50 rounded-2xl p-6 border border-yellow-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Chấm dứt tài khoản</h3>
                <p className="text-gray-600 leading-relaxed">
                  EduChain có quyền tạm ngưng hoặc chấm dứt tài khoản nếu phát hiện vi phạm điều khoản sử dụng. 
                  Trong trường hợp đó, học phí đã đóng sẽ không được hoàn lại.
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
              Nếu có thắc mắc về điều khoản sử dụng, vui lòng liên hệ:
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
                href="mailto:legal@educhain.com"
                className="inline-flex items-center gap-2 px-6 py-3 border border-blue-300 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                legal@educhain.com
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
