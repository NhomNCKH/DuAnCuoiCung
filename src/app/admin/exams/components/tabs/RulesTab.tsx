// app/admin/exams/components/tabs/RulesTab.tsx
// NOTE: This tab is a legacy UI stub — actual rule management is in ExamDetailModal's RulesTab.
// Kept here only to satisfy imports from SectionsTab.tsx.
"use client";
import { ExamTemplate } from "../../types";

export function RulesTab({ template }: { template: ExamTemplate }) {
  const rules = template.rules ?? [];
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Quy tắc lấy câu hỏi tự động từ ngân hàng</p>
      {rules.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl text-sm">
          Chưa có rule nào.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r, i) => (
            <div key={r.id ?? i} className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm flex items-center gap-4">
              <span className="font-medium text-gray-700">{r.part}</span>
              <span className="text-gray-500">{r.questionCount} câu</span>
              {r.groupCount && <span className="text-gray-500">{r.groupCount} nhóm</span>}
              {r.requiredTagCodes && r.requiredTagCodes.length > 0 && (
                <span className="text-xs text-blue-600">{r.requiredTagCodes.join(", ")}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
