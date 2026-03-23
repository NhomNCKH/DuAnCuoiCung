"use client";

import { motion } from "framer-motion";
import {
  Users,
  Award,
  BookOpen,
  FileText,
  Activity,
  Calendar,
  Database,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeHeader } from "@/components/ui/WelcomeHeader";
import { EnhancedStatCard } from "@/components/ui/EnhancedStatCard";
import { InfoCard } from "@/components/ui/InfoCard";
import { UserCard } from "@/components/ui/UserCard";
import { CertificateCard } from "@/components/ui/CertificateCard";

export default function AdminDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      icon: Users,
      label: "Tổng học viên",
      value: "1,234",
      change: "+12%",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Award,
      label: "Chứng chỉ đã cấp",
      value: "856",
      change: "+23%",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-50",
    },
    {
      icon: BookOpen,
      label: "Câu hỏi",
      value: "2,345",
      change: "+8%",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: FileText,
      label: "Đề thi",
      value: "24",
      change: "+2",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <WelcomeHeader
        userName={user?.name || "Admin"}
        title="Xin chào"
        subtitle="Chào mừng bạn quay trở lại. Dưới đây là tổng quan hệ thống hôm nay."
        date="24/03/2024"
      />

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => (
          <EnhancedStatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            color={stat.color}
            bgColor={stat.bgColor}
            index={index}
          />
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <InfoCard
          title="Học viên mới"
          icon={Users}
          actionText="Xem tất cả"
          onAction={() => console.log('View all users')}
        >
          {recentUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </InfoCard>

        {/* Recent Certificates */}
        <InfoCard
          title="Chứng chỉ gần đây"
          icon={Award}
          actionText="Xem tất cả"
          onAction={() => console.log('View all certificates')}
        >
          {recentCertificates.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} />
          ))}
        </InfoCard>
      </div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <InfoCard title="Blockchain Status" icon={Database}>
          <div className="flex justify-between">
            <span className="text-gray-600">Block height</span>
            <span className="font-mono font-bold text-emerald-600">#1,234,567</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pending transactions</span>
            <span className="font-mono font-bold text-blue-600">23</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Network hash rate</span>
            <span className="font-mono font-bold text-purple-600">125.4 MH/s</span>
          </div>
        </InfoCard>

        <InfoCard title="Hoạt động hôm nay" icon={Activity}>
          <div className="flex justify-between">
            <span className="text-gray-600">Bài tập đã làm</span>
            <span className="font-bold text-gray-800">234</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Người dùng hoạt động</span>
            <span className="font-bold text-gray-800">567</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Đề thi đã hoàn thành</span>
            <span className="font-bold text-gray-800">89</span>
          </div>
        </InfoCard>

        <InfoCard title="Lịch trình" icon={Calendar}>
          <div className="p-2 bg-yellow-50 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">Đợt cấp chứng chỉ</p>
            <p className="text-xs text-yellow-600">25/03/2024 - 15:00</p>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Bảo trì hệ thống</p>
            <p className="text-xs text-blue-600">30/03/2024 - 02:00</p>
          </div>
        </InfoCard>
      </motion.div>
    </div>
  );
}