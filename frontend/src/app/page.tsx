// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Leaf,
  BookOpen,
  PenTool,
  ChevronRight,
  Sparkles,
  Shield,
  Award,
  TrendingUp,
  Users,
  Clock,
  Target,
  Play,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Mic,
  FileText,
  Globe,
  Zap,
  Star,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: BookOpen,
      title: "Luyện Đọc TOEIC",
      description: "Hơn 1000+ bài đọc với đầy đủ Part 5, 6, 7, phân tích chi tiết",
      color: "from-blue-500 to-cyan-500",
      stats: "1,234 bài tập",
    },
    {
      icon: PenTool,
      title: "Luyện Viết TOEIC",
      description: "Luyện viết câu, đoạn văn với AI chấm điểm và gợi ý cải thiện",
      color: "from-purple-500 to-pink-500",
      stats: "892 bài tập",
    },
    {
      icon: Mic,
      title: "Luyện Nói (Sắp ra mắt)",
      description: "Phỏng vấn AI với công nghệ nhận diện giọng nói tiên tiến",
      color: "from-orange-500 to-red-500",
      stats: "Coming Soon",
      comingSoon: true,
    },
  ];

  const examParts = [
    {
      part: "Part 5",
      title: "Incomplete Sentences",
      questions: 40,
      description: "Hoàn thành câu với từ vựng và ngữ pháp phù hợp",
      difficulty: "Trung bình",
    },
    {
      part: "Part 6",
      title: "Text Completion",
      questions: 16,
      description: "Đọc và hoàn thành đoạn văn với 4 lựa chọn",
      difficulty: "Trung bình - Khó",
    },
    {
      part: "Part 7",
      title: "Reading Comprehension",
      questions: 54,
      description: "Đọc hiểu đơn, thư, bài báo và trả lời câu hỏi",
      difficulty: "Khó",
    },
  ];

  const writingParts = [
    {
      part: "Part 1",
      title: "Write a sentence based on a picture",
      questions: 5,
      description: "Viết câu mô tả hình ảnh với từ gợi ý",
    },
    {
      part: "Part 2",
      title: "Respond to a written request",
      questions: 2,
      description: "Trả lời email yêu cầu thông tin",
    },
    {
      part: "Part 3",
      title: "Write an opinion essay",
      questions: 1,
      description: "Viết bài luận bày tỏ quan điểm về một vấn đề",
    },
  ];

  const mockTests = [
    {
      id: 1,
      name: "TOEIC Full Test 1",
      reading: 75,
      writing: 8,
      duration: "120 phút",
      level: "Trung cấp",
      students: 1234,
    },
    {
      id: 2,
      name: "TOEIC Full Test 2",
      reading: 75,
      writing: 8,
      duration: "120 phút",
      level: "Cao cấp",
      students: 892,
    },
    {
      id: 3,
      name: "Mini Test - Reading",
      reading: 30,
      writing: 0,
      duration: "45 phút",
      level: "Cơ bản",
      students: 2156,
    },
  ];

  const stats = [
    { icon: Users, value: "50,000+", label: "Học viên", suffix: "" },
    { icon: BookOpen, value: "2,000+", label: "Bài tập", suffix: "" },
    { icon: Award, value: "98%", label: "Hài lòng", suffix: "" },
    { icon: TrendingUp, value: "+150", label: "Điểm trung bình", suffix: "điểm" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <motion.header
        style={{ opacity }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-emerald-100"
            : "bg-white/80 backdrop-blur-md border-b border-emerald-100/50"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg"
              >
                <Leaf className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-800 to-teal-600 bg-clip-text text-transparent">
                EduChain
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                TOEIC
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#khoa-hoc" className="text-emerald-700 hover:text-emerald-900 transition-colors font-medium">
                Khóa học
              </Link>
              <Link href="#luyen-de" className="text-emerald-700 hover:text-emerald-900 transition-colors font-medium">
                Luyện đề
              </Link>
              <Link href="#thi-thu" className="text-emerald-700 hover:text-emerald-900 transition-colors font-medium">
                Thi thử
              </Link>
              <Link href="#thanh-tich" className="text-emerald-700 hover:text-emerald-900 transition-colors font-medium">
                Thành tích
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="px-4 py-2 text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all transform hover:scale-105"
              >
                Đăng ký miễn phí
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 via-transparent to-teal-100/20" />
          <div className="max-w-7xl mx-auto relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center space-x-2 bg-emerald-100 rounded-full px-4 py-2 mb-6">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">
                    Nền tảng học TOEIC số 1 Việt Nam
                  </span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-bold mb-6">
                  <span className="text-emerald-900">Chinh phục</span>
                  <br />
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    TOEIC 900+
                  </span>
                </h1>

                <p className="text-lg text-emerald-700 mb-8 leading-relaxed">
                  Hệ thống luyện thi TOEIC thông minh với AI, chấm điểm chính xác,
                  lộ trình cá nhân hóa và chứng chỉ blockchain uy tín.
                </p>

                <div className="flex flex-wrap gap-4 mb-8">
                  <Link
                    href="/reading"
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                  >
                    Bắt đầu học ngay
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <button className="px-6 py-3 border-2 border-emerald-300 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50 transition-all flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Xem giới thiệu
                  </button>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 border-2 border-white flex items-center justify-center text-white font-bold"
                      >
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-emerald-600">
                    <span className="font-bold text-emerald-800">10,000+</span> học viên đã tin dùng
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="bg-white rounded-3xl shadow-2xl p-6 border border-emerald-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-emerald-800">Bài học hôm nay</h3>
                    <span className="text-xs text-emerald-500">Cập nhật mới</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { title: "Part 5: Từ vựng - Ngữ pháp", progress: 75, time: "15 phút" },
                      { title: "Part 6: Điền từ vào đoạn văn", progress: 40, time: "20 phút" },
                      { title: "Part 7: Đọc hiểu bài báo", progress: 20, time: "30 phút" },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 bg-emerald-50 rounded-xl">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-emerald-800">{item.title}</span>
                          <span className="text-xs text-emerald-600">{item.time}</span>
                        </div>
                        <div className="w-full bg-emerald-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="text-center"
                >
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-emerald-800">{stat.value}</div>
                  <div className="text-sm text-emerald-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="khoa-hoc" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold text-emerald-800 mb-4">
                Lộ trình học tập <span className="text-emerald-600">toàn diện</span>
              </h2>
              <p className="text-lg text-emerald-600 max-w-2xl mx-auto">
                Học 2 kỹ năng Reading & Writing với phương pháp hiện đại, lộ trình cá nhân hóa
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-emerald-100"
                >
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-800 mb-3">{feature.title}</h3>
                  <p className="text-emerald-600 mb-4">{feature.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-500">{feature.stats}</span>
                    {!feature.comingSoon && (
                      <Link
                        href={feature.title === "Luyện Đọc TOEIC" ? "/reading" : "/writing"}
                        className="text-emerald-600 font-medium hover:text-emerald-800 flex items-center gap-1"
                      >
                        Luyện ngay
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Reading Parts Section */}
        <section id="luyen-de" className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 bg-blue-100 rounded-full px-4 py-2 mb-4">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Kỹ năng Đọc</span>
              </div>
              <h2 className="text-3xl font-bold text-emerald-800 mb-4">Cấu trúc bài thi Reading</h2>
              <p className="text-lg text-emerald-600">Luyện tập từng Part với hệ thống bài tập đa dạng</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {examParts.map((part, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-100 cursor-pointer"
                  onClick={() => router.push(`/reading/part${part.part.split(" ")[1]}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-2xl font-bold text-blue-600">{part.part}</span>
                      <h3 className="text-lg font-semibold text-emerald-800 mt-1">{part.title}</h3>
                    </div>
                    <div className="bg-blue-100 rounded-full px-3 py-1">
                      <span className="text-sm font-medium text-blue-700">{part.questions} câu</span>
                    </div>
                  </div>
                  <p className="text-emerald-600 text-sm mb-3">{part.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-500">Độ khó: {part.difficulty}</span>
                    <button className="text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1">
                      Luyện tập
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Writing Parts Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 bg-purple-100 rounded-full px-4 py-2 mb-4">
                <PenTool className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Kỹ năng Viết</span>
              </div>
              <h2 className="text-3xl font-bold text-emerald-800 mb-4">Cấu trúc bài thi Writing</h2>
              <p className="text-lg text-emerald-600">Luyện viết với AI chấm điểm và gợi ý cải thiện</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {writingParts.map((part, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 border border-purple-100 cursor-pointer"
                  onClick={() => router.push(`/writing/part${part.part.split(" ")[1]}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-2xl font-bold text-purple-600">{part.part}</span>
                      <h3 className="text-lg font-semibold text-emerald-800 mt-1">{part.title}</h3>
                    </div>
                    <div className="bg-purple-100 rounded-full px-3 py-1">
                      <span className="text-sm font-medium text-purple-700">{part.questions} bài</span>
                    </div>
                  </div>
                  <p className="text-emerald-600 text-sm">{part.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Mock Tests Section */}
        <section id="thi-thu" className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 bg-emerald-100 rounded-full px-4 py-2 mb-4">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Thi thử</span>
              </div>
              <h2 className="text-3xl font-bold text-emerald-800 mb-4">Đề thi thử TOEIC</h2>
              <p className="text-lg text-emerald-600">Làm quen với cấu trúc đề thi thật</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {mockTests.map((test, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-2xl p-6 border-2 border-emerald-100 hover:border-emerald-300 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-emerald-800">{test.name}</h3>
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Reading</span>
                      <span className="font-semibold text-emerald-800">{test.reading} câu</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Writing</span>
                      <span className="font-semibold text-emerald-800">{test.writing} câu</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Thời gian</span>
                      <span className="font-semibold text-emerald-800">{test.duration}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Đã làm</span>
                      <span className="font-semibold text-emerald-800">{test.students} học viên</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const token = localStorage.getItem("accessToken");
                      if (token) {
                        router.push(`/mock-test/${test.id}`);
                      } else {
                        router.push("/login?redirect=/mock-test/" + test.id);
                      }
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Thi thử ngay
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-12 shadow-2xl"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Sẵn sàng chinh phục TOEIC?
              </h2>
              <p className="text-emerald-50 mb-8 text-lg">
                Đăng ký ngay hôm nay để nhận lộ trình học miễn phí và ưu đãi đặc biệt
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-600 rounded-xl font-semibold hover:shadow-xl transition-all transform hover:scale-105"
              >
                Đăng ký miễn phí
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-emerald-100 text-sm mt-4">
                Không cần thẻ tín dụng • Hủy bất kỳ lúc nào
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-emerald-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Leaf className="w-6 h-6" />
                <span className="text-xl font-bold">EduChain</span>
              </div>
              <p className="text-emerald-200 text-sm">
                Nền tảng luyện thi TOEIC với AI và công nghệ Blockchain
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Khóa học</h4>
              <ul className="space-y-2 text-sm text-emerald-200">
                <li><Link href="/reading">Luyện đọc TOEIC</Link></li>
                <li><Link href="/writing">Luyện viết TOEIC</Link></li>
                <li><Link href="#">Luyện nghe (Sắp ra mắt)</Link></li>
                <li><Link href="#">Luyện nói (Sắp ra mắt)</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-emerald-200">
                <li><Link href="#">Trung tâm trợ giúp</Link></li>
                <li><Link href="#">Liên hệ</Link></li>
                <li><Link href="#">Điều khoản sử dụng</Link></li>
                <li><Link href="#">Chính sách bảo mật</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kết nối</h4>
              <ul className="space-y-2 text-sm text-emerald-200">
                <li>Facebook: @educhain.toeic</li>
                <li>Email: support@educhain.com</li>
                <li>Hotline: 1900 1234</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-emerald-800 mt-8 pt-8 text-center text-sm text-emerald-300">
            © 2024 EduChain. Tất cả các quyền được bảo lưu.
          </div>
        </div>
      </footer>
    </div>
  );
}