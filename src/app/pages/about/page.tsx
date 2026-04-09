// app/about/page.tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  Leaf,
  Users,
  Award,
  Globe,
  BookOpen,
  Shield,
  Sparkles,
  TrendingUp,
  Clock,
  MessageSquare,
  Zap,
  Heart,
  CheckCircle2,
  ArrowRight,
  Play,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { buildAuthRoute } from "@/lib/auth/routing";

export default function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const stats = [
    {
      icon: Users,
      value: "50,000+",
      label: "Học viên",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Award,
      value: "98%",
      label: "Hài lòng",
      color: "from-blue-500 to-indigo-500",
    },
    {
      icon: Globe,
      value: "15+",
      label: "Quốc gia",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: BookOpen,
      value: "2,000+",
      label: "Bài học",
      color: "from-orange-500 to-red-500",
    },
  ];

  const milestones = [
    {
      year: "2022",
      title: "Thành lập",
      description:
        "EduChain được thành lập với sứ mệnh cách mạng hóa việc học TOEIC",
      icon: Sparkles,
    },
    {
      year: "2023",
      title: "1,000+ học viên",
      description: "Đạt mốc 1,000 học viên đầu tiên với phản hồi tích cực",
      icon: Users,
    },
    {
      year: "2024",
      title: "Ra mắt AI Interview",
      description: "Công nghệ AI chấm điểm và phản hồi real-time",
      icon: Zap,
    },
    {
      year: "2025",
      title: "Chứng chỉ Blockchain",
      description: "Cấp chứng chỉ được xác thực trên Blockchain",
      icon: Shield,
    },
  ];

  const values = [
    {
      icon: Heart,
      title: "Tận tâm",
      description: "Luôn đặt lợi ích của học viên lên hàng đầu",
    },
    {
      icon: TrendingUp,
      title: "Đổi mới",
      description: "Không ngừng cải tiến công nghệ và phương pháp giảng dạy",
    },
    {
      icon: Shield,
      title: "Uy tín",
      description: "Cam kết chất lượng và minh bạch trong mọi hoạt động",
    },
    {
      icon: Users,
      title: "Cộng đồng",
      description: "Xây dựng môi trường học tập hỗ trợ lẫn nhau",
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
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gray-50"
    >
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-blue-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Về chúng tôi
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-800 mb-6">
              Cách mạng hóa
              <span className="block text-blue-700">
                việc học TOEIC
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              EduChain kết hợp AI hiện đại và công nghệ Blockchain để mang đến
              trải nghiệm học tập hiệu quả, minh bạch và được cá nhân hóa cho
              từng học viên.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
          >
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -5 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-blue-100"
              >
                <div
                  className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3"
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800"
                  alt="Team working"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Đã đạt được</p>
                    <p className="text-xl font-bold text-blue-600">50,000+</p>
                    <p className="text-xs text-gray-500">học viên thành công</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-blue-100 rounded-full px-4 py-2">
                <Heart className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Sứ mệnh của chúng tôi
                </span>
              </div>
              <h2 className="text-3xl font-bold text-gray-800">
                Mang đến nền giáo dục{" "}
                <span className="text-blue-600">chất lượng cao</span> cho tất cả
                mọi người
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Chúng tôi tin rằng mọi người đều xứng đáng được tiếp cận với nền
                giáo dục chất lượng. Với công nghệ AI và Blockchain, chúng tôi
                tạo ra một nền tảng học tập minh bạch, hiệu quả và được cá nhân
                hóa.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-700">
                    Cá nhân hóa lộ trình học
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-700">
                    Chấm điểm AI chính xác
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-700">
                    Chứng chỉ Blockchain
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-700">Hỗ trợ 24/7</span>
                </div>
              </div>
              <Link
                href={buildAuthRoute({ mode: "register" })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105"
              >
                Bắt đầu học ngay
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Giá trị cốt lõi
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Những nguyên tắc định hình mọi hoạt động và quyết định của chúng
              tôi
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {values.map((value, idx) => (
              <motion.div
                key={value.title}
                variants={item}
                whileHover={{ y: -8 }}
                className="bg-white rounded-2xl p-6 text-center shadow-lg border border-blue-100"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-500">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Milestones Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Hành trình phát triển
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Những cột mốc quan trọng trên con đường xây dựng nền tảng học tập
              tốt nhất
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-blue-500 to-indigo-500 hidden md:block" />
            <div className="space-y-12">
              {milestones.map((milestone, idx) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className={`flex flex-col md:flex-row items-center gap-8 ${
                    idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  <div className="flex-1">
                    <div
                      className={`bg-white rounded-2xl p-6 shadow-lg border border-blue-100 ${
                        idx % 2 === 0 ? "md:text-right" : "md:text-left"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                          <milestone.icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {milestone.year}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-gray-500">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center z-10 shadow-lg">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Sẵn sàng chinh phục TOEIC?
            </h2>
            <p className="text-blue-100 text-lg">
              Tham gia cùng 50,000+ học viên đã cải thiện điểm số và đạt được
              mục tiêu của mình
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link
                href={buildAuthRoute({ mode: "register" })}
                className="px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105"
              >
                Đăng ký miễn phí
              </Link>
              <Link
                href="/contact"
                className="px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                Liên hệ tư vấn
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
