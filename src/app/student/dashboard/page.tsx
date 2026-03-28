"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  PenTool,
  Mic,
  FileText,
  Award,
  TrendingUp,
  Clock,
  Target,
  Calendar,
  ChevronRight,
  Sparkles,
  Shield,
  Star,
  Zap,
  Brain,
  Activity,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { StudentStatCard } from "@/components/ui/StudentStatCard";
import { InfoCard } from "@/components/ui/InfoCard";
import { useAuth } from "@/hooks/useAuth";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    readingProgress: 65,
    writingProgress: 45,
    speakingProgress: 30,
    totalHours: 24,
    totalLessons: 48,
    streak: 7,
    toeicScore: 650,
    rank: 1250,
  });

  const [recentActivities] = useState([
    {
      id: 1,
      type: "reading",
      title: "Part 7: Reading Comprehension",
      score: 85,
      date: "Hôm nay",
      time: "10:30 AM",
    },
    {
      id: 2,
      type: "writing",
      title: "Part 2: Respond to a Request",
      score: 78,
      date: "Hôm qua",
      time: "2:15 PM",
    },
    {
      id: 3,
      type: "mock-test",
      title: "TOEIC Full Test 1",
      score: 650,
      date: "2 ngày trước",
      time: "9:00 AM",
    },
  ]);

  const [recommendations] = useState([
    {
      title: "Từ vựng Part 5 - Ngữ pháp cơ bản",
      progress: 30,
      difficulty: "Dễ",
    },
    {
      title: "Đọc hiểu đoạn văn - Part 7",
      progress: 50,
      difficulty: "Trung bình",
    },
    {
      title: "Viết email phản hồi - Part 2",
      progress: 20,
      difficulty: "Trung bình",
    },
  ]);

  const [upcomingTests] = useState([
    {
      name: "Mini Test - Reading",
      date: "Thứ 4, 25/12/2024",
      time: "14:00",
    },
    {
      name: "Mock Test Full",
      date: "Chủ nhật, 29/12/2024",
      time: "09:00",
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
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-10 bg-[#f8fafc] min-h-screen">
      {/* Premium Welcome Card */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 lg:p-16 text-white shadow-2xl shadow-slate-200 group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-emerald-500/20 transition-all duration-1000" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-20 -mb-20 blur-[80px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="text-center lg:text-left space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-emerald-400">AI Powered Learning</span>
            </motion.div>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter leading-tight">
              Chào, {user?.name?.split(' ').pop() || "Học viên"}
            </h1>
            <p className="text-lg text-slate-400 max-w-lg font-medium leading-relaxed">
              Bạn đã hoàn thành <span className="text-white font-bold">75%</span> mục tiêu tuần này. 
              Chỉ còn 2 bài luyện tập nữa để đạt mốc <span className="text-emerald-400 font-bold">900+</span>.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
              <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                Tiếp tục học ngay
              </button>
              <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all border border-white/10 active:scale-95">
                Xem lộ trình
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-center min-w-[160px] hover:bg-white/10 transition-colors">
              <p className="text-4xl font-black mb-2 tracking-tighter text-emerald-400">{stats.streak}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ngày học</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-center min-w-[160px] hover:bg-white/10 transition-colors">
              <p className="text-4xl font-black mb-2 tracking-tighter text-blue-400">{stats.toeicScore}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Điểm TOEIC</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Quick Access Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, label: "Reading", color: "text-blue-500", bg: "bg-blue-500/5", href: "/student/reading" },
              { icon: PenTool, label: "Writing", color: "text-purple-500", bg: "bg-purple-500/5", href: "/student/writing" },
              { icon: Mic, label: "Speaking", color: "text-orange-500", bg: "bg-orange-500/5", href: "/student/profile" },
              { icon: FileText, label: "Mock Test", color: "text-emerald-500", bg: "bg-emerald-500/5", href: "/student/mock-test" },
            ].map((action, i) => (
              <Link key={i} href={action.href} className="group p-6 bg-white border border-slate-100 rounded-[2rem] flex flex-col items-center gap-4 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all">
                <div className={`p-4 rounded-2xl ${action.bg} group-hover:scale-110 transition-transform duration-500`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-900">{action.label}</span>
              </Link>
            ))}
          </div>

          {/* Skill Analysis Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Phân tích kỹ năng</h3>
              <div className="p-2 bg-slate-50 rounded-xl">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            
            <div className="space-y-8">
              {[
                { label: "Đọc hiểu", val: stats.readingProgress, color: "bg-blue-500", icon: BookOpen },
                { label: "Kỹ năng viết", val: stats.writingProgress, color: "bg-purple-500", icon: PenTool },
                { label: "Luyện nói AI", val: stats.speakingProgress, color: "bg-orange-500", icon: Mic },
              ].map((skill, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-slate-700">{skill.label}</span>
                    <span className="text-sm font-black text-slate-900">{skill.val}%</span>
                  </div>
                  <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.val}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className={`h-full ${skill.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* Recent Activity Sidebar */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 px-2 uppercase tracking-widest text-[10px]">Hoạt động</h3>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                      {activity.type === "reading" && <BookOpen className="w-5 h-5" />}
                      {activity.type === "writing" && <PenTool className="w-5 h-5" />}
                      {activity.type === "mock-test" && <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{activity.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{activity.date}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-900">{activity.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Suggestions Card */}
          <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-slate-900 shadow-xl shadow-emerald-100 relative overflow-hidden group">
            <Sparkles className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10 space-y-6">
              <h3 className="font-black tracking-tight text-lg">AI Gợi ý</h3>
              <div className="space-y-4">
                {recommendations.slice(0, 2).map((rec, idx) => (
                  <div key={idx} className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
                    <p className="text-xs font-black leading-tight mb-2">{rec.title}</p>
                    <div className="flex items-center justify-between text-[9px] font-black uppercase">
                      <span>Độ khó: {rec.difficulty}</span>
                      <span>{rec.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg active:scale-95 transition-all">
                Bắt đầu học ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}