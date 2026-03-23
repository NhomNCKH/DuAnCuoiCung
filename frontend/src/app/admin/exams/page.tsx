// app/admin/exams/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Clock,
  Users,
  Award,
  ChevronRight,
  Settings,
  Play,
  BarChart3,
} from "lucide-react";
import { EnhancedStatCard } from "@/components/ui/EnhancedStatCard";
import { InfoCard } from "@/components/ui/InfoCard";

interface Exam {
  id: number;
  name: string;
  type: "full" | "mini";
  readingCount: number;
  writingCount: number;
  duration: number;
  difficulty: "easy" | "medium" | "hard";
  attempts: number;
  avgScore: number;
  status: "active" | "draft";
  createdAt: string;
}

export default function AdminExamsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const [exams] = useState<Exam[]>([
    {
      id: 1,
      name: "TOEIC Full Test 1",
      type: "full",
      readingCount: 75,
      writingCount: 8,
      duration: 120,
      difficulty: "medium",
      attempts: 1234,
      avgScore: 650,
      status: "active",
      createdAt: "2024-01-15",
    },
    {
      id: 2,
      name: "TOEIC Full Test 2",
      type: "full",
      readingCount: 75,
      writingCount: 8,
      duration: 120,
      difficulty: "hard",
      attempts: 892,
      avgScore: 720,
      status: "active",
      createdAt: "2024-01-20",
    },
    {
      id: 3,
      name: "Mini Test - Reading",
      type: "mini",
      readingCount: 30,
      writingCount: 0,
      duration: 45,
      difficulty: "easy",
      attempts: 2156,
      avgScore: 78,
      status: "active",
      createdAt: "2024-02-01",
    },
  ]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý đề thi</h1>
          <p className="text-gray-600">Tạo và quản lý các đề thi TOEIC</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" />
          <span>Tạo đề thi mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <EnhancedStatCard
          icon={FileText}
          label="Tổng đề thi"
          value="24"
          change="+3"
          color="from-blue-500 to-blue-600"
          bgColor="bg-white"
          index={0}
        />
        <EnhancedStatCard
          icon={Award}
          label="Full Test"
          value="8"
          change="+1"
          color="from-green-500 to-green-600"
          bgColor="bg-white"
          index={1}
        />
        <EnhancedStatCard
          icon={BarChart3}
          label="Mini Test"
          value="16"
          change="+2"
          color="from-purple-500 to-purple-600"
          bgColor="bg-white"
          index={2}
        />
        <EnhancedStatCard
          icon={Users}
          label="Lượt thi"
          value="5,234"
          change="+234"
          color="from-yellow-500 to-yellow-600"
          bgColor="bg-white"
          index={3}
        />
      </motion.div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm đề thi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">Tất cả loại</option>
            <option value="full">Full Test</option>
            <option value="mini">Mini Test</option>
          </select>
        </div>
      </div>

      {/* Exams Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {exams.map((exam) => (
          <motion.div
            key={exam.id}
            variants={item}
            className="bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      exam.type === "full" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {exam.type === "full" ? "Full Test" : "Mini Test"}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      exam.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {exam.status === "active" ? "Đang hoạt động" : "Bản nháp"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{exam.name}</h3>
                  <p className="text-sm text-gray-500">Tạo ngày: {exam.createdAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Eye className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Edit className="w-4 h-4 text-blue-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">Reading: {exam.readingCount} câu</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-600">Writing: {exam.writingCount} câu</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">{exam.duration} phút</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-600">{exam.attempts} lượt thi</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-800">Điểm TB: {exam.avgScore}</span>
                </div>
                <button className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                  <span className="text-sm">Chi tiết</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">Cấu hình đề thi</span>
              </div>
              <button className="flex items-center gap-1 text-emerald-600 text-sm">
                <Play className="w-3 h-3" />
                <span>Xem trước</span>
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}