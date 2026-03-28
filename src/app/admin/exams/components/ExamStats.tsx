// app/admin/exams/components/ExamStats.tsx
import { motion } from "framer-motion";
import { FileText, CheckCircle, Edit, Archive, Users, TrendingUp } from "lucide-react";

interface ExamStatsProps {
  stats: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    totalAttempts: number;
  };
}

export function ExamStats({ stats }: ExamStatsProps) {
  const statCards = [
    {
      icon: FileText,
      label: "Tổng đề thi",
      value: stats?.total || 0,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      desc: "Tất cả các đề trong hệ thống",
    },
    {
      icon: CheckCircle,
      label: "Đã xuất bản",
      value: stats?.published || 0,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      desc: "Học sinh có thể truy cập",
    },
    {
      icon: Edit,
      label: "Bản nháp",
      value: stats?.draft || 0,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-100",
      desc: "Đang trong quá trình soạn thảo",
    },
    {
      icon: Users,
      label: "Lượt thi",
      value: (stats?.totalAttempts || 0).toLocaleString(),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100",
      desc: "Tổng số lượt làm bài học sinh",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 ${stat.bgColor} ${stat.borderColor} border rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
                <span className="text-2xl font-black text-gray-900 leading-none mt-1">{stat.value}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-50">
              <p className="text-[11px] text-gray-500 font-medium italic">{stat.desc}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}