"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ImageSlider from "@/components/User/ImageSlider";
import Footer from "@/components/User/Footer";
import {
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  Calendar,
  Target,
  Sparkles,
  Brain,
  Zap,
  Star,
  Eye,
  BarChart3,
  Users,
  MessageSquare,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  PartyPopper,
  Gift,
  Rocket,
} from "lucide-react";

// Component Particle (hạt pháo hoa)
const Particle = ({ x, y, color, onComplete }: { x: number; y: number; color: string; onComplete: () => void }) => {
  const angle = Math.random() * Math.PI * 2;
  const velocity = 100 + Math.random() * 150;
  const vx = Math.cos(angle) * velocity;
  const vy = Math.sin(angle) * velocity;

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      animate={{ 
        opacity: 0, 
        scale: 0,
        x: vx,
        y: vy
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="absolute pointer-events-none w-2 h-2 rounded-full"
      style={{ left: x, top: y, backgroundColor: color }}
    />
  );
};

// Component Firework (pháo hoa)
const Firework = ({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) => {
  const colors = ["#ef4444", "#f59e0b", "#eab308", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];
  const particleCount = 30;

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y }}>
      {[...Array(particleCount)].map((_, i) => (
        <Particle
          key={i}
          x={0}
          y={0}
          color={colors[Math.floor(Math.random() * colors.length)]}
          onComplete={() => {}}
        />
      ))}
    </div>
  );
};

