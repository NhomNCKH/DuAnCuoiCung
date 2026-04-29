"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Ear,
  FlipHorizontal2,
  Keyboard,
  Loader2,
  RotateCcw,
  Target,
  Timer,
  Volume2,
  VolumeX,
} from "lucide-react";
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

type Mode = "mcq" | "typing" | "flash" | "listen_mcq";

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

type SpeakSupport = "unknown" | "supported" | "unsupported";

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
  const [flashFlipped, setFlashFlipped] = useState(false);

  const [speakSupport, setSpeakSupport] = useState<SpeakSupport>("unknown");
  const [voicesReady, setVoicesReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
      setFlashFlipped(false);
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
    setFlashFlipped(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [cursor, mode]);

  useEffect(() => {
    // Web Speech API detection
    const supported =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined";
    setSpeakSupport(supported ? "supported" : "unsupported");
    if (!supported) return;
    const synth = window.speechSynthesis;
    const markReady = () => {
      const v = synth.getVoices();
      setVoicesReady(v.length > 0);
    };
    markReady();
    synth.addEventListener?.("voiceschanged", markReady as any);
    return () => synth.removeEventListener?.("voiceschanged", markReady as any);
  }, []);

  const resolveEnglishVoice = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices?.() ?? [];
    if (!voices.length) return null;
    const prefer = (predicate: (v: SpeechSynthesisVoice) => boolean) =>
      voices.find(predicate) ?? null;
    return (
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en")) ||
      voices[0] ||
      null
    );
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (speakSupport !== "supported") {
        notify({
          variant: "error",
          title: "Thiết bị không hỗ trợ nghe phát âm",
          message: "Hãy thử Chrome/Edge để dùng Web Speech API.",
        });
        return;
      }
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const voice = resolveEnglishVoice();
        if (voice) utter.voice = voice;
        utter.lang = voice?.lang || "en-US";
        utter.rate = 0.95;
        utter.pitch = 1;
        utter.volume = 1;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        synth.speak(utter);
      } catch {
        setIsSpeaking(false);
      }
    },
    [notify, resolveEnglishVoice, speakSupport],
  );

  const mcq = useMemo(() => {
    if (!current) return null;
    const distractors = sampleDistinct(
      items.filter((x) => x.id !== current.id),
      3,
    );
    const options = [...distractors, current].sort(() => Math.random() - 0.5);
    return { prompt: current.word, options };
  }, [current, items]);

  const listenMcq = useMemo(() => {
    if (!current) return null;
    const distractors = sampleDistinct(
      items.filter((x) => x.id !== current.id),
      3,
    );
    const options = [...distractors, current].sort(() => Math.random() - 0.5);
    return { options };
  }, [current, items]);

  useEffect(() => {
    // Auto-speak when entering listening mode or when moving to next question.
    if (mode !== "listen_mcq") return;
    if (!current) return;
    if (speakSupport !== "supported") return;
    // Delay a bit to avoid interrupt when UI updates.
    const t = setTimeout(() => speakText(current.word), 150);
    return () => clearTimeout(t);
  }, [current, mode, speakSupport, speakText]);

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

  const answerListenMcq = (choice: Item) => {
    if (!current || reveal) return;
    const ok = choice.id === current.id;
    setAttempted((x) => x + 1);
    if (ok) {
      setCorrect((x) => x + 1);
      setStreak((x) => x + 1);
      setReveal({ ok: true, message: "Đúng" });
    } else {
      setStreak(0);
      setReveal({ ok: false, message: "Sai" });
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

  const flashMark = (remembered: boolean) => {
    if (!current) return;
    setAttempted((x) => x + 1);
    if (remembered) {
      setCorrect((x) => x + 1);
      setStreak((x) => x + 1);
      setReveal({ ok: true, message: "Nice" });
    } else {
      setStreak(0);
      setReveal({ ok: false, message: "OK" });
    }
    // auto move next quickly
    setTimeout(() => {
      setReveal(null);
      next();
    }, 350);
  };

  const done = order.length > 0 && cursor >= order.length;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

  if (!deckId) return null;

  const modeCards: Array<{
    id: Mode;
    icon: any;
    title: string;
    hint: string;
  }> = [
    { id: "mcq", icon: Target, title: "MCQ", hint: "Chọn nghĩa" },
    { id: "typing", icon: Keyboard, title: "Typing", hint: "Gõ từ" },
    { id: "flash", icon: FlipHorizontal2, title: "Flash", hint: "Lật thẻ" },
    { id: "listen_mcq", icon: Ear, title: "Listening", hint: "Nghe chọn" },
  ];

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/student/vocabulary/${deckId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại bộ từ
        </Link>
        <div className="flex items-center gap-2">
          <div className="chip gap-2">
            <Timer className="h-4 w-4 text-amber-500" />
            {elapsedMin} phút
          </div>
          <div className="chip gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
            {progressLabel}
          </div>
          <button
            type="button"
            onClick={restart}
            className="btn-secondary rounded-2xl px-3 py-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : !deck || items.length === 0 ? (
        <div className="surface p-6">
          <p className="text-sm text-muted">Bộ từ trống hoặc chưa tải được dữ liệu.</p>
          <button
            type="button"
            onClick={load}
            className="btn-primary mt-4 rounded-2xl px-4 py-2"
          >
            Tải lại
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <aside className="surface p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {modeCards.map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                const disabled = m.id === "listen_mcq" && speakSupport === "unsupported";
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setMode(m.id)}
                    className={[
                      "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                      active
                        ? "border-blue-300 bg-blue-50 text-slate-900 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-slate-100"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                      disabled ? "opacity-50" : "",
                    ].join(" ")}
                    title={disabled ? "Trình duyệt không hỗ trợ audio" : m.title}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-blue-700 dark:bg-white/10 dark:text-blue-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold">{m.title}</div>
                      <div className="text-xs text-muted">{m.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              <div className="surface-soft rounded-2xl px-3 py-2 text-center">
                <div className="text-xs text-muted">✓</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{correct}</div>
              </div>
              <div className="surface-soft rounded-2xl px-3 py-2 text-center">
                <div className="text-xs text-muted">#</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{attempted}</div>
              </div>
              <div className="surface-soft rounded-2xl px-3 py-2 text-center">
                <div className="text-xs text-muted">%</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{accuracy}</div>
              </div>
              <div className="surface-soft rounded-2xl px-3 py-2 text-center">
                <div className="text-xs text-muted">🔥</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{streak}</div>
              </div>
            </div>
          </aside>

          <section className="surface p-5">
            {done ? (
              <div className="text-center">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Xong</h2>
                <div className="mt-5 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={restart}
                    className="btn-primary rounded-2xl px-4 py-2"
                  >
                    Chơi lại
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/student/vocabulary/${deckId}`)}
                    className="btn-secondary rounded-2xl px-4 py-2"
                  >
                    Về bộ từ
                  </button>
                </div>
              </div>
            ) : !current ? (
              <p className="text-sm text-muted">Không có câu hỏi.</p>
            ) : mode === "flash" ? (
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Flash</div>
                  <button
                    type="button"
                    onClick={() => setFlashFlipped((v) => !v)}
                    className="btn-secondary rounded-2xl px-3 py-2"
                  >
                    <FlipHorizontal2 className="h-4 w-4" />
                    Lật
                  </button>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setFlashFlipped((v) => !v)}
                    className="group block w-full text-left"
                    aria-label="Lật thẻ"
                  >
                    <div className="flex w-full justify-center">
                      <div
                        className="relative h-[200px] w-full max-w-[560px] rounded-3xl"
                        style={{ perspective: 1200 }}
                      >
                      <motion.div
                        animate={{ rotateY: flashFlipped ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 24 }}
                        className="relative h-full w-full rounded-3xl"
                        style={{
                          transformStyle: "preserve-3d",
                        }}
                      >
                        {/* Front */}
                        <div
                          className="absolute inset-0 flex h-full flex-col justify-between rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-7 text-slate-900 shadow-sm transition-shadow group-hover:shadow-md dark:border-blue-400/60 dark:bg-gradient-to-br dark:from-[#2f7cff] dark:via-[#3a2a70] dark:to-[#ffbf2f] dark:text-slate-100 dark:ring-2 dark:ring-blue-400/45 dark:shadow-[0_26px_90px_rgba(47,124,255,0.28)]"
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          <div className="text-xs font-semibold text-muted">Tap to flip</div>
                          <div className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                            {current.word}
                          </div>
                          <div className="mt-3 text-sm text-muted">
                            {current.pronunciation ? (
                              <span className="font-mono">{current.pronunciation}</span>
                            ) : (
                              <span>&nbsp;</span>
                            )}
                          </div>
                        </div>

                        {/* Back */}
                        <div
                          className="absolute inset-0 flex h-full flex-col justify-between rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-7 text-slate-900 shadow-sm transition-shadow group-hover:shadow-md dark:border-violet-400/60 dark:bg-gradient-to-br dark:from-[#a78bfa] dark:via-[#2f7cff] dark:to-[#22c55e] dark:text-slate-100 dark:ring-2 dark:ring-violet-400/45 dark:shadow-[0_26px_90px_rgba(167,139,250,0.28)]"
                          style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <div className="text-xs font-semibold text-muted">Meaning</div>
                          <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                            {current.meaning}
                          </div>
                          <div className="mt-3 text-sm text-muted">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {current.word}
                            </span>
                            {current.wordType ? (
                              <span className="ml-2 text-muted">· {current.wordType}</span>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                    </div>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => flashMark(false)} className="btn-secondary rounded-2xl px-4 py-2">
                    Chưa nhớ
                  </button>
                  <button type="button" onClick={() => flashMark(true)} className="btn-primary rounded-2xl px-4 py-2">
                    Nhớ
                  </button>
                </div>
              </div>
            ) : mode === "listen_mcq" && current && listenMcq ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Listening</div>
                  <button
                    type="button"
                    onClick={() => speakText(current.word)}
                    disabled={speakSupport === "unsupported" || !voicesReady}
                    className="btn-secondary rounded-2xl px-3 py-2 disabled:opacity-50"
                    title={speakSupport === "unsupported" ? "Không hỗ trợ audio" : "Nghe lại"}
                  >
                    {speakSupport === "unsupported" ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-blue-700" : ""}`} />
                    )}
                    Nghe
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">?</div>
                  <div className="text-sm text-muted">{current.pronunciation ? <span className="font-mono">{current.pronunciation}</span> : ""}</div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {listenMcq.options.map((opt) => {
                    const isCorrect = reveal ? opt.id === current.id : false;
                    const isWrong = reveal && opt.id !== current.id && !reveal.ok;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={!!reveal}
                        onClick={() => answerListenMcq(opt)}
                        className={[
                          "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                          !reveal
                            ? "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                            : isCorrect
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                              : isWrong
                                ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100"
                                : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
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
                      className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {reveal.ok ? "Đúng" : "Sai"} · <span className="text-muted">{current.word}</span>
                      </div>
                      <button type="button" onClick={() => { setReveal(null); next(); }} className="btn-primary rounded-2xl px-4 py-2">
                        Next
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : mode === "mcq" && mcq ? (
              <div>
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">MCQ</p>
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
                        "mt-4 rounded-2xl border p-4 text-sm",
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
                          className="btn-primary rounded-2xl px-4 py-2"
                        >
                          Next
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Typing</p>
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
                    className="input-modern w-full px-4 py-3 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={submitTyping}
                    disabled={!typing.trim() || !!reveal}
                    className="btn-primary shrink-0 rounded-2xl px-4 py-3 disabled:opacity-50"
                  >
                    Check
                  </button>
                </div>

                <AnimatePresence>
                  {reveal ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className={[
                        "mt-4 rounded-2xl border p-4 text-sm",
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
                          className="btn-primary rounded-2xl px-4 py-2"
                        >
                          Next
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

