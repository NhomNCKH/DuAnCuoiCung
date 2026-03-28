// app/admin/exams/components/tabs/OverviewTab.tsx
"use client";
import { ExamTemplate } from "../../types";
import { FileText, Clock, Calendar, CheckCircle, Edit, Archive } from "lucide-react";

const MODE_LABEL: Record<string, string> = {
  practice: "Practice",
  mock_test: "Mock Test",
  official_exam: "Official Exam",
};

const formatDate = (d?: string) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("vi-VN"); } catch { return d; }
};

export function OverviewTab({ template }: { template: ExamTemplate }) {
  const statusMap = {
    published: { icon: CheckCircle, label: "Đã xuất bản", color: "text-green-600", bg: "bg-green-100" },
    draft: { icon: Edit, label: "Bản nháp", color: "text-yellow-600", bg: "bg-yellow-100" },
    archived: { icon: Archive, label: "Đã lưu trữ", color: "text-gray-500", bg: "bg-gray-100" },
  };
  const s = statusMap[template.status as keyof typeof statusMap] ?? statusMap.draft;
  const StatusIcon = s.icon;

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tổng câu hỏi", value: template.totalQuestions ?? 0 },
          { label: "Thời gian", value: `${Math.floor((template.totalDurationSec ?? 0) / 60)} phút` },
          { label: "Mode", value: MODE_LABEL[template.mode] ?? template.mode },
          { label: "Mã đề", value: template.code },
        ].map(item => (
          <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className="font-semibold text-gray-800 text-sm">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Basic info */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Thông tin cơ bản
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Trạng thái</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${s.bg} ${s.color}`}>
              <StatusIcon className="w-3 h-3" />{s.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Xáo trộn câu hỏi</span>
            <span className="text-gray-800">{template.shuffleQuestionOrder ? "Có" : "Không"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Xáo trộn đáp án</span>
            <span className="text-gray-800">{template.shuffleOptionOrder ? "Có" : "Không"}</span>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          Thời gian
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Ngày tạo</span>
            <span className="text-gray-800">{formatDate(template.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Cập nhật lần cuối</span>
            <span className="text-gray-800">{formatDate(template.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {template.instructions && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Hướng dẫn làm bài
          </h4>
          <p className="text-sm text-blue-800 leading-relaxed">{template.instructions}</p>
        </div>
      )}

      {/* Description */}
      {template.description && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Mô tả</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{template.description}</p>
        </div>
      )}
    </div>
  );
}