// Component Confetti
const Confetti = ({ onComplete }: { onComplete: () => void }) => {
  const confettiCount = 80;
  const colors = ["#ef4444", "#f59e0b", "#eab308", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(confettiCount)].map((_, i) => {
        const startX = Math.random() * window.innerWidth;
        const startY = -50;
        const endX = (Math.random() - 0.5) * 400;
        const endY = window.innerHeight + 100;
        const rotation = Math.random() * 360;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return (
          <motion.div
            key={i}
            initial={{ 
              opacity: 1,
              x: startX,
              y: startY,
              rotate: 0,
            }}
            animate={{ 
              opacity: 0,
              x: startX + endX,
              y: endY,
              rotate: rotation * 2,
            }}
            transition={{ duration: 1.5, ease: "easeOut", delay: Math.random() * 0.5 }}
            className="absolute w-3 h-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
};

// Component Floating Star
const FloatingStar = ({ delay, x, y }: { delay: number; x: string; y: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: [0, -50, -100] }}
      transition={{ duration: 2, delay, repeat: Infinity, repeatDelay: 3 }}
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
    >
      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
    </motion.div>
  );
};

interface MockTest {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: number;
  level: "Easy" | "Medium" | "Hard";
  category: string;
  attempts: number;
  rating: number;
  imageUrl: string;
}

interface RecentActivity {
  id: string;
  type: "reading" | "writing" | "speaking" | "mock-test";
  title: string;
  timestamp: string;
  score?: number;
  duration: string;
}

export default function StudentDashboard() {
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFireworks, setShowFireworks] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [fireworks, setFireworks] = useState<{ id: number; x: number; y: number }[]>([]);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const testsPerPage = 12;

  const greetings = [
    "Chào mừng bạn quay trở lại! 🎉",
    "Học tập chăm chỉ nào! 💪",
    "Một ngày mới tràn đầy năng lượng! ⚡",
    "Cùng chinh phục mục tiêu hôm nay! 🎯",
  ];


  useEffect(() => {
    // practice test
    const mockTestsData: MockTest[] = [
      {
        id: "1",
        title: "IELTS Reading Practice Test 1",
        description: "Bài thi đọc IELTS với chủ đề khoa học và công nghệ",
        duration: 60,
        questions: 40,
        level: "Medium",
        category: "IELTS",
        attempts: 1234,
        rating: 4.8,
        imageUrl: "/images/ielts-reading.jpg",
      },
      {
        id: "2",
        title: "TOEIC Listening Test",
        description: "Luyện nghe TOEIC với các tình huống thực tế",
        duration: 45,
        questions: 100,
        level: "Easy",
        category: "TOEIC",
        attempts: 2345,
        rating: 4.6,
        imageUrl: "/images/toeic-listening.jpg",
      },
      {
        id: "3",
        title: "VSTEP Writing Practice",
        description: "Luyện viết VSTEP với đề thi mới nhất",
        duration: 60,
        questions: 2,
        level: "Hard",
        category: "VSTEP",
        attempts: 567,
        rating: 4.5,
        imageUrl: "/images/vstep-writing.jpg",
      },
      {
        id: "4",
        title: "IELTS Speaking Simulation",
        description: "Phỏng vấn speaking với AI",
        duration: 15,
        questions: 3,
        level: "Medium",
        category: "IELTS",
        attempts: 890,
        rating: 4.9,
        imageUrl: "/images/ielts-speaking.jpg",
      },
      {
        id: "5",
        title: "TOEIC Reading Test",
        description: "Bài đọc TOEIC với 100 câu hỏi",
        duration: 75,
        questions: 100,
        level: "Medium",
        category: "TOEIC",
        attempts: 1567,
        rating: 4.7,
        imageUrl: "/images/toeic-reading.jpg",
      },
      {
        id: "6",
        title: "VSTEP Listening Test",
        description: "Luyện nghe VSTEP format mới",
        duration: 35,
        questions: 35,
        level: "Easy",
        category: "VSTEP",
        attempts: 432,
        rating: 4.4,
        imageUrl: "/images/vstep-listening.jpg",
      },
      {
        id: "7",
        title: "IELTS Academic Writing",
        description: "Task 1 và Task 2 IELTS Academic",
        duration: 60,
        questions: 2,
        level: "Hard",
        category: "IELTS",
        attempts: 987,
        rating: 4.6,
        imageUrl: "/images/ielts-writing.jpg",
      },
      {
        id: "8",
        title: "TOEIC Full Test",
        description: "Đề thi TOEIC đầy đủ 200 câu",
        duration: 120,
        questions: 200,
        level: "Hard",
        category: "TOEIC",
        attempts: 654,
        rating: 4.8,
        imageUrl: "/images/toeic-full.jpg",
      },
    ];

    // Recent activities data
    const recentData: RecentActivity[] = [
      {
        id: "1",
        type: "reading",
        title: "IELTS Reading - Passage 3",
        timestamp: "2 giờ trước",
        score: 85,
        duration: "45 phút",
      },
      {
        id: "2",
        type: "speaking",
        title: "AI Speaking Interview - Part 2",
        timestamp: "Hôm qua",
        score: 78,
        duration: "15 phút",
      },
      {
        id: "3",
        type: "mock-test",
        title: "TOEIC Full Test",
        timestamp: "Hôm qua",
        score: 720,
        duration: "120 phút",
      },
      {
        id: "4",
        type: "writing",
        title: "IELTS Writing Task 2",
        timestamp: "2 ngày trước",
        score: 6.5,
        duration: "40 phút",
      },
    ];

    // Suggestions data
    const suggestionsData = [
      {
        id: "1",
        title: "Luyện tập từ vựng chủ đề Environment",
        type: "reading",
        difficulty: "Medium",
        estimatedTime: "20 phút",
      },
      {
        id: "2",
        title: "Cải thiện kỹ năng Speaking Part 2",
        type: "speaking",
        difficulty: "Hard",
        estimatedTime: "15 phút",
      },
      {
        id: "3",
        title: "Làm bài test TOEIC Listening",
        type: "listening",
        difficulty: "Easy",
        estimatedTime: "30 phút",
      },
    ];

    setMockTests(mockTestsData);
    setRecentActivities(recentData);
    setSuggestions(suggestionsData);
     // Kích hoạt hiệu ứng chào mừng
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);

    // Tạo pháo hoa
    const interval = setInterval(() => {
      if (welcomeRef.current) {
        const rect = welcomeRef.current.getBoundingClientRect();
        const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 200;
        const y = rect.top + 50 + Math.random() * 100;
        setFireworks(prev => [...prev, { id: Date.now(), x, y }]);
      }
    }, 800);

    // Đổi greeting mỗi 5 giây
    const greetingInterval = setInterval(() => {
      setGreetingIndex(prev => (prev + 1) % greetings.length);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(greetingInterval);
    };
  }, []);

  useEffect(() => {
    const timers = fireworks.map(fw => {
      return setTimeout(() => {
        setFireworks(prev => prev.filter(f => f.id !== fw.id));
      }, 1000);
    });
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [fireworks]);

  // Get current tests for pagination
  const indexOfLastTest = currentPage * testsPerPage;
  const indexOfFirstTest = indexOfLastTest - testsPerPage;
  const currentTests = mockTests.slice(indexOfFirstTest, indexOfLastTest);
  const totalPages = Math.ceil(mockTests.length / testsPerPage);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Easy":
        return "bg-emerald-100 text-emerald-700";
      case "Medium":
        return "bg-amber-100 text-amber-700";
      case "Hard":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "reading":
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case "writing":
        return <Brain className="w-4 h-4 text-purple-500" />;
      case "speaking":
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      default:
        return <Award className="w-4 h-4 text-amber-500" />;
    }
  };

  const slides = [
    {
      id: 1,
      image: "/slides/slides1.jpg",
      title: "Luyện thi IELTS cùng AI",
      description:
        "Công nghệ AI chấm điểm Speaking và Writing chính xác đến 95%",
      link: "/student/practicetest",
    },
    {
      id: 2,
      image: "/slides/slides2.jpg",
      title: "Kho đề thi TOEIC phong phú",
      description: "Hơn 1000 đề thi TOEIC mới nhất với đáp án chi tiết",
      link: "/student/practicetest",
    },
    {
      id: 3,
      image: "/slides/slides3.jpg",
      title: "Chứng chỉ Blockchain",
      description:
        "Nhận chứng chỉ có giá trị toàn cầu sau khi hoàn thành khóa học",
      link: "/student/dashboard",
    },
    {
      id: 4,
      image: "/slides/slides4.jpg",
      title: "Thi thử không giới hạn",
      description: "Luyện tập không giới hạn với bộ đề thi mới nhất",
      link: "/student/practicetest",
    },
  ];

