"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookMarked, ChevronRight, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { learnerVisibleDescription } from "@/lib/learner-deck-description";
import { useToast } from "@/hooks/useToast";

type Deck = {
  id: string;
  title: string;
  cefrLevel: string;
  description?: string | null;
  itemCount?: number;
};

function unwrap(res: unknown): any {
  const r = res as any;
  return r?.data?.data ?? r?.data ?? r;
}

const CEFR_BADGE: Record<string, string> = {
  A1: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  A2: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  B1: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  B2: "bg-orange-500/15 text-orange-900 dark:text-orange-100",
  C1: "bg-violet-500/15 text-violet-900 dark:text-violet-100",
};

export default function StudentVocabularyListPage() {
  const { notify } = useToast();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.learner.vocabulary.listDecks({
        limit: 50,
        sort: "sortOrder",
        order: "ASC",
      });
      const p = unwrap(res);
      setDecks(p?.items ?? []);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được bộ từ", message: e.message || "Thử lại" });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <Link
        href="/student/flashcards"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:underline dark:text-amber-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Về Flashcard
      </Link>

      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3">
          <BookMarked className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bộ từ hệ thống</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Danh sách đầy đủ — truy cập nhanh từ trang <Link href="/student/flashcards" className="font-semibold text-amber-600 hover:underline dark:text-amber-400">Flashcard</Link>.
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : decks.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Chưa có bộ từ được xuất bản.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {decks.map((d) => {
            const blurb = learnerVisibleDescription(d.description);
            return (
            <Link
              key={d.id}
              href={`/student/vocabulary/${d.id}`}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300/60 hover:shadow-md dark:border-slate-600/40 dark:bg-slate-950/30"
            >
              <span
                className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${CEFR_BADGE[d.cefrLevel] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800"}`}
              >
                {d.cefrLevel}
              </span>
              <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">{d.title}</h2>
              {blurb ? (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{blurb}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                {typeof d.itemCount === "number" ? `${d.itemCount} mục` : ""}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                Xem từ <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
