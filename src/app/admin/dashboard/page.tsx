"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Award,
  BookOpen,
  FileText,
  Activity,
  Calendar,
  Database,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeHeader } from "@/components/ui/WelcomeHeader";
import { EnhancedStatCard } from "@/components/ui/EnhancedStatCard";
import { InfoCard } from "@/components/ui/InfoCard";
import { UserCard } from "@/components/ui/UserCard";
import { CertificateCard } from "@/components/ui/CertificateCard";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(false); // Sẽ call API thực tế ở đây
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const stats = [
    {
      icon: Users,
      label: "Tổng học viên",
      value: "1,234",
      change: "+12%",
      trend: "up",
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50/50",
    },
    {
      icon: Award,
      label: "Chứng chỉ cấp",
      value: "856",
      change: "+23%",
      trend: "up",
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50/50",
    },
    {
      icon: BookOpen,
      label: "Ngân hàng câu hỏi",
      value: "2,345",
      change: "+8%",
      trend: "up",
      color: "from-purple-500 to-indigo-600",
      bgColor: "bg-purple-50/50",
    },
    {
      icon: FileText,
      label: "Đề thi",
      value: "24",
      change: "-2%",
      trend: "down",
      color: "from-orange-500 to-rose-600",
      bgColor: "bg-orange-50/50",
    },
  ];

  const recentUsers = [
    { id: 1, name: "Nguyễn Văn A", email: "nguyenvana@email.com", joined: "2024-03-15", status: "active" as const },
    { id: 2, name: "Trần Thị B", email: "tranthib@email.com", joined: "2024-03-14", status: "active" as const },
    { id: 3, name: "Lê Văn C", email: "levanc@email.com", joined: "2024-03-13", status: "inactive" as const },
    { id: 4, name: "Phạm Thị D", email: "phamthid@email.com", joined: "2024-03-12", status: "active" as const },
  ];

  const recentCertificates = [
    { id: "CERT-001", student: "Nguyễn Văn A", score: 950, date: "2024-03-15", status: "verified" as const },
    { id: "CERT-002", student: "Trần Thị B", score: 850, date: "2024-03-14", status: "pending" as const },
    { id: "CERT-003", student: "Lê Văn C", score: 990, date: "2024-03-13", status: "verified" as const },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <div className="admin-dashboard-page p-6 lg:p-10 max-w-[1600px] mx-auto space-y-10 bg-[#f8fafc] min-h-screen">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Chào buổi sáng, {user?.name?.split(' ').pop() || "Admin"}
          </h1>
          <p className="text-slate-500 font-medium">
            Hệ thống đang hoạt động ổn định. Kiểm tra các chỉ số chính bên dưới.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            Báo cáo chi tiết
          </button>
          <button className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95">
            Quản lý đề thi
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0 }
            }}
            className="relative overflow-hidden bg-white p-7 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`p-3.5 rounded-2xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 text-transparent bg-clip-text bg-gradient-to-br ${stat.color}`} />
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                stat.trend === 'up' ? 'text-blue-600 bg-blue-50' : 'text-rose-600 bg-rose-50'
              }`}>
                {stat.change}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          {/* Main Chart Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Lưu lượng truy cập</h3>
                <p className="text-sm text-slate-400 font-medium">Thống kê hoạt động 24h qua</p>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-xl">
                <button className="px-4 py-1.5 text-xs font-bold text-slate-900 bg-white rounded-lg shadow-sm">Ngày</button>
                <button className="px-4 py-1.5 text-xs font-bold text-slate-400">Tuần</button>
              </div>
            </div>
            <div className="h-[320px] w-full bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 flex items-center justify-center">
              <Activity className="w-10 h-10 text-slate-200 animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Recent Users */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-black text-slate-900">Học viên mới</h3>
                <button className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Xem tất cả</button>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
                {recentUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>

            {/* Recent Certificates */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-black text-slate-900">Chứng chỉ</h3>
                <button className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Phê duyệt</button>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
                {recentCertificates.map((cert) => (
                  <CertificateCard key={cert.id} certificate={cert} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* System Status Sidebar */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/5">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-black tracking-tight text-lg">Hạ tầng</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Block Height</p>
                  <p className="text-2xl font-mono font-bold text-white">#1,234,567</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Node Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                      <span className="text-sm font-bold">Online</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Latency</p>
                    <span className="text-sm font-bold text-blue-400">24ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Sidebar */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 px-2 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              Sự kiện
            </h3>
            <div className="space-y-4">
              <div className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4 group cursor-pointer hover:border-slate-200 transition-all">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex flex-col items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <span className="text-[10px] font-black leading-none">THỨ 4</span>
                  <span className="text-lg font-black">25</span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Cấp chứng chỉ đợt 1</p>
                  <p className="text-xs font-bold text-slate-400">15:00 • Tự động</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}