return (
     <div className="min-h-screen bg-gray-50 relative overflow-x-hidden">
      {/* Confetti Effect */}
      <AnimatePresence>
        {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      </AnimatePresence>

      {/* Fireworks Effects */}
      <AnimatePresence>
        {fireworks.map(fw => (
          <Firework key={fw.id} x={fw.x} y={fw.y} onComplete={() => {}} />
        ))}
      </AnimatePresence>

      {/* Floating Stars */}
      <FloatingStar delay={0} x="10%" y="20%" />
      <FloatingStar delay={1.5} x="85%" y="15%" />
      <FloatingStar delay={3} x="20%" y="80%" />
      <FloatingStar delay={4.5} x="75%" y="70%" />
      <FloatingStar delay={2} x="50%" y="40%" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section với Animation */}
        <motion.div
          ref={welcomeRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          className="mb-8 relative"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 rounded-3xl -z-10 bg-blue-50" />

          {/* Welcome Badge với Animation */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-medium mb-4 shadow-lg"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
            <span>✨ Chào mừng bạn quay trở lại ✨</span>
          </motion.div>

          {/* Title với Animation */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h1 className="text-5xl lg:text-6xl font-bold mb-4">
              <span className="text-slate-900">
                Chào mừng trở lại!
              </span>
              <motion.span
                animate={{ rotate: [0, 20, -20, 20, 0] }}
                transition={{ duration: 0.5, delay: 0.8, repeat: 2 }}
                className="inline-block ml-2"
              >
                👋
              </motion.span>
            </h1>
          </motion.div>

          {/* Greeting với Animation thay đổi */}
          <AnimatePresence mode="wait">
            <motion.p
              key={greetingIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-slate-600 text-lg flex items-center gap-2"
            >
              <PartyPopper className="w-5 h-5 text-orange-500" />
              {greetings[greetingIndex]}
            </motion.p>
          </AnimatePresence>

          {/* Decorative Elements */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-5 -right-5 opacity-20"
          >
            <Rocket className="w-16 h-16 text-blue-500" />
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-0 left-10 opacity-20"
          >
            <Gift className="w-12 h-12 text-purple-500" />
          </motion.div>
        </motion.div>

        {/* Poster Image với Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-8 relative w-full aspect-[20/8] rounded-2xl overflow-hidden shadow-xl group"
        >
          <img
            src="/imgUserLayout/posterlayout.jpg"
            alt="Dashboard Illustration"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>

        {/* Stats Cards - Cập nhật màu gradient */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: "Bài đã làm", 
              value: "24", 
              icon: BookOpen, 
              gradient: "from-blue-500 to-blue-600",
              bgGradient: "from-blue-50 to-blue-100",
              tone: "blue"
            },
            { 
              label: "Giờ học", 
              value: "48h", 
              icon: Clock, 
              gradient: "from-emerald-500 to-emerald-600",
              bgGradient: "from-emerald-50 to-emerald-100",
              tone: "emerald"
            },
            {
              label: "Điểm TB",
              value: "85%",
              icon: TrendingUp,
              gradient: "from-amber-500 to-amber-600",
              bgGradient: "from-amber-50 to-amber-100",
              tone: "amber"
            },
            { 
              label: "Chứng chỉ", 
              value: "2", 
              icon: Award, 
              gradient: "from-rose-500 to-rose-600",
              bgGradient: "from-rose-50 to-rose-100",
              tone: "rose"
            },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-sm mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Mock Tests */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Đề thi thử mới nhất
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Cập nhật các đề thi mới nhất
                </p>
              </div>
              <Link
                href="/student/practicetest"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 group"
              >
                Xem tất cả
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Mock Tests Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentTests.map((test, idx) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 hover:border-blue-100"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getLevelColor(test.level)}`}>
                        {test.level}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium text-slate-600">{test.rating}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {test.title}
                    </h3>
                    <p className="text-slate-500 text-sm mb-3 line-clamp-2">{test.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{test.duration} phút</span>
                      <span className="flex items-center gap-1"><Brain className="w-3 h-3" />{test.questions} câu</span>
                    </div>
                    <button className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg">
                      Làm bài ngay
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                {[...Array(totalPages)].map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentPage(idx + 1)} className={`px-4 py-2 rounded-xl font-medium transition-all ${currentPage === idx + 1 ? "bg-blue-600 text-white shadow-md" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {idx + 1}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
                  <ChevronRightIcon className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Recent Activities & Suggestions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Hoạt động gần đây</h3>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 group">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{activity.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400">{activity.timestamp}</span>
                        {activity.score && <span className="text-xs font-medium text-emerald-600">Điểm: {activity.score}</span>}
                        <span className="text-xs text-slate-400">{activity.duration}</span>
                      </div>
                    </div>
                    <button className="text-blue-600 text-xs hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">Xem lại</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900">Gợi ý học tập</h3>
              </div>
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="bg-white rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group border border-white hover:border-blue-100">
                    <p className="text-sm font-medium text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{suggestion.title}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${suggestion.difficulty === "Easy" ? "bg-emerald-100 text-emerald-700" : suggestion.difficulty === "Medium" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                          {suggestion.difficulty}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{suggestion.estimatedTime}</span>
                      </div>
                      <button className="text-blue-600 text-sm font-medium hover:text-blue-700">Bắt đầu →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Tiến độ tuần này</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2"><span className="text-slate-600">Mục tiêu tuần</span><span className="font-medium text-slate-900">8/12 giờ</span></div>
                  <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: "66%" }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2"><span className="text-slate-600">Bài tập đã hoàn thành</span><span className="font-medium text-slate-900">15/20</span></div>
                  <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: "75%" }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Slider */}
        <div className="my-12">
          <ImageSlider slides={slides} autoPlay={true} interval={5000} />
        </div>

        
      </div>
    </div>
  );
}
