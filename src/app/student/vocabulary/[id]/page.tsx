"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BookMarked, Loader2, Search } from "lucide-react";
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

type Item = {
  id: string;
  word: string;
  wordType: string;
  meaning: string;
  pronunciation?: string | null;
  exampleSentence: string;
};

type Meta = { page: number; limit: number; total: number; totalPages: number };

function unwrap(res: unknown): any {
  const r = res as any;
  return r?.data?.data ?? r?.data ?? r;
}

export default function StudentVocabularyDeckPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const { notify } = useToast();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [tick, setTick] = useState(0);

  const loadDeck = useCallback(async () => {
    if (!id) return;
    setLoadingDeck(true);
    try {
      const res = await apiClient.learner.vocabulary.getDeck(id);
      const d = unwrap(res);
      setDeck(d);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được bộ từ", message: e.message || "Thử lại" });
      setDeck(null);
    } finally {
      setLoadingDeck(false);
    }
  }, [id, notify]);

  const loadItems = useCallback(async () => {
    if (!id) return;
    setLoadingItems(true);
    try {
      const res = await apiClient.learner.vocabulary.listItems(id, {
        page: meta.page,
        limit: meta.limit,
        keyword: keyword.trim() || undefined,
        sort: "sortOrder",
        order: "ASC",
      });
      const p = unwrap(res);
      setItems(p?.items ?? []);
      const m = p?.meta ?? {};
      setMeta({
        page: Number(m.page ?? 1),
        limit: Number(m.limit ?? 30),
        total: Number(m.total ?? 0),
        totalPages: Number(m.totalPages ?? 1),
      });
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được danh sách từ", message: e.message });
    } finally {
      setLoadingItems(false);
    }
  }, [id, meta.page, meta.limit, keyword, notify, tick]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const deckBlurb = useMemo(() => learnerVisibleDescription(deck?.description), [deck?.description]);

  if (!id) {
    return null;
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <Link
        href="/student/flashcards"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:underline dark:text-amber-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Flashcard / bộ từ hệ thống
      </Link>

      {loadingDeck ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : !deck ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Không tìm thấy bộ từ hoặc chưa được xuất bản.</p>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex flex-wrap items-start gap-3">
              <BookMarked className="h-8 w-8 text-amber-500" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{deck.title}</h1>
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                    {deck.cefrLevel}
                  </span>
                </div>
                {deckBlurb ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{deckBlurb}</p> : null}
                <p className="mt-2 text-xs text-slate-500">
                  {typeof deck.itemCount === "number" ? `${deck.itemCount} mục` : ""}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setMeta((m) => ({ ...m, page: 1 }));
                    setTick((t) => t + 1);
                  }
                }}
                placeholder="Tìm trong bộ…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-300 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setMeta((m) => ({ ...m, page: 1 }));
                setTick((t) => t + 1);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-600/40"
            >
              Lọc
            </button>
          </div>

          {loadingItems ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <motion.article
                  key={it.id}
                  layout
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-950/40"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{it.word}</h2>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {it.wordType}
                    </span>
                  </div>
                  {it.pronunciation ? (
                    <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">{it.pronunciation}</p>
                  ) : null}
                  <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">{it.meaning}</p>
                  <blockquote className="mt-3 border-l-4 border-amber-400/80 pl-3 text-sm italic text-slate-600 dark:text-slate-400">
                    {it.exampleSentence}
                  </blockquote>
                </motion.article>
              ))}
              {items.length === 0 && (
                <p className="text-center text-sm text-slate-500">Không có từ phù hợp bộ lọc.</p>
              )}
            </div>
          )}

          {meta.totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                type="button"
                disabled={meta.page <= 1}
                onClick={() => setMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600/40"
              >
                Trước
              </button>
              <span className="px-2 py-1.5 text-sm text-slate-600">
                {meta.page} / {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setMeta((m) => ({ ...m, page: Math.min(m.totalPages, m.page + 1) }))}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600/40"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
