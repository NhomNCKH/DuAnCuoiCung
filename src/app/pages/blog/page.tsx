// app/blog/page.tsx
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  User,
  Clock,
  Tag,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  Zap,
  Target,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Types
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  publishedAt: string;
  readTime: number;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  category: string;
  featured?: boolean;
}

// Mock data
const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Cách chinh phục TOEIC 900+ trong 3 tháng",
    excerpt: "Lộ trình học TOEIC chi tiết từ cơ bản đến nâng cao, giúp bạn đạt mục tiêu 900+ chỉ trong 3 tháng với phương pháp học thông minh.",
    content: "",
    coverImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
    author: {
      name: "Nguyễn Thị Minh Anh",
      avatar: "https://ui-avatars.com/api/?name=Minh+Anh&background=2563eb&color=fff",
      role: "Chuyên gia TOEIC",
    },
    publishedAt: "2025-03-20",
    readTime: 8,
    views: 1234,
    likes: 89,
    comments: 23,
    tags: ["TOEIC", "Lộ trình học", "Mẹo thi"],
    category: "Lộ trình học",
    featured: true,
  },
  {
    id: "2",
    title: "10 chiến lược làm bài Reading Part 7 hiệu quả",
    excerpt: "Part 7 luôn là thử thách lớn nhất trong bài thi TOEIC. Bài viết này sẽ chia sẻ 10 chiến lược giúp bạn làm bài nhanh và chính xác hơn.",
    content: "",
    coverImage: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800",
    author: {
      name: "Trần Văn Hoàng",
      avatar: "https://ui-avatars.com/api/?name=Van+Hoang&background=2563eb&color=fff",
      role: "Giảng viên TOEIC",
    },
    publishedAt: "2025-03-18",
    readTime: 6,
    views: 892,
    likes: 56,
    comments: 12,
    tags: ["TOEIC", "Reading", "Chiến lược"],
    category: "Mẹo thi",
  },
  {
    id: "3",
    title: "AI và tương lai của việc học ngoại ngữ",
    excerpt: "Công nghệ AI đang thay đổi cách chúng ta học ngoại ngữ như thế nào? Khám phá những xu hướng mới nhất và ứng dụng thực tế.",
    content: "",
    coverImage: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800",
    author: {
      name: "Lê Minh Tuấn",
      avatar: "https://ui-avatars.com/api/?name=Minh+Tuan&background=2563eb&color=fff",
      role: "Chuyên gia AI",
    },
    publishedAt: "2025-03-15",
    readTime: 5,
    views: 2156,
    likes: 178,
    comments: 45,
    tags: ["AI", "Công nghệ", "Tương lai"],
    category: "Công nghệ",
    featured: true,
  },
  {
    id: "4",
    title: "Bí quyết viết email tiếng Anh chuyên nghiệp",
    excerpt: "Email là kỹ năng quan trọng trong môi trường công sở. Học cách viết email ấn tượng và chuyên nghiệp với các mẫu câu và cấu trúc phổ biến.",
    content: "",
    coverImage: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800",
    author: {
      name: "Phạm Thị Hương",
      avatar: "https://ui-avatars.com/api/?name=Thi+Huong&background=2563eb&color=fff",
      role: "Chuyên gia viết",
    },
    publishedAt: "2025-03-12",
    readTime: 7,
    views: 567,
    likes: 34,
    comments: 8,
    tags: ["Writing", "Email", "Kỹ năng mềm"],
    category: "Kỹ năng viết",
  },
  {
    id: "5",
    title: "Từ vựng TOEIC theo chủ đề: Business",
    excerpt: "Tổng hợp từ vựng TOEIC chủ đề Business kèm ví dụ và bài tập thực hành, giúp bạn ghi nhớ nhanh và áp dụng hiệu quả.",
    content: "",
    coverImage: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800",
    author: {
      name: "Nguyễn Thị Minh Anh",
      avatar: "https://ui-avatars.com/api/?name=Minh+Anh&background=2563eb&color=fff",
      role: "Chuyên gia TOEIC",
    },
    publishedAt: "2025-03-10",
    readTime: 4,
    views: 2341,
    likes: 145,
    comments: 32,
    tags: ["TOEIC", "Từ vựng", "Business"],
    category: "Từ vựng",
  },
  {
    id: "6",
    title: "Phân tích đề thi TOEIC tháng 3/2025",
    excerpt: "Cập nhật cấu trúc đề thi TOEIC mới nhất, phân tích độ khó và xu hướng ra đề để bạn có sự chuẩn bị tốt nhất.",
    content: "",
    coverImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
    author: {
      name: "Trần Văn Hoàng",
      avatar: "https://ui-avatars.com/api/?name=Van+Hoang&background=2563eb&color=fff",
      role: "Giảng viên TOEIC",
    },
    publishedAt: "2025-03-08",
    readTime: 10,
    views: 3456,
    likes: 267,
    comments: 89,
    tags: ["TOEIC", "Phân tích đề", "Cập nhật"],
    category: "Phân tích",
    featured: true,
  },
];

