// app/admin/exams/components/ExamCard.tsx
"use client";
import { motion } from "framer-motion";
import { Eye, Copy, Send, MoreVertical, CheckCircle, Edit, Archive } from "lucide-react";
import { ExamTemplate } from "../types";

const MODE_LABEL: Record<string, string> = {
  practice: "Practice",
  mock_test: "Mock Test",
  official_exam: "Official Exam",
};

const MODE_COLOR: Record<string, string> = {
  practice: "bg-blue-100 text-blue-700",
  mock_test: "bg-purple-100 text-purple-700",
  official_exam: "bg-orange-100 text-orange-700",
};

interface ExamCardProps {
  template: ExamTemplate;
  onSelect: (template: ExamTemplate) => void;
  onDuplicate: (id: string) => void;
  onPublish?: (id: string) => void;
  getDifficultyColor?: (difficulty: string) => string;
  getDifficultyLabel?: (difficulty: string) => string;
}

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function ExamCard({ template, onSelect, onDuplicate, onPublish }: ExamCardProps) {
  const statusMap = {
    published: { icon: CheckCircle, label: "Da xuat ban", color: "text-green-600", bgColor: "bg-green-50", bar: "bg-green-500" },
    draft: { icon: Edit, label: "Ban nhap", color: "text-yellow-600", bgColor: "bg-yellow-50", bar: "bg-yellow-500" },
    archived: { icon: Archive, label: "Da luu tru", color: "text-gray-500", bgColor: "bg-gray-50", bar: "bg-gray-400" },
  };
  const statusConfig = statusMap[template.status as keyof typeof statusMap] ?? statusMap.draft;
  const StatusIcon = statusConfig.icon;
  const durationMin = Math.floor((template.totalDurationSec ?? 0) / 60);

  return (
    <motion.div
      variants={itemVariant}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden"
    >
      <div className={`h-1 ${statusConfig.bar}`} />
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`p-1.5 rounded-lg ${statusConfig.bgColor}`}>
              <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MODE_COLOR[template.mode] ?? "bg-gray-100 text-gray-600"}`}>
              {MODE_LABEL[template.mode] ?? template.mode}
            </span>
          </div>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <h3 className="text-base font-bold text-gray-800 mb-0.5 line-clamp-1">{template.name}</h3>
        <p className="text-xs text-gray-400 mb-2 font-mono">{template.code}</p>
        {template.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <div className="text-sm font-bold text-gray-800">{template.totalQuestions ?? 0}</div>
            <div className="text-xs text-gray-500">Cau hoi</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-800">{durationMin}&apos;</div>
            <div className="text-xs text-gray-500">Phut</div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button onClick={() => onSelect(template)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Eye className="w-4 h-4" /><span>Chi tiet</span>
          </button>
          <button onClick={() => onDuplicate(template.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Copy className="w-4 h-4" /><span>Nhan ban</span>
          </button>
          {template.status === "draft" && onPublish && (
            <button onClick={() => onPublish(template.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors">
              <Send className="w-4 h-4" /><span>Xuat ban</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
