"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Timer,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";

type Card = {
  id: string;
  front: string;
  back: string;
  note?: string | null;
  tags?: string[] | null;
};

type Rating = "again" | "hard" | "good" | "easy";

const RATING_META: Record<
  Rating,
  { label: string; cls: string; hint: string }
> = {
  again: {
    label: "Again",
    cls: "bg-rose-600 hover:bg-rose-700 text-white",
    hint: "Quên / sai",
  },
  hard: {
    label: "Hard",
    cls: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-600/40 dark:bg-transparent dark:hover:bg-white/5 dark:text-slate-200",
    hint: "Khó",
  },
  good: {
    label: "Good",
    cls: "bg-amber-500 hover:bg-amber-600 text-white",
    hint: "Nhớ được",
  },
  easy: {
    label: "Easy",
    cls: "bg-emerald-600 hover:bg-emerald-700 text-white",
    hint: "Rất dễ",
  },
};

export default function FlashcardStudyPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = String((params as any)?.deckId ?? "");
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const [startedAt] = useState(() => Date.now());
  const flipAtRef = useRef<number | null>(null);

  const current = queue[index] ?? null;

  const progressLabel = useMemo(() => {
    if (!queue.length) return "0/0";
    return `${Math.min(index + 1, queue.length)}/${queue.length}`;
  }, [index, queue.length]);

  const loadQueue = async () => {
    setLoading(true);
    setSessionDone(false);
    try {
      const res = await apiClient.learner.flashcards.getStudyQueue({
        deckId,
        limit: 20,
        newLimit: 10,
      });
      const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
      setQueue(payload?.items ?? []);
      setIndex(0);
      setShowBack(false);
      flipAtRef.current = null;
    } catch (e: any) {
      notify({
        variant: "error",
        title: "Không tải được phiên học",
        message: e.message || "Vui lòng thử lại",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!deckId) return;
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!current || submitting || loading || sessionDone) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!showBack) {
          setShowBack(true);
          flipAtRef.current = Date.now();
        }
      }
      if (!showBack) return;
      const map: Record<string, Rating> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
      const r = map[e.key];
      if (r) void submit(r);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, showBack, submitting, loading, sessionDone]);

  const submit = async (rating: Rating) => {
    if (!current) return;
    setSubmitting(true);
    try {
      const now = Date.now();
      const timeMs =
        flipAtRef.current && flipAtRef.current <= now ? now - flipAtRef.current : undefined;

      const res = await apiClient.learner.flashcards.submitReview({
        flashcardId: current.id,
        rating,
        timeMs,
      });
      const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
      const nextDue = payload?.nextDueAt ? new Date(payload.nextDueAt).toLocaleString("vi-VN") : "—";
      notify({
        variant: "success",
        title: `Đã chấm: ${RATING_META[rating].label}`,
        message: `Lịch ôn tiếp theo: ${nextDue}`,
        durationMs: 1800,
      });

      const nextIndex = index + 1;
      if (nextIndex >= queue.length) {
        setSessionDone(true);
        return;
      }
      setIndex(nextIndex);
      setShowBack(false);
      flipAtRef.current = null;
    } catch (e: any) {
      notify({ variant: "error", title: "Ghi kết quả thất bại", message: e.message || "Vui lòng thử lại" });
    } finally {
      setSubmitting(false);
    }
  };

  const elapsedMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/student/flashcards/${deckId}`)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ôn tập</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Space/Enter để lật. Phím 1–4 để chọn Again/Hard/Good/Easy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200">
              <Timer className="h-4 w-4 text-amber-500" />
              {elapsedMin} phút
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
              {progressLabel}
            </div>
            <button
              type="button"
              onClick={loadQueue}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
            >
              <RotateCcw className="h-4 w-4" />
              Tải lại
            </button>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600/40 dark:bg-transparent">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : sessionDone ? (
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Hoàn thành phiên học
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Bạn có thể tải lại để lấy thẻ đến hạn mới.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={loadQueue}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                >
                  Lấy lượt mới
                </button>
                <Link
                  href={`/student/flashcards/${deckId}`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                >
                  Về bộ thẻ
                </Link>
              </div>
            </div>
          ) : !current ? (
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Không có thẻ để ôn
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Thử thêm thẻ mới hoặc đợi đến hạn.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link
                  href={`/student/flashcards/${deckId}`}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                >
                  Về bộ thẻ <ChevronRight className="ml-1 inline h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-600/40 dark:bg-white/5">
                <AnimatePresence mode="wait">
                  {!showBack ? (
                    <motion.div
                      key="front"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Mặt trước
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-xl font-bold text-slate-900 dark:text-slate-100">
                        {current.front}
                      </p>
                      {current.note ? (
                        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                          Gợi ý: {current.note}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setShowBack(true);
                          flipAtRef.current = Date.now();
                        }}
                        className="mt-6 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                      >
                        Lật thẻ (Space)
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Mặt sau
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-xl font-bold text-slate-900 dark:text-slate-100">
                        {current.back}
                      </p>
                      {current.tags?.length ? (
                        <div className="mt-4 flex flex-wrap justify-center gap-1">
                          {current.tags.slice(0, 8).map((t) => (
                            <span
                              key={t}
                              className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                {(Object.keys(RATING_META) as Rating[]).map((r, idx) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!showBack || submitting}
                    onClick={() => submit(r)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition disabled:opacity-50 ${RATING_META[r].cls}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{RATING_META[r].label}</span>
                      <span className="text-xs font-semibold opacity-80">{idx + 1}</span>
                    </div>
                    <div className="mt-0.5 text-left text-xs font-semibold opacity-80">
                      {RATING_META[r].hint}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

