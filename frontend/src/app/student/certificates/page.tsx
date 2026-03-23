// app/student/certificates/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Shield,
  Download,
  Share2,
  ExternalLink,
  CheckCircle,
  Clock,
  TrendingUp,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { InfoCard } from "@/components/ui/InfoCard";

export default function CertificatesPage() {
  const [certificates] = useState([
    {
      id: 1,
      name: "Chứng chỉ TOEIC 650",
      score: 650,
      date: "15/12/2024",
      blockchainId: "0x7a3f...9e2d",
      verified: true,
      image: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400",
    },
    {
      id: 2,
      name: "Chứng chỉ Hoàn thành khóa Reading",
      score: 85,
      date: "10/12/2024",
      blockchainId: "0x3b2f...8c1a",
      verified: true,
      image: "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400",
    },
  ]);

  const achievements = [
    { name: "Đạt 100 bài đọc", progress: 75, target: 100, current: 75 },
    { name: "Đạt 50 bài viết", progress: 60, target: 50, current: 30 },
    { name: "Điểm TOEIC 800+", progress: 65, target: 800, current: 650 },
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
          <Award className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Chứng chỉ của tôi</h1>
        </div>
        <p className="text-gray-600">
          Các chứng chỉ được bảo mật trên Blockchain, có thể xác thực toàn cầu
        </p>
      </motion.div>

      {/* Blockchain Info */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 mb-8 text-white"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10" />
            <div>
              <h2 className="text-xl font-bold mb-1">Chứng chỉ Blockchain</h2>
              <p className="text-emerald-100 text-sm">
                Tất cả chứng chỉ đều được xác thực trên Blockchain, không thể làm giả
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
            <QrCode className="w-5 h-5" />
            <span className="text-sm font-mono">Xác thực ngay</span>
          </div>
        </div>
      </motion.div>

      {/* Certificates List */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4 mb-8"
      >
        <h2 className="text-lg font-bold text-gray-800">Chứng chỉ đã đạt được</h2>
        {certificates.map((cert) => (
          <motion.div
            key={cert.id}
            variants={item}
            className="bg-white rounded-xl overflow-hidden shadow-sm border border-emerald-100 hover:shadow-md transition-all"
          >
            <div className="flex flex-col md:flex-row">
              <img
                src={cert.image}
                alt={cert.name}
                className="w-full md:w-48 h-48 object-cover"
              />
              <div className="flex-1 p-6">
                <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-emerald-500" />
                      <h3 className="text-xl font-bold text-gray-800">{cert.name}</h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Cấp ngày: {cert.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-600">{cert.score}</div>
                    <div className="text-xs text-gray-500">
                      {cert.name.includes("TOEIC") ? "điểm TOEIC" : "% hoàn thành"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">Đã xác thực Blockchain</span>
                  <span className="text-xs text-gray-400 font-mono ml-2">
                    {cert.blockchainId}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Tải xuống</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Share2 className="w-4 h-4" />
                    <span>Chia sẻ</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    <span>Xác thực</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Achievements Progress */}
      <InfoCard
        title="Thành tích sắp đạt được"
        icon={TrendingUp}
      >
        <div className="space-y-4">
          {achievements.map((achievement, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{achievement.name}</span>
                <span className="text-emerald-600">
                  {achievement.current}/{achievement.target}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  style={{ width: `${achievement.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </InfoCard>

      {/* Verification Info */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-emerald-50 rounded-xl p-6 border border-emerald-200"
      >
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-gray-800 mb-1">Xác thực chứng chỉ</h3>
            <p className="text-sm text-gray-600 mb-3">
              Mọi chứng chỉ đều được lưu trữ trên Blockchain, có thể xác thực tại bất kỳ đâu.
              Mỗi chứng chỉ có một mã hash duy nhất.
            </p>
            <button className="text-emerald-600 text-sm font-medium hover:underline">
              Tìm hiểu thêm về công nghệ Blockchain
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}