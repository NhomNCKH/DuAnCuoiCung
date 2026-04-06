"use client";

import { Sparkles } from "lucide-react";

/** FAB mobile — giữ hành vi cũ (chưa gắn action cụ thể). */
export function StudentQuickActionFab() {
  return (
    <div className="fixed bottom-6 right-6 md:hidden">
      <button
        type="button"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transition-shadow hover:shadow-xl"
        aria-label="Thao tác nhanh"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    </div>
  );
}
