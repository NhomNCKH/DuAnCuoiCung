// app/admin/exams/components/sections/SectionItem.tsx
"use client";
import { ExamSection } from "../../types";

const PART_LABEL: Record<string, string> = {
  P1: "Part 1", P2: "Part 2", P3: "Part 3", P4: "Part 4",
  P5: "Part 5", P6: "Part 6", P7: "Part 7",
};

interface SectionItemProps {
  section: ExamSection;
  index: number;
  onUpdate?: (section: ExamSection) => void;
  onDelete?: (sectionId: string) => void;
  onReorderItems?: (sectionId: string, startIndex: number, endIndex: number) => void;
  onAddItem?: (sectionId: string) => void;
  onEditItem?: (sectionId: string, itemId: string) => void;
  onDeleteItem?: (sectionId: string, itemId: string) => void;
}

export function SectionItem({ section, index }: SectionItemProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-700">
          Section {section.sectionOrder} — {PART_LABEL[section.part] ?? section.part}
        </span>
        {section.durationSec && (
          <span className="text-xs text-gray-400">{Math.floor(section.durationSec / 60)} phút</span>
        )}
      </div>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>{section.expectedGroupCount} nhóm</span>
        <span>{section.expectedQuestionCount} câu hỏi</span>
      </div>
    </div>
  );
}
