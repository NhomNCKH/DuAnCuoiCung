// app/admin/exams/components/tabs/PreviewTab.tsx
"use client";
import { ExamTemplate } from "../../types";
import { AlertCircle } from "lucide-react";

export function PreviewTab({ template }: { template: ExamTemplate }) {
  const durationMin = Math.floor((template.totalDurationSec ?? 0) / 60);
  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">Xem trước đề thi — chưa phải đề thi chính thức</p>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Tổng số câu hỏi</span>
          <span className="font-medium">{template.totalQuestions ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Thời gian làm bài</span>
          <span className="font-medium">{durationMin} phút</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Số sections</span>
          <span className="font-medium">{template.sections?.length ?? 0}</span>
        </div>
      </div>
    </div>
  );
}
