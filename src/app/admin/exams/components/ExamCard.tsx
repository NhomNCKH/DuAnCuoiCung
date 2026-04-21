// app/admin/exams/components/ExamCard.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Copy, Send, MoreVertical, CheckCircle, Edit, Archive, Trash2, Calendar } from "lucide-react";
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
  onArchive?: (id: string) => void;
  onDelete?: (template: ExamTemplate) => void;
  getDifficultyColor?: (difficulty: string) => string;
  getDifficultyLabel?: (difficulty: string) => string;
}

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function ExamCard({
  template,
  onSelect,
  onDuplicate,
  onPublish,
  onArchive,
  onDelete,
}: ExamCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const statusMap = {
    published: { icon: CheckCircle, label: "Da xuat ban", color: "text-green-600", bgColor: "bg-green-50", bar: "bg-green-500" },
    draft: { icon: Edit, label: "Ban nhap", color: "text-yellow-600", bgColor: "bg-yellow-50", bar: "bg-yellow-500" },
    archived: { icon: Archive, label: "Da luu tru", color: "text-gray-500", bgColor: "bg-gray-50", bar: "bg-gray-400" },
  };
  const statusConfig = statusMap[template.status as keyof typeof statusMap] ?? statusMap.draft;
  const StatusIcon = statusConfig.icon;
  const durationMin = Math.floor((template.totalDurationSec ?? 0) / 60);
  const shouldShowExamDate = template.mode === "official_exam" && !!template.examDate;
  const examDateLabel = shouldShowExamDate
    ? new Date(String(template.examDate)).toLocaleDateString("vi-VN")
    : "";

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
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Thao tác"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 min-w-[170px] rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate(template.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4" />
                  Nhân bản
                </button>
                {template.status === "draft" && onPublish && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onPublish(template.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-green-700 hover:bg-green-50"
                  >
                    <Send className="h-4 w-4" />
                    Xuất bản
                  </button>
                )}
                {template.status === "published" && onArchive && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onArchive(template.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                  >
                    <Archive className="h-4 w-4" />
                    Lưu trữ
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(template);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa đề thi
                  </button>
                )}
              </div>
            )}
          </div>
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
        {shouldShowExamDate && (
          <div className="mb-4 -mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            Ngày thi: <span className="text-gray-800">{examDateLabel}</span>
          </div>
        )}
        <div className="flex items-stretch gap-2 pt-2 border-t border-gray-100">
          <button 
            type="button"
            onClick={() => onSelect(template)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            <Eye className="h-4 w-4 shrink-0" />
            Chi tiết
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(template.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-transparent dark:hover:bg-white/5"
            title="Tạo bản sao đề thi (mã & cấu trúc tương tự)"
          >
            <Copy className="h-4 w-4 shrink-0" />
            Nhân bản
          </button>
        </div>
      </div>
    </motion.div>
  );
}
