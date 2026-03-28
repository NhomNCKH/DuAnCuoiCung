// app/admin/exams/components/sections/ItemList.tsx
"use client";
import { ExamItem } from "../../types";
import { ActionIcon } from "@/components/ui/action-icons";

interface ItemListProps {
  sectionId: string;
  items: ExamItem[];
  onReorderItems?: (startIndex: number, endIndex: number) => void;
  onEditItem?: (item: ExamItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem?: () => void;
}

export function ItemList({ items, onDeleteItem }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-400">Chưa có câu hỏi nào.</div>
    );
  }
  return (
    <div className="p-4 space-y-2">
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
          <span className="text-xs text-gray-400 w-5 text-center">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {item.questionGroup?.title ?? item.questionGroupId}
            </p>
            <p className="text-xs text-gray-400">{item.questionGroup?.code} · {item.questionGroup?.part}</p>
          </div>
          {item.locked && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">Locked</span>
          )}
          {onDeleteItem && (
            <button onClick={() => onDeleteItem(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
              <ActionIcon action="delete" className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
