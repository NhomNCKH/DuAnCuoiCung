"use client";

import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";

export default function FlashcardImportGuidePage() {
  return (
    <div className="px-4 py-10 sm:px-6 lg:px-10">
      <div className="surface mx-auto max-w-2xl rounded-3xl p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
          <MessageSquare className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-slate-100">
          Hướng dẫn đã chuyển vào popup Nhập JSON
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Quay lại bộ flashcard, mở tab <span className="font-semibold">Nhập JSON</span> rồi bấm
          <span className="font-semibold"> Hiện hướng dẫn</span>.
        </p>
        <Link
          href="/student/flashcards"
          className="btn-secondary mt-5 inline-flex rounded-xl px-4 py-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Flashcards
        </Link>
      </div>
    </div>
  );
}
