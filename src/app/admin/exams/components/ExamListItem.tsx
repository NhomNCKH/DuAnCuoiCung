// app/admin/exams/components/ExamListItem.tsx
"use client";
import { motion } from "framer-motion";
import { Eye, Copy, Send, Edit, Archive, CheckCircle } from "lucide-react";
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

interface ExamListItemProps {
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

export function ExamListItem({ template, onSelect, onDuplicate, onPublish }: ExamListItemProps) {
  const statusMap = {
    published: { icon: CheckCircle, label: "Đã xuất bản", color: "text-green-600", bgColor: "bg-green-50" },
    draft: { icon: Edit, label: "Bản nháp", color: "text-yellow-600", bgColor: "bg-yellow-50" },
    archived: { icon: Archive, label: "Đã lưu trữ", color: "text-gray-500", bgColor: "bg-gray-50" },
  };
  const statusConfig = statusMap[template.status as keyof typeof statusMap] ?? statusMap.draft;
  const StatusIcon = statusConfig.icon;
  const durationMin = Math.floor((template.totalDurationSec ?? 0) / 60);

  return (
    <motion.div
      variants={itemVariant}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${statusConfig.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-bold text-gray-800">{template.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${MODE_COLOR[template.mode] ?? "bg-gray-100 text-gray-600"}`}>
                {MODE_LABEL[template.mode] ?? template.mode}
              </span>
              <span className="text-xs text-gray-400">{statusConfig.label}</span>
            </div>
            <p className="text-xs text-gray-400 font-mono">{template.code}</p>
            {template.description && (
              <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{template.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-sm font-bold text-gray-800">{template.totalQuestions ?? 0}</div>
            <div className="text-xs text-gray-500">Câu hỏi</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-800">{durationMin}&apos;</div>
            <div className="text-xs text-gray-500">Phút</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(template)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Chi tiết"
            >
              <Eye className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onDuplicate(template.id)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Nhân bản"
            >
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
            {template.status === "draft" && onPublish && (
              <button
                onClick={() => onPublish(template.id)}
                className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                title="Xuất bản"
              >
                <Send className="w-4 h-4 text-green-500" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
