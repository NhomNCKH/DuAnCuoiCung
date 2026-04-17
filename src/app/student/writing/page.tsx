// app/student/writing/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenTool,
  ChevronRight,
  Clock,
  Star,
  TrendingUp,
  Award,
  Play,
  CheckCircle,
  Sparkles,
  FileText,
  Mail,
  MessageSquare,
  Zap,
  Target,
  BarChart3,
  Calendar,
  Brain,
  Filter,
  Search,
  Layers,
  Tag,
  GraduationCap,
  Grid3x3,
  List,
  Eye,
  ThumbsUp,
  Bookmark,
  SlidersHorizontal,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function WritingPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<
    "part" | "level" | "tags" | "exam"
  >("part");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Dữ liệu bài tập viết theo Part
  const exercisesByPart = [
    {
      id: "part1-1",
      title: "Part 1: Picture Description - Set 1",
      description: "Viết câu mô tả hình ảnh với từ gợi ý",
      part: "Part 1",
      level: "Beginner",
      tags: ["Description", "Grammar", "Vocabulary"],
      duration: 15,
      questions: 5,
      difficulty: "Easy",
      rating: 4.7,
      attempts: 2345,
      image: "/images/writing/part1.jpg",
      isNew: true,
      isPopular: true,
    },
    {
      id: "part1-2",
      title: "Part 1: Picture Description - Set 2",
      description: "Luyện tập mô tả hành động và trạng thái",
      part: "Part 1",
      level: "Beginner",
      tags: ["Present Continuous", "Prepositions"],
      duration: 15,
      questions: 5,
      difficulty: "Easy",
      rating: 4.6,
      attempts: 1876,
      image: "/images/writing/part1-2.jpg",
      isNew: false,
      isPopular: false,
    },
    {
      id: "part2-1",
      title: "Part 2: Email Response - Business",
      description: "Trả lời email yêu cầu thông tin doanh nghiệp",
      part: "Part 2",
      level: "Intermediate",
      tags: ["Email", "Business", "Formal Writing"],
      duration: 20,
      questions: 2,
      difficulty: "Medium",
      rating: 4.8,
      attempts: 1567,
      image: "/images/writing/part2.jpg",
      isNew: true,
      isPopular: true,
    },
    {
      id: "part2-2",
      title: "Part 2: Email Response - Customer Service",
      description: "Phản hồi khiếu nại và yêu cầu hỗ trợ",
      part: "Part 2",
      level: "Intermediate",
      tags: ["Customer Service", "Problem Solving"],
      duration: 20,
      questions: 2,
      difficulty: "Medium",
      rating: 4.7,
      attempts: 1234,
      image: "/images/writing/part2-2.jpg",
      isNew: false,
      isPopular: true,
    },
    {
      id: "part3-1",
      title: "Part 3: Opinion Essay - Technology",
      description: "Viết bài luận về tác động của công nghệ",
      part: "Part 3",
      level: "Advanced",
      tags: ["Essay", "Argumentation", "Opinion"],
      duration: 30,
      questions: 1,
      difficulty: "Hard",
      rating: 4.9,
      attempts: 987,
      image: "/images/writing/part3.jpg",
      isNew: true,
      isPopular: true,
    },
    {
      id: "part3-2",
      title: "Part 3: Opinion Essay - Environment",
      description: "Bài luận về bảo vệ môi trường",
      part: "Part 3",
      level: "Advanced",
      tags: ["Essay", "Environment", "Solutions"],
      duration: 30,
      questions: 1,
      difficulty: "Hard",
      rating: 4.8,
      attempts: 876,
      image: "/images/writing/part3-2.jpg",
      isNew: false,
      isPopular: false,
    },
  ];

  // Dữ liệu bài tập theo Level
  const exercisesByLevel = [
    {
      level: "Beginner",
      count: 24,
      color: "from-emerald-500 to-teal-500",
      icon: "🌱",
      description: "Mô tả hình ảnh cơ bản",
    },
    {
      level: "Intermediate",
      count: 36,
      color: "from-blue-500 to-cyan-500",
      icon: "📚",
      description: "Email và văn bản ngắn",
    },
    {
      level: "Advanced",
      count: 28,
      color: "from-orange-500 to-rose-500",
      icon: "🎯",
      description: "Bài luận và phân tích",
    },
  ];

  // Dữ liệu Tags phổ biến
  const popularTags = [
    { name: "Grammar", count: 45, color: "bg-blue-100 text-blue-700" },
    { name: "Vocabulary", count: 38, color: "bg-emerald-100 text-emerald-700" },
    {
      name: "Email Writing",
      count: 32,
      color: "bg-purple-100 text-purple-700",
    },
    {
      name: "Essay Structure",
      count: 28,
      color: "bg-amber-100 text-amber-700",
    },
    { name: "Argumentation", count: 24, color: "bg-rose-100 text-rose-700" },
    {
      name: "Formal Writing",
      count: 21,
      color: "bg-indigo-100 text-indigo-700",
    },
  ];

  // Dữ liệu Exam Templates
  const examTemplates = [
    {
      id: "toeic-writing",
      name: "TOEIC Writing Full Test",
      description: "Đề thi viết TOEIC đầy đủ 3 parts",
      duration: 60,
      parts: 3,
      questions: 8,
      difficulty: "Full",
      students: 8765,
      rating: 4.8,
    },
    {
      id: "toeic-mini",
      name: "TOEIC Writing Mini Test",
      description: "Bài kiểm tra viết nhanh",
      duration: 30,
      parts: 2,
      questions: 4,
      difficulty: "Quick",
      students: 5432,
      rating: 4.6,
    },
    {
      id: "ielts-writing",
      name: "IELTS Writing Task 1 & 2",
      description: "Đề thi IELTS Writing Academic",
      duration: 60,
      parts: 2,
      questions: 2,
      difficulty: "Hard",
      students: 4321,
      rating: 4.9,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                  <PenTool className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Thư viện viết luận
                  </h1>
                  <p className="text-slate-500 text-sm">
                    Khám phá hàng trăm bài tập viết với đa dạng chủ đề và cấp độ
                  </p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm bài tập..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full md:w-80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </motion.div>

        {/* Filter Options */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex gap-2">
              {[
                { id: "part", label: "Theo Part", icon: Layers },
                { id: "level", label: "Theo Level", icon: GraduationCap },
                { id: "tags", label: "Theo Tags", icon: Tag },
                { id: "exam", label: "Exam Template", icon: FileText },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filterType === type.id
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md"
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  <type.icon className="w-4 h-4" />
                  {type.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc nâng cao
            </button>

            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-white text-slate-400 hover:bg-slate-50"
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-white text-slate-400 hover:bg-slate-50"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Độ khó
                    </label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option>Tất cả</option>
                      <option>Dễ</option>
                      <option>Trung bình</option>
                      <option>Khó</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Thời gian
                    </label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option>Tất cả</option>
                      <option>Dưới 15 phút</option>
                      <option>15-30 phút</option>
                      <option>Trên 30 phút</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sắp xếp theo
                    </label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option>Mới nhất</option>
                      <option>Phổ biến nhất</option>
                      <option>Đánh giá cao nhất</option>
                      <option>Nhiều lượt làm nhất</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content based on filter type */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filterType}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Option 1: Theo Part */}
            {filterType === "part" && (
              <>
                {/* Part Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    "Part 1: Picture Description",
                    "Part 2: Email Response",
                    "Part 3: Opinion Essay",
                  ].map((part, idx) => (
                    <motion.div
                      key={part}
                      variants={item}
                      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-12 h-12 bg-gradient-to-r ${
                            idx === 0
                              ? "from-orange-500 to-red-500"
                              : idx === 1
                                ? "from-pink-500 to-rose-500"
                                : "from-purple-500 to-indigo-500"
                          } rounded-xl flex items-center justify-center`}
                        >
                          {idx === 0 ? (
                            <FileText className="w-6 h-6 text-white" />
                          ) : idx === 1 ? (
                            <Mail className="w-6 h-6 text-white" />
                          ) : (
                            <MessageSquare className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <span className="text-2xl font-bold text-orange-600">
                          {idx === 0 ? "40" : idx === 1 ? "20" : "15"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {part}
                      </h3>
                      <p className="text-sm text-slate-500 mb-3">
                        {idx === 0 && "Mô tả hình ảnh với từ gợi ý"}
                        {idx === 1 && "Phản hồi email yêu cầu"}
                        {idx === 2 && "Bài luận bày tỏ quan điểm"}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">
                          {idx === 0 ? "24" : idx === 1 ? "18" : "12"} bài tập
                        </span>
                        <button className="text-orange-600 hover:text-orange-700 font-medium">
                          Xem tất cả →
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Exercises Grid/List */}
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {exercisesByPart.map((exercise) => (
                    <WritingExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      viewMode={viewMode}
                    />
                  ))}
                </motion.div>
              </>
            )}

            {/* Option 2: Theo Level */}
            {filterType === "level" && (
              <>
                {/* Level Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {exercisesByLevel.map((level, idx) => (
                    <motion.div
                      key={level.level}
                      variants={item}
                      className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${level.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                      />
                      <div className="relative">
                        <div className="text-3xl mb-3">{level.icon}</div>
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {level.level}
                        </h3>
                        <p className="text-sm text-slate-500 mb-2">
                          {level.description}
                        </p>
                        <p className="text-2xl font-bold text-slate-700 mb-2">
                          {level.count} bài tập
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">
                            +{level.count * 5} bài mẫu
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Level Recommendations */}
                <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Đề xuất cho bạn
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RecommendationCard
                      title="Lộ trình viết từ Beginner đến Advanced"
                      description="30 ngày chinh phục kỹ năng viết"
                      progress={45}
                      color="from-orange-500 to-rose-500"
                    />
                    <RecommendationCard
                      title="Luyện viết email chuyên nghiệp"
                      description="Cấu trúc email và từ vựng formal"
                      progress={60}
                      color="from-emerald-500 to-teal-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Option 3: Theo Tags */}
            {filterType === "tags" && (
              <>
                {/* Popular Tags Cloud */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Tags phổ biến
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {popularTags.map((tag) => (
                      <button
                        key={tag.name}
                        className={`px-4 py-2 rounded-full text-sm font-medium ${tag.color} hover:shadow-md transition-all`}
                      >
                        #{tag.name} ({tag.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exercises by Tags */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Bài tập theo tags
                  </h3>
                  <div className="space-y-4">
                    {popularTags.slice(0, 3).map((tag) => (
                      <div
                        key={tag.name}
                        className="bg-white rounded-2xl p-5 border border-slate-100"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-orange-600" />
                            <h4 className="font-semibold text-slate-900">
                              {tag.name}
                            </h4>
                          </div>
                          <span className="text-sm text-slate-500">
                            {tag.count} bài tập
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {exercisesByPart.slice(0, 2).map((ex) => (
                            <div
                              key={ex.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                            >
                              <div>
                                <p className="font-medium text-slate-800 text-sm">
                                  {ex.title}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {ex.duration} phút • {ex.questions} câu
                                </p>
                              </div>
                              <Play className="w-4 h-4 text-orange-600" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Option 4: Theo Exam Template */}
            {filterType === "exam" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {examTemplates.map((exam) => (
                    <motion.div
                      key={exam.id}
                      variants={item}
                      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all"
                    >
                      <div className="relative h-32 bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center">
                        <PenTool className="w-12 h-12 text-white/20" />
                        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-white text-xs">
                          {exam.difficulty}
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {exam.name}
                        </h3>
                        <p className="text-sm text-slate-500 mb-3">
                          {exam.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {exam.duration} phút
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {exam.questions} câu
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {exam.students}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-medium text-slate-700">
                            {exam.rating}
                          </span>
                          <button className="ml-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all">
                            Làm bài
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 text-center">
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Thi thử như thật
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Làm quen với format đề thi viết chuẩn
                  </p>
                  <button className="px-6 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-medium hover:shadow-lg transition-all">
                    Xem tất cả đề thi
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Writing Exercise Card Component
function WritingExerciseCard({
  exercise,
  viewMode,
}: {
  exercise: any;
  viewMode: "grid" | "list";
}) {
  if (viewMode === "grid") {
    return (
      <motion.div
        variants={item}
        className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all"
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex gap-2">
              {exercise.isNew && (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                  Mới
                </span>
              )}
              {exercise.isPopular && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                  Phổ biến
                </span>
              )}
            </div>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Bookmark className="w-4 h-4 text-slate-400 hover:text-orange-600" />
            </button>
          </div>

          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-1">
            {exercise.title}
          </h3>
          <p className="text-sm text-slate-500 mb-3 line-clamp-2">
            {exercise.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {exercise.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {exercise.duration} phút
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {exercise.questions} câu
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {exercise.rating}
            </span>
          </div>

          <button className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-medium hover:from-orange-600 hover:to-rose-600 transition-all">
            Làm bài ngay
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={item}
      className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-slate-900">{exercise.title}</h3>
            {exercise.isNew && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                Mới
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-2">{exercise.description}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {exercise.duration} phút
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {exercise.questions} câu
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {exercise.rating}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {exercise.attempts} lượt làm
            </span>
          </div>
        </div>
        <button className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all whitespace-nowrap">
          Làm bài ngay
        </button>
      </div>
    </motion.div>
  );
}

// Recommendation Card Component
function RecommendationCard({ title, description, progress, color }: any) {
  return (
    <div className="bg-white rounded-xl p-4 hover:shadow-md transition-all">
      <h4 className="font-medium text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 mb-3">{description}</p>
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute h-full bg-gradient-to-r ${color} rounded-full`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{progress}% hoàn thành</span>
        <button className="text-orange-600 hover:text-orange-700">
          Tiếp tục →
        </button>
      </div>
    </div>
  );
}
