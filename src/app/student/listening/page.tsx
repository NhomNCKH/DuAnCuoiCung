"use client";

import { motion } from "framer-motion";
import { Headphones } from "lucide-react";

export default function ListeningPracticePage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <Headphones className="h-7 w-7 text-amber-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Luyện nghe
          </h1>
        </div>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Màn luyện nghe đang được phát triển. Bạn có thể tiếp tục phát triển thêm
          nội dung tại trang này.
        </p>
      </motion.div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600/40 dark:bg-transparent">
        <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">
          Gợi ý: bạn có thể triển khai danh sách bộ đề/part nghe, audio player,
          transcript và bài luyện theo nhóm câu hỏi (Part 1–4).
        </p>
      </div>
    </div>
  );
}

