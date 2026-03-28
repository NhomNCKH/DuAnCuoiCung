// app/student/writing/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";

export default function WritingPage() {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const writingParts = [
    {
      id: "part1",
      name: "Part 1: Write a sentence based on a picture",
      description: "Viết câu mô tả hình ảnh với từ gợi ý",
      questions: 5,
      time: "15 phút",
      difficulty: "Dễ",
      progress: 80,
      completed: 4,
      total: 5,
      icon: FileText,
      color: "from-orange-500 to-red-500",
    },
    {
      id: "part2",
      name: "Part 2: Respond to a written request",
      description: "Trả lời email yêu cầu thông tin",
      questions: 2,
      time: "20 phút",
      difficulty: "Trung bình",
      progress: 50,
      completed: 1,
      total: 2,
      icon: Mail,
      color: "from-pink-500 to-rose-500",
    },
    {
      id: "part3",
      name: "Part 3: Write an opinion essay",
      description: "Viết bài luận bày tỏ quan điểm về một vấn đề",
      questions: 1,
      time: "30 phút",
      difficulty: "Khó",
      progress: 0,
      completed: 0,
      total: 1,
      icon: MessageSquare,
      color: "from-purple-500 to-indigo-500",
    },
  ];

  const recentEssays = [
    {
      title: "Describe a picture - Office scene",
      score: 85,
      feedback: "Tốt, nhưng cần cải thiện ngữ pháp",
      date: "3 ngày trước",
    },
    {
      title: "Email response - Business inquiry",
      score: 78,
      feedback: "Cấu trúc email tốt, từ vựng phong phú",
      date: "1 tuần trước",
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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <PenTool className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Luyện viết TOEIC</h1>
        </div>
        <p className="text-gray-600">
          Phát triển kỹ năng viết với AI chấm điểm và gợi ý cải thiện
        </p>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">8</div>
          <div className="text-sm text-gray-600">Tổng số bài viết</div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">5</div>
          <div className="text-sm text-gray-600">Đã hoàn thành</div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">62%</div>
          <div className="text-sm text-gray-600">Tiến độ chung</div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">81.5</div>
          <div className="text-sm text-gray-600">Điểm trung bình</div>
        </motion.div>
      </motion.div>

      {/* Writing Parts */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4 mb-8"
      >
        <h2 className="text-lg font-bold text-gray-800 mb-4">Các phần thi viết</h2>
        {writingParts.map((part) => (
          <motion.div
            key={part.id}
            variants={item}
            className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedPart(part.id === selectedPart ? null : part.id)}
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 bg-gradient-to-r ${part.color} rounded-xl flex items-center justify-center`}>
                    <part.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{part.name}</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">{part.description}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{part.time}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Star className="w-4 h-4" />
                    <span>{part.questions} câu hỏi</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <TrendingUp className="w-4 h-4" />
                    <span>{part.difficulty}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">{part.progress}%</div>
                <div className="text-xs text-gray-500">Tiến độ</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${part.color} rounded-full transition-all duration-500`}
                  style={{ width: `${part.progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Đã hoàn thành: {part.completed}/{part.total}</span>
                <span>Còn lại: {part.total - part.completed}</span>
              </div>
            </div>

            {/* Expandable Content */}
            {selectedPart === part.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-gray-100"
              >
                <h4 className="font-medium text-gray-800 mb-3">Bài tập trong phần</h4>
                <div className="space-y-2">
                  {[1, 2, 3].map((lesson) => (
                    <Link
                      key={lesson}
                      href={`/student/writing/${part.id}/lesson-${lesson}`}
                      className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          {lesson <= part.completed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Play className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {part.id === "part1" && `Bài tập ${lesson}: Mô tả hình ảnh`}
                            {part.id === "part2" && `Bài tập ${lesson}: Email phản hồi`}
                            {part.id === "part3" && `Bài tập ${lesson}: Bài luận quan điểm`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {part.id === "part1" && "5 câu • 15 phút"}
                            {part.id === "part2" && "1 email • 20 phút"}
                            {part.id === "part3" && "1 bài luận • 30 phút"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-emerald-500" />
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* AI Writing Assistant */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 mb-8 border border-emerald-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-2">AI Writing Assistant</h3>
            <p className="text-gray-600 text-sm mb-3">
              Nhận gợi ý cải thiện bài viết, kiểm tra ngữ pháp và từ vựng với AI
            </p>
            <button className="px-4 py-2 bg-white text-emerald-600 rounded-lg font-medium hover:shadow-md transition-shadow">
              Thử ngay
            </button>
          </div>
        </div>
      </motion.div>

      {/* Recent Essays */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-500" />
            Bài viết gần đây
          </h2>
          <Link href="/student/writing/history" className="text-emerald-600 text-sm hover:underline">
            Xem tất cả
          </Link>
        </div>
        <div className="space-y-4">
          {recentEssays.map((essay, idx) => (
            <div key={idx} className="p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-800">{essay.title}</p>
                <div className="text-lg font-bold text-emerald-600">{essay.score}%</div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{essay.feedback}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{essay.date}</span>
                <button className="text-emerald-600 text-sm hover:underline">
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}