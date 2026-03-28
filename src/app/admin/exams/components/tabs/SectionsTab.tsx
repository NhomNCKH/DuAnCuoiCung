// app/admin/exams/components/tabs/SectionsTab.tsx
"use client";
import { Layers } from "lucide-react";
import { ExamTemplate } from "../../types";

const PART_LABEL: Record<string, string> = {
  P1: "Part 1 - Photos", P2: "Part 2 - Q&A", P3: "Part 3 - Conversations",
  P4: "Part 4 - Talks", P5: "Part 5 - Incomplete Sentences",
  P6: "Part 6 - Text Completion", P7: "Part 7 - Reading Comprehension",
};

export function SectionsTab({ template }: { template: ExamTemplate }) {
  const sections = template.sections ?? [];
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Cấu trúc từng phần (section) của đề thi</p>
      {sections.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Layers className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Chưa có section nào.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((s, i) => (
            <div key={s.id ?? i} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">Section {s.sectionOrder} — {s.part}</span>
                {s.durationSec && (
                  <span className="text-xs text-gray-400">{Math.floor(s.durationSec / 60)} phút</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2">{PART_LABEL[s.part] ?? s.part}</p>
              <div className="flex gap-4 text-xs text-gray-600">
                <span>{s.expectedGroupCount} nhóm câu hỏi</span>
                <span>{s.expectedQuestionCount} câu hỏi</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
