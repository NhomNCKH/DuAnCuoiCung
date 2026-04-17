"use client";

import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import Link from "next/link";

export default function AdminPracticeReadingPage() {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <p className="mb-6 text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">
          Quản trị nội dung luyện đọc cho học viên.
        </p>
        <div className="surface p-8 text-center">
          <Construction className="mx-auto h-12 w-12 text-amber-500" />
          <p className="mt-4 text-lg font-semibold text-slate-900">Đang phát triển</p>
          <p className="mt-2 text-sm text-slate-600">
            Module sẽ cho phép biên tập bài đọc, cấp độ và gán vào lộ trình học.
          </p>
          <Link
            href="/admin/dashboard"
            className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:underline admin-dark:text-[var(--admin-accent)]"
          >
            ← Về dashboard
          </Link>
        </div>
    </motion.div>
  );
}
