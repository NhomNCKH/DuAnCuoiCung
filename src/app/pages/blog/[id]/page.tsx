// app/blog/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Tag,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Mock data - trong thực tế sẽ fetch từ API
const getPostById = (id: string) => {
  const posts = {
    "1": {
      id: "1",
      title: "Cách chinh phục TOEIC 900+ trong 3 tháng",
      content: `
        <p>Chinh phục TOEIC 900+ trong 3 tháng là mục tiêu đầy tham vọng nhưng hoàn toàn có thể đạt được nếu bạn có phương pháp học đúng đắn và sự kiên trì. Bài viết này sẽ chia sẻ lộ trình chi tiết từ A đến Z giúp bạn đạt được mục tiêu này.</p>
        
        <h2>1. Đánh giá trình độ hiện tại</h2>
        <p>Trước khi bắt đầu, bạn cần xác định trình độ hiện tại của mình. Hãy làm một bài test TOEIC để biết mình đang ở đâu. EduChain cung cấp bài test miễn phí với đánh giá chi tiết từng kỹ năng.</p>
        
        <h2>2. Xây dựng lộ trình học</h2>
        <p>Dựa trên kết quả test, bạn sẽ có lộ trình học được cá nhân hóa. Lộ trình thường bao gồm:</p>
        <ul>
          <li>Tuần 1-4: Củng cố ngữ pháp và từ vựng cơ bản</li>
          <li>Tuần 5-8: Luyện chuyên sâu từng Part</li>
          <li>Tuần 9-12: Làm đề thi thử và phân tích lỗi sai</li>
        </ul>
        
        <h2>3. Phương pháp học hiệu quả</h2>
        <p>Sử dụng công nghệ AI để luyện tập mỗi ngày. EduChain cung cấp:</p>
        <ul>
          <li>AI chấm điểm và phân tích lỗi sai chi tiết</li>
          <li>Gợi ý từ vựng theo ngữ cảnh</li>
          <li>Lộ trình học được điều chỉnh theo tiến độ</li>
        </ul>
        
        <h2>4. Theo dõi tiến độ</h2>
        <p>Ghi lại kết quả mỗi tuần để thấy sự tiến bộ. Điều này sẽ tạo động lực rất lớn cho bạn. Nhiều học viên của EduChain đã tăng 200-300 điểm chỉ sau 2 tháng.</p>
        
        <h2>Kết luận</h2>
        <p>Với lộ trình đúng đắn và sự kiên trì, TOEIC 900+ không còn là giấc mơ xa vời. Hãy bắt đầu ngay hôm nay!</p>
      `,
      coverImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200",
      author: {
        name: "Nguyễn Thị Minh Anh",
        avatar: "https://ui-avatars.com/api/?name=Minh+Anh&background=2563eb&color=fff",
        role: "Chuyên gia TOEIC",
        bio: "Với hơn 10 năm kinh nghiệm giảng dạy TOEIC, tôi đã giúp hàng ngàn học viên đạt được mục tiêu của mình.",
      },
      publishedAt: "2025-03-20",
      readTime: 8,
      views: 1234,
      likes: 89,
      comments: 23,
      tags: ["TOEIC", "Lộ trình học", "Mẹo thi"],
      category: "Lộ trình học",
    },
    // Thêm các bài viết khác tương tự...
  };
  return posts[id as keyof typeof posts];
};

export default function BlogPostPage() {
  const { id } = useParams();
  const router = useRouter();
  const post = getPostById(id as string);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Không tìm thấy bài viết</h1>
          <Link href="/blog" className="text-blue-600 hover:underline">
            Quay lại trang blog
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="absolute inset-0 bg-black/30" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full">
                {post.category}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80">
              <div className="flex items-center gap-2">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full border-2 border-white"
                />
                <div>
                  <p className="font-medium text-white">{post.author.name}</p>
                  <p className="text-sm text-white/70">{post.author.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{formatDate(post.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{post.readTime} phút đọc</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span className="text-sm">{post.views} lượt xem</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-96 object-cover"
              />
              <div className="p-8">
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-100">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?tag=${tag}`}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <Tag className="w-3 h-3" />
                      #{tag}
                    </Link>
                  ))}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-4 mt-6 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => setLiked(!liked)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      liked ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${liked ? "fill-red-500" : ""}`} />
                    <span>{liked ? post.likes + 1 : post.likes}</span>
                  </button>
                  
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                    <MessageSquare className="w-5 h-5" />
                    <span>{post.comments}</span>
                  </button>
                  
                  <button
                    onClick={() => setSaved(!saved)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      saved ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Bookmark className={`w-5 h-5 ${saved ? "fill-blue-500" : ""}`} />
                    <span>{saved ? "Đã lưu" : "Lưu bài"}</span>
                  </button>
                  
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                      <Share2 className="w-5 h-5" />
                      <span>Chia sẻ</span>
                    </button>
                    <div className="absolute bottom-full left-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-white rounded-xl shadow-lg p-2 flex gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-blue-600">
                        <Facebook className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-blue-400">
                        <Twitter className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-blue-700">
                        <Linkedin className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Author Card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-20 h-20 rounded-full mx-auto mb-3"
              />
              <h3 className="font-bold text-gray-800">{post.author.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{post.author.role}</p>
              <p className="text-sm text-gray-600">{post.author.bio}</p>
            </div>

            {/* Related Posts */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4">Bài viết liên quan</h3>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Link
                    key={i}
                    href="#"
                    className="flex gap-3 group hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={`https://images.unsplash.com/photo-${1500000000000 + i}?w=100`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-800 group-hover:text-blue-600 line-clamp-2">
                        Bài viết liên quan số {i}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">15 phút đọc</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-center text-white">
              <h3 className="font-bold mb-2">Nhận bài viết mới</h3>
              <p className="text-sm text-blue-100 mb-4">
                Đăng ký để nhận bài viết hay nhất mỗi tuần
              </p>
              <input
                type="email"
                placeholder="Email của bạn"
                className="w-full px-3 py-2 rounded-lg text-gray-800 mb-2 focus:outline-none"
              />
              <button className="w-full py-2 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-lg transition-all">
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