const categories = [
  { name: "Tất cả", value: "all", icon: BookOpen },
  { name: "Lộ trình học", value: "Lộ trình học", icon: Target },
  { name: "Mẹo thi", value: "Mẹo thi", icon: Zap },
  { name: "Từ vựng", value: "Từ vựng", icon: Sparkles },
  { name: "Kỹ năng viết", value: "Kỹ năng viết", icon: Award },
  { name: "Công nghệ", value: "Công nghệ", icon: TrendingUp },
  { name: "Phân tích", value: "Phân tích", icon: Eye },
];

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const postsPerPage = 6;

  const filteredPosts = useMemo(() => {
    let filtered = blogPosts;
    
    if (searchTerm) {
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter((post) => post.category === selectedCategory);
    }
    
    return filtered;
  }, [searchTerm, selectedCategory]);

  const featuredPosts = blogPosts.filter((post) => post.featured);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-blue-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <BookOpen className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Blog</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Kiến thức & Cảm hứng
              <span className="block text-white/90">
                cho hành trình chinh phục TOEIC
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Cập nhật những bài viết mới nhất về lộ trình học, mẹo thi, từ vựng và xu hướng công nghệ trong giáo dục.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm bài viết..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors md:hidden"
            >
              <Filter className="w-5 h-5" />
              <span>Lọc theo danh mục</span>
            </button>
          </div>

          {/* Category Filters - Desktop */}
          <div className={`mt-4 ${showFilters ? "block" : "hidden md:block"}`}>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.value;
                return (
                  <button
                    key={category.value}
                    onClick={() => {
                      setSelectedCategory(category.value);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && searchTerm === "" && selectedCategory === "all" && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Bài viết nổi bật</h2>
                <p className="text-gray-500">Những nội dung được quan tâm nhất</p>
              </div>
              <Sparkles className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              {featuredPosts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/35" />
                    <div className="absolute bottom-4 left-4">
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                      <Link href={`/blog/${post.id}`} className="hover:text-blue-600 transition-colors">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-gray-500 mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{post.author.name}</p>
                          <p className="text-xs text-gray-400">{post.author.role}</p>
                        </div>
                      </div>
                      <Link
                        href={`/blog/${post.id}`}
                        className="flex items-center gap-1 text-blue-600 font-medium hover:gap-2 transition-all"
                      >
                        Đọc tiếp
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedCategory === "all" ? "Tất cả bài viết" : `Bài viết về ${selectedCategory}`}
              </h2>
              <p className="text-gray-500">
                {filteredPosts.length} bài viết
                {searchTerm && ` phù hợp với "${searchTerm}"`}
              </p>
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Không tìm thấy bài viết</h3>
              <p className="text-gray-500">Hãy thử tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {paginatedPosts.map((post) => (
                <motion.article
                  key={post.id}
                  variants={item}
                  whileHover={{ y: -8 }}
                  className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all"
                >
                  <Link href={`/blog/${post.id}`} className="block relative h-48 overflow-hidden">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-lg">
                        {post.category}
                      </span>
                    </div>
                  </Link>
                  
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{post.readTime} phút đọc</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                      <Link href={`/blog/${post.id}`} className="hover:text-blue-600 transition-colors">
                        {post.title}
                      </Link>
                    </h3>
                    
                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">{post.excerpt}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-sm font-medium text-gray-700 line-clamp-1">
                          {post.author.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-400 text-xs">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{post.views}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{post.comments}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-white">
              Đừng bỏ lỡ bài viết mới
            </h2>
            <p className="text-blue-100 text-lg">
              Đăng ký nhận bản tin để cập nhật những bài viết hay nhất mỗi tuần
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <input
                type="email"
                placeholder="Email của bạn"
                className="px-5 py-3 rounded-xl w-80 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-lg transition-all">
                Đăng ký ngay
              </button>
            </div>
            <p className="text-blue-200 text-sm">
              Chúng tôi không spam! Bạn có thể hủy đăng ký bất cứ lúc nào.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
