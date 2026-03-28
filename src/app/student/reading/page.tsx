// app/student/reading/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  Clock,
  Star,
  TrendingUp,
  Award,
  Play,
  CheckCircle,
  Lock,
} from "lucide-react";
import Link from "next/link";

export default function ReadingPage() {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const readingParts = [
    {
      id: "part5",
      name: "Part 5: Incomplete Sentences",
      description: "Hoàn thành câu với từ vựng và ngữ pháp phù hợp",
      questions: 40,
      time: "20 phút",
      difficulty: "Trung bình",
      progress: 75,
      completed: 30,
      total: 40,
      icon: BookOpen,
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "part6",
      name: "Part 6: Text Completion",
      description: "Đọc và hoàn thành đoạn văn với 4 lựa chọn",
      questions: 16,
      time: "15 phút",
      difficulty: "Trung bình - Khó",
      progress: 45,
      completed: 7,
      total: 16,
      icon: BookOpen,
      color: "from-indigo-500 to-blue-500",
    },
    {
      id: "part7",
      name: "Part 7: Reading Comprehension",
      description: "Đọc hiểu đơn, thư, bài báo và trả lời câu hỏi",
      questions: 54,
      time: "55 phút",
      difficulty: "Khó",
      progress: 30,
      completed: 16,
      total: 54,
      icon: BookOpen,
      color: "from-purple-500 to-pink-500",
    },
  ];

  const recentTests = [
    {
      title: "Part 5 - Practice Test 1",
      score: 85,
      date: "2 ngày trước",
    },
    {
      title: "Part 6 - Text Completion",
      score: 72,
      date: "5 ngày trước",
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
          <BookOpen className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Luyện đọc TOEIC</h1>
        </div>
        <p className="text-gray-600">
          Nâng cao kỹ năng đọc hiểu với các bài tập đa dạng từ Part 5 đến Part 7
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
          <div className="text-2xl font-bold text-emerald-600">110</div>
          <div className="text-sm text-gray-600">Tổng số câu hỏi</div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">53</div>
          <div className="text-sm text-gray-600">Đã hoàn thành</div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">48%</div>
          <div className="text-sm text-gray-600">Tiến độ chung</div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">78</div>
          <div className="text-sm text-gray-600">Điểm trung bình</div>
        </motion.div>
      </motion.div>

      {/* Reading Parts */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4 mb-8"
      >
        <h2 className="text-lg font-bold text-gray-800 mb-4">Các phần thi đọc</h2>
        {readingParts.map((part) => (
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
                      href={`/student/reading/${part.id}/lesson-${lesson}`}
                      className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          {lesson <= Math.ceil(part.completed / 10) ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Play className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Bài {lesson}: {part.name.split(":")[0]}</p>
                          <p className="text-xs text-gray-500">10 câu hỏi • 15 phút</p>
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

      {/* Recent Tests */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-500" />
            Bài kiểm tra gần đây
          </h2>
          <Link href="/student/mock-test" className="text-emerald-600 text-sm hover:underline">
            Xem tất cả
          </Link>
        </div>
        <div className="space-y-3">
          {recentTests.map((test, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">{test.title}</p>
                <p className="text-xs text-gray-500">{test.date}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-600">{test.score}%</div>
                <div className="text-xs text-gray-500">Điểm số</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}