"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Target, Keyboard, Timer } from "lucide-react";
import { apiClient } from "@/lib/api-client";
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

type Mode = "mcq" | "typing";

function unwrap(res: unknown): any {
  const r = res as any;
  return r?.data?.data ?? r?.data ?? r;
}

function normalizeAnswer(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"');
}

function sampleDistinct<T>(arr: T[], count: number, exclude: Set<T> = new Set()): T[] {
  if (count <= 0) return [];
  if (arr.length <= count && exclude.size === 0) return [...arr];
  const out: T[] = [];
  const used = new Set<T>(exclude);
  const maxTry = Math.min(5000, arr.length * 6 + 30);
  let tries = 0;
  while (out.length < count && tries < maxTry) {
    const idx = Math.floor(Math.random() * arr.length);
    const v = arr[idx];
    if (!used.has(v)) {
      used.add(v);
      out.push(v);
    }
    tries += 1;
  }
  return out;
}

export default function VocabularyPracticePage() {
  const params = useParams();
  const router = useRouter();
  const deckId = String((params as any)?.id ?? "");
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>("mcq");

  const [order, setOrder] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [reveal, setReveal] = useState<{ ok: boolean; message: string } | null>(null);

  const [typing, setTyping] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [startedAt] = useState(() => Date.now());

  const current = useMemo(() => {
    const id = order[cursor];
    return id ? items.find((x) => x.id === id) ?? null : null;
  }, [cursor, items, order]);

  const progressLabel = useMemo(() => {
    if (!order.length) return "0/0";
    return `${Math.min(cursor + 1, order.length)}/${order.length}`;
  }, [cursor, order.length]);

  const elapsedMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  const buildSession = useCallback(
    (source: Item[]) => {
      const shuffled = [...source].sort(() => Math.random() - 0.5);
      setOrder(shuffled.map((x) => x.id));
      setCursor(0);
      setCorrect(0);
      setAttempted(0);
      setStreak(0);
      setReveal(null);
      setTyping("");
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [],
  );

  const load = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    try {
      const deckRes = await apiClient.learner.vocabulary.getDeck(deckId);
      setDeck(unwrap(deckRes));

      // Lấy nhiều items để chơi game (loop theo trang, có giới hạn để tránh quá nặng)
      const acc: Item[] = [];
      let page = 1;
      // BE validate limit <= 100
      let limit = 100;
      let totalPages = 1;
      const maxItems = 2000;
      const maxPages = 12;

      while (page <= totalPages && page <= maxPages && acc.length < maxItems) {
        let res: any;
        try {
          res = await apiClient.learner.vocabulary.listItems(deckId, {
            page,
            limit,
            sort: "sortOrder",
            order: "ASC",
          });
        } catch (e: any) {
          // Fallback nếu BE có constraint limit chặt hơn
          const msg = String(e?.message ?? "");
          if (msg.toLowerCase().includes("limit") && limit > 50) {
            limit = 50;
            continue;
          }
          throw e;
        }
        const p = unwrap(res);
        const batch = (p?.items ?? []) as Item[];
        acc.push(...batch);
        const meta = p?.meta ?? {};
        totalPages = Number(meta.totalPages ?? 1);
        if (!batch.length) break;
        page += 1;
      }

      setItems(acc);
      buildSession(acc);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được dữ liệu luyện tập", message: e.message || "Thử lại" });
      setDeck(null);
      setItems([]);
      setOrder([]);
    } finally {
      setLoading(false);
    }
  }, [buildSession, deckId, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setReveal(null);
    setTyping("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [cursor, mode]);

  const mcq = useMemo(() => {
    if (!current) return null;
    const distractors = sampleDistinct(
      items.filter((x) => x.id !== current.id),
      3,
    );
    const options = [...distractors, current].sort(() => Math.random() - 0.5);
    return { prompt: current.word, options };
  }, [current, items]);

  const next = () => {
    const nextCursor = cursor + 1;
    if (nextCursor >= order.length) {
      setCursor(order.length); // clamp
      setReveal(null);
      return;
    }
    setCursor(nextCursor);
  };

  const restart = () => buildSession(items);

  const answerMcq = (choice: Item) => {
    if (!current || reveal) return;
    const ok = choice.id === current.id;
    setAttempted((x) => x + 1);
    if (ok) {
      setCorrect((x) => x + 1);
      setStreak((x) => x + 1);
      setReveal({ ok: true, message: "Chuẩn!" });
    } else {
      setStreak(0);
      setReveal({ ok: false, message: `Sai — đáp án: ${current.meaning}` });
    }
  };

  const submitTyping = () => {
    if (!current || reveal) return;
    const ok = normalizeAnswer(typing) === normalizeAnswer(current.word);
    setAttempted((x) => x + 1);
    if (ok) {
      setCorrect((x) => x + 1);
      setStreak((x) => x + 1);
      setReveal({ ok: true, message: "Chuẩn!" });
    } else {
      setStreak(0);
      setReveal({ ok: false, message: `Chưa đúng — từ đúng: ${current.word}` });
    }
  };

  const done = order.length > 0 && cursor >= order.length;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

  if (!deckId) return null;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/student/vocabulary/${deckId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:underline dark:text-amber-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại bộ từ
        </Link>
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
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" />
            Làm lại
          </button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mini-games luyện từ vựng</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {deck?.title ? <span className="font-semibold">{deck.title}</span> : "Bộ từ"} — chọn chế độ, làm nhanh theo vòng, tập trung tốc độ + độ chính xác.
        </p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : !deck || items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600/40 dark:bg-transparent">
          <p className="text-sm text-slate-600 dark:text-slate-300">Bộ từ trống hoặc chưa tải được dữ liệu.</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            Tải lại
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-transparent">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Chế độ</p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => setMode("mcq")}
                className={[
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  mode === "mcq"
                    ? "border-amber-300 bg-amber-50 text-slate-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-slate-100"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:hover:bg-white/5",
                ].join(" ")}
              >
                <span className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-amber-500" />
                  <span>
                    <span className="block text-sm font-semibold">Trắc nghiệm 4 đáp án</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Chọn nghĩa đúng</span>
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("typing")}
                className={[
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  mode === "typing"
                    ? "border-amber-300 bg-amber-50 text-slate-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-slate-100"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:hover:bg-white/5",
                ].join(" ")}
              >
                <span className="flex items-center gap-3">
                  <Keyboard className="h-4 w-4 text-amber-500" />
                  <span>
                    <span className="block text-sm font-semibold">Gõ từ theo nghĩa</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Tập recall chủ động</span>
                  </span>
                </span>
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-600/40 dark:bg-slate-950/20">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Đúng</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{correct}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Đã làm</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{attempted}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Chính xác</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{accuracy}%</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Chuỗi</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{streak}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-600/40 dark:bg-transparent">
            {done ? (
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Hoàn thành vòng luyện</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Bạn đúng <span className="font-semibold">{correct}</span>/<span className="font-semibold">{attempted}</span> ({accuracy}%).
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                  >
                    Luyện lại
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/student/vocabulary/${deckId}`)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    Về bộ từ
                  </button>
                </div>
              </div>
            ) : !current ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Không có câu hỏi.</p>
            ) : mode === "mcq" && mcq ? (
              <div>
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Chọn nghĩa đúng</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {mcq.prompt}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {current.pronunciation ? <span className="font-mono">{current.pronunciation}</span> : null}
                    {current.pronunciation ? <span className="mx-2 text-slate-300">·</span> : null}
                    <span className="font-semibold">{current.wordType}</span>
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {mcq.options.map((opt) => {
                    const isCorrect = reveal ? opt.id === current.id : false;
                    const isChosenWrong = reveal && !reveal.ok && opt.id !== current.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={!!reveal}
                        onClick={() => answerMcq(opt)}
                        className={[
                          "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
                          !reveal
                            ? "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/5"
                            : isCorrect
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                              : isChosenWrong
                                ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100"
                                : "border-slate-200 bg-white text-slate-600 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-300",
                        ].join(" ")}
                      >
                        {opt.meaning}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {reveal ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className={[
                        "mt-4 rounded-xl border p-4 text-sm",
                        reveal.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                          : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">{reveal.message}</div>
                        <button
                          type="button"
                          onClick={next}
                          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                        >
                          Câu tiếp
                        </button>
                      </div>
                      <p className="mt-2 text-slate-700 dark:text-slate-200">
                        Ví dụ: <span className="italic">{current.exampleSentence}</span>
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Gõ từ theo nghĩa</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{current.meaning}</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {current.wordType ? <span className="font-semibold">{current.wordType}</span> : null}
                    {current.pronunciation ? <span className="mx-2 text-slate-300">·</span> : null}
                    {current.pronunciation ? <span className="font-mono">{current.pronunciation}</span> : null}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={inputRef}
                    value={typing}
                    onChange={(e) => setTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitTyping();
                    }}
                    placeholder="Nhập từ tiếng Anh…"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={submitTyping}
                    disabled={!typing.trim() || !!reveal}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
                  >
                    Kiểm tra
                  </button>
                </div>

                <AnimatePresence>
                  {reveal ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className={[
                        "mt-4 rounded-xl border p-4 text-sm",
                        reveal.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                          : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">{reveal.message}</div>
                        <button
                          type="button"
                          onClick={next}
                          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                        >
                          Câu tiếp
                        </button>
                      </div>
                      <p className="mt-2 text-slate-700 dark:text-slate-200">
                        Ví dụ: <span className="italic">{current.exampleSentence}</span>
                      </p>
                    </motion.div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Mẹo: Enter để kiểm tra. Mục tiêu là “nhớ ra từ” chứ không chỉ nhận biết.
                    </p>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

