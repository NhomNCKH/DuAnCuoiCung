// app/student/mock-tests/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Filter,
  Search,
  Star,
  Brain,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
  X,
  ArrowUpDown,
} from "lucide-react";

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
  dateAdded: string;
}

export default function MockTestsPage() {
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [filteredTests, setFilteredTests] = useState<MockTest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const testsPerPage = 12;

  useEffect(() => {
    // Mock data for mock tests
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
        dateAdded: "2024-03-20",
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
        dateAdded: "2024-03-19",
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
        dateAdded: "2024-03-18",
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
        dateAdded: "2024-03-17",
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
        dateAdded: "2024-03-16",
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
        dateAdded: "2024-03-15",
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
        dateAdded: "2024-03-14",
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
        dateAdded: "2024-03-13",
      },
      // Add more tests as needed
    ];

    setMockTests(mockTestsData);
  }, []);

  useEffect(() => {
    let filtered = [...mockTests];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (test) =>
          test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          test.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((test) => test.category === selectedCategory);
    }

    // Level filter
    if (selectedLevel !== "all") {
      filtered = filtered.filter((test) => test.level === selectedLevel);
    }

    // Sorting
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        break;
      case "popular":
        filtered.sort((a, b) => b.attempts - a.attempts);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "duration-asc":
        filtered.sort((a, b) => a.duration - b.duration);
        break;
      case "duration-desc":
        filtered.sort((a, b) => b.duration - a.duration);
        break;
    }

    setFilteredTests(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedLevel, sortBy, mockTests]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Easy":
        return "bg-green-100 text-green-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      case "Hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Pagination
  const indexOfLastTest = currentPage * testsPerPage;
  const indexOfFirstTest = indexOfLastTest - testsPerPage;
  const currentTests = filteredTests.slice(indexOfFirstTest, indexOfLastTest);
  const totalPages = Math.ceil(filteredTests.length / testsPerPage);

  const categories = ["all", "IELTS", "TOEIC", "VSTEP"];
  const levels = ["all", "Easy", "Medium", "Hard"];
  const sortOptions = [
    { value: "newest", label: "Mới nhất" },
    { value: "popular", label: "Phổ biến nhất" },
    { value: "rating", label: "Đánh giá cao nhất" },
    { value: "duration-asc", label: "Thời gian tăng dần" },
    { value: "duration-desc", label: "Thời gian giảm dần" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thư viện đề thi thử</h1>
          <p className="text-gray-600">
            Khám phá hàng trăm đề thi thử với đa dạng chủ đề và cấp độ
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm đề thi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Bộ lọc
              </button>
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-gray-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Danh mục
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          selectedCategory === cat
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {cat === "all" ? "Tất cả" : cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cấp độ
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {levels.map((level) => (
                      <button
                        key={level}
                        onClick={() => setSelectedLevel(level)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          selectedLevel === level
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {level === "all" ? "Tất cả" : level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sắp xếp theo
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Tìm thấy <span className="font-semibold text-gray-900">{filteredTests.length}</span> đề thi
          </p>
        </div>

        {/* Tests Grid/List View */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentTests.map((test, idx) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(test.level)}`}>
                      {test.level}
                    </span>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-xs font-medium text-gray-600">{test.rating}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                    {test.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {test.description}
                  </p>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {test.duration} phút
                    </span>
                    <span className="flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      {test.questions} câu
                    </span>
                  </div>
                  
                  <button className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all">
                    Làm bài ngay
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {currentTests.map((test, idx) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-5"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(test.level)}`}>
                        {test.level}
                      </span>
                      <span className="text-xs text-gray-500">{test.category}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{test.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{test.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {test.duration} phút
                      </span>
                      <span className="flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        {test.questions} câu
                      </span>
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-3 h-3 fill-current" />
                        {test.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        {test.attempts} lượt làm
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all whitespace-nowrap">
                      Làm bài ngay
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredTests.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy đề thi</h3>
            <p className="text-gray-500">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx + 1)}
                className={`px-3 py-1 rounded-lg ${
                  currentPage === idx + 1
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {idx + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
