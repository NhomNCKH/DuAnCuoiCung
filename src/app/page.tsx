// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/User/ThemeToggle";
import {
  BookOpen,
  PenTool,
  ChevronRight,
  Sparkles,
  Award,
  TrendingUp,
  Users,
  Clock,
  Play,
  ArrowRight,
  Mic,
  FileText,
  Zap,
  Star,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

// Image Slider Component
const HeroSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const slides = [
    {
      id: 1,
      image: "/slides/hero1.jpg",
      title: "Luyện thi TOEIC cùng AI",
      description: "Công nghệ AI chấm điểm chính xác đến 95%",
    },
    {
      id: 2,
      image: "/slides/hero2.jpg",
      title: "Kho đề thi phong phú",
      description: "Hơn 2000+ đề thi TOEIC mới nhất",
    },
    {
      id: 3,
      image: "/slides/hero3.jpg",
      title: "Chứng chỉ Blockchain",
      description: "Nhận chứng chỉ có giá trị toàn cầu",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="relative w-full h-full"
        >
          <img
            src={slides[currentIndex].image}
            alt={slides[currentIndex].title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-2">
              {slides[currentIndex].title}
            </h3>
            <p className="text-sm md:text-base text-white/90">
              {slides[currentIndex].description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronRightIcon className="w-6 h-6 text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all ${
              currentIndex === index
                ? "w-8 h-2 bg-white rounded-full"
                : "w-2 h-2 bg-white/50 rounded-full hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ feature, idx }: { feature: any; idx: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    whileHover={{ y: -8 }}
    className="group relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg dark:shadow-slate-900/30 hover:shadow-2xl transition-all border border-slate-100 dark:border-slate-700"
  >
    <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
      <feature.icon className="w-8 h-8 text-white" />
    </div>
    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">{feature.title}</h3>
    <p className="text-slate-500 dark:text-slate-400 mb-4">{feature.description}</p>
    <div className="flex items-center justify-between">
      <span className="text-sm text-blue-500 dark:text-blue-400">{feature.stats}</span>
      {!feature.comingSoon && (
        <Link
          href={feature.link}
          className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
        >
          Luyện ngay
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  </motion.div>
);

// Stat Card Component
const StatCard = ({ stat, idx }: { stat: any; idx: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    className="text-center"
  >
    <div className="flex justify-center mb-3">
      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
        <stat.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
    </div>
    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</div>
    <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
  </motion.div>
);

// Reading Part Card
const ReadingPartCard = ({ part, idx, router }: { part: any; idx: number; router: any }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    whileHover={{ scale: 1.02 }}
    className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800 rounded-2xl p-6 border border-blue-100 dark:border-blue-800 cursor-pointer"
    onClick={() => router.push(`/student/reading/part${part.part.split(" ")[1]}`)}
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{part.part}</span>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mt-1">{part.title}</h3>
      </div>
      <div className="bg-blue-100 dark:bg-blue-900 rounded-full px-3 py-1">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{part.questions} câu</span>
      </div>
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">{part.description}</p>
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400 dark:text-slate-500">Độ khó: {part.difficulty}</span>
      <button className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1">
        Luyện tập
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </motion.div>
);

// Writing Part Card
const WritingPartCard = ({ part, idx, router }: { part: any; idx: number; router: any }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    whileHover={{ scale: 1.02 }}
    className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-800 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800 cursor-pointer"
    onClick={() => router.push(`/student/writing/part${part.part.split(" ")[1]}`)}
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{part.part}</span>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mt-1">{part.title}</h3>
      </div>
      <div className="bg-indigo-100 dark:bg-indigo-900 rounded-full px-3 py-1">
        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{part.questions} bài</span>
      </div>
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-sm">{part.description}</p>
  </motion.div>
);

// Mock Test Card
const MockTestCard = ({ test, idx, router }: { test: any; idx: number; router: any }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
  >
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{test.name}</h3>
      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
    </div>
    <div className="space-y-2 mb-4">
      <div className="flex justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">Reading</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{test.reading} câu</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">Writing</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{test.writing} câu</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">Thời gian</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{test.duration}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">Đã làm</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{test.students} học viên</span>
      </div>
    </div>
    <button
      onClick={() => {
        const token = localStorage.getItem("accessToken");
        if (token) {
          router.push(`/student/mock-test/${test.id}`);
        } else {
          router.push("/login?redirect=/student/mock-test/" + test.id);
        }
      }}
      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
    >
      Thi thử ngay
    </button>
  </motion.div>
);

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { scrollYProgress } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (["admin", "superadmin", "org_admin"].includes(user.role)) {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

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
      link: "/student/reading",
      comingSoon: false,
    },
    {
      icon: PenTool,
      title: "Luyện Viết TOEIC",
      description: "Luyện viết câu, đoạn văn với AI chấm điểm và gợi ý cải thiện",
      color: "from-indigo-500 to-purple-500",
      stats: "892 bài tập",
      link: "/student/writing",
      comingSoon: false,
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
    { icon: Users, value: "50,000+", label: "Học viên" },
    { icon: BookOpen, value: "2,000+", label: "Bài tập" },
    { icon: Award, value: "98%", label: "Hài lòng" },
    { icon: TrendingUp, value: "+150", label: "Điểm trung bình" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
      {/* Header */}
      <motion.header
        style={{ opacity }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-blue-100 dark:border-blue-900"
            : "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-blue-100/50 dark:border-blue-900/50"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="relative w-44 h-14">
                <img 
                  src="/logo/logo_website.svg"
                  alt="EduChain Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#khoa-hoc" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                Khóa học
              </Link>
              <Link href="#luyen-de" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                Luyện đề
              </Link>
              <Link href="#thi-thu" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                Thi thử
              </Link>
              <Link href="#thanh-tich" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                Thành tích
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Link
                href="/auth"
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all transform hover:scale-105"
              >
                Đăng nhập ngay
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-indigo-100/20 dark:from-blue-900/10 dark:via-transparent dark:to-indigo-900/10" />
          <div className="max-w-7xl mx-auto relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/50 rounded-full px-4 py-2 mb-6">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Nền tảng học TOEIC số 1 Việt Nam
                  </span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-bold mb-6">
                  <span className="text-slate-900 dark:text-slate-100">Chinh phục</span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    TOEIC 900+
                  </span>
                </h1>

                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  Hệ thống luyện thi TOEIC thông minh với AI, chấm điểm chính xác,
                  lộ trình cá nhân hóa và chứng chỉ blockchain uy tín.
                </p>

                <div className="flex flex-wrap gap-4 mb-8">
                  <Link
                    href="/student/reading"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                  >
                    Bắt đầu học ngay
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <button className="px-6 py-3 border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded-xl font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Xem giới thiệu
                  </button>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-white font-bold"
                      >
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200">10,000+</span> học viên đã tin dùng
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <HeroSlider />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, idx) => (
                <StatCard key={idx} stat={stat} idx={idx} />
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
              <h2 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                Lộ trình học tập <span className="text-blue-600 dark:text-blue-400">toàn diện</span>
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Học 2 kỹ năng Reading & Writing với phương pháp hiện đại, lộ trình cá nhân hóa
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <FeatureCard key={idx} feature={feature} idx={idx} />
              ))}
            </div>
          </div>
        </section>

        {/* Reading Parts Section */}
        <section id="luyen-de" className="py-20 px-4 bg-white dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/50 rounded-full px-4 py-2 mb-4">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Kỹ năng Đọc</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">Cấu trúc bài thi Reading</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400">Luyện tập từng Part với hệ thống bài tập đa dạng</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {examParts.map((part, idx) => (
                <ReadingPartCard key={idx} part={part} idx={idx} router={router} />
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
              <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-full px-4 py-2 mb-4">
                <PenTool className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Kỹ năng Viết</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">Cấu trúc bài thi Writing</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400">Luyện viết với AI chấm điểm và gợi ý cải thiện</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {writingParts.map((part, idx) => (
                <WritingPartCard key={idx} part={part} idx={idx} router={router} />
              ))}
            </div>
          </div>
        </section>

        {/* Mock Tests Section */}
        <section id="thi-thu" className="py-20 px-4 bg-white dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/50 rounded-full px-4 py-2 mb-4">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Thi thử</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">Đề thi thử TOEIC</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400">Làm quen với cấu trúc đề thi thật</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {mockTests.map((test, idx) => (
                <MockTestCard key={idx} test={test} idx={idx} router={router} />
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
              className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 shadow-2xl"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Sẵn sàng chinh phục TOEIC?
              </h2>
              <p className="text-blue-100 mb-8 text-lg">
                Đăng ký ngay hôm nay để nhận lộ trình học miễn phí và ưu đãi đặc biệt
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-xl transition-all transform hover:scale-105"
              >
                Đăng ký miễn phí
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-blue-100 text-sm mt-4">
                Không cần thẻ tín dụng • Hủy bất kỳ lúc nào
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative w-40 h-20">
                  <img 
                    src="/icon/icon_website.svg"
                    alt="ToeicMaster Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xl font-bold">TOEIC MASTER</span>
              </div>
              <p className="text-slate-400 text-sm">
                Nền tảng luyện thi TOEIC với AI và công nghệ Blockchain
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Khóa học</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/student/reading" className="hover:text-white transition">Luyện đọc TOEIC</Link></li>
                <li><Link href="/student/writing" className="hover:text-white transition">Luyện viết TOEIC</Link></li>
                <li><Link href="#" className="hover:text-white transition">Luyện nghe (Sắp ra mắt)</Link></li>
                <li><Link href="#" className="hover:text-white transition">Luyện nói (Sắp ra mắt)</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-white transition">Trung tâm trợ giúp</Link></li>
                <li><Link href="#" className="hover:text-white transition">Liên hệ</Link></li>
                <li><Link href="#" className="hover:text-white transition">Điều khoản sử dụng</Link></li>
                <li><Link href="#" className="hover:text-white transition">Chính sách bảo mật</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kết nối</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>Facebook: @educhain.toeic</li>
                <li>Email: support@educhain.com</li>
                <li>Hotline: 1900 1234</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            © 2024 EduChain. Tất cả các quyền được bảo lưu.
          </div>
        </div>
      </footer>
    </div>
  );
}