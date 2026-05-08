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
  Ear,
  FlipHorizontal2,
  Keyboard,
  Target,
  Volume2,
  VolumeX,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import { parseVocabMeta } from "@/lib/flashcard-vocab";

type Card = {
  id: string;
  front: string;
  back: string;
  note?: string | null;
  tags?: string[] | null;
};

type Rating = "again" | "good";
type Mode = "flash" | "mcq" | "typing" | "listen_mcq";

type SpeakSupport = "unknown" | "supported" | "unsupported";

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

export default function FlashcardStudyPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = String((params as any)?.deckId ?? "");
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [mode, setMode] = useState<Mode>("flash");
  const [reveal, setReveal] = useState<{ ok: boolean; correct: string } | null>(null);
  const [typing, setTyping] = useState("");
  const typingRef = useRef<HTMLInputElement | null>(null);
  const [flashFlipped, setFlashFlipped] = useState(false);

  const [startedAt] = useState(() => Date.now());
  const questionStartedAtRef = useRef<number | null>(null);

  const [speakSupport, setSpeakSupport] = useState<SpeakSupport>("unknown");
  const [voicesReady, setVoicesReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const current = queue[index] ?? null;
  const currentMeta = current ? parseVocabMeta(current.note) : null;
  const currentFront = current?.front || currentMeta?.expression || "";
  const currentBack =
    current?.back || currentMeta?.meaningVi || currentMeta?.meaningEn || "";
  const currentAudioPrompt =
    currentMeta?.expression || current?.front || current?.back || "";

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
      setReveal(null);
      setTyping("");
      questionStartedAtRef.current = Date.now();
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
    // Speech synthesis detection
    const supported =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined";
    setSpeakSupport(supported ? "supported" : "unsupported");
    if (!supported) return;
    const synth = window.speechSynthesis;
    const markReady = () => setVoicesReady((synth.getVoices?.() ?? []).length > 0);
    markReady();
    synth.addEventListener?.("voiceschanged", markReady as any);
    return () => synth.removeEventListener?.("voiceschanged", markReady as any);
  }, []);

  const availableVoices = useMemo(() => {
    void voicesReady;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    return window.speechSynthesis.getVoices?.() ?? [];
  }, [voicesReady]);

  const resolveEnglishVoice = useMemo(() => {
    if (!availableVoices.length) return null;
    const prefer = (predicate: (v: SpeechSynthesisVoice) => boolean) =>
      availableVoices.find(predicate) ?? null;
    return (
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en")) ||
      availableVoices[0] ||
      null
    );
  }, [availableVoices]);

  const speakFront = (text: string) => {
    if (speakSupport !== "supported") return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      if (resolveEnglishVoice) utter.voice = resolveEnglishVoice;
      utter.lang = resolveEnglishVoice?.lang || "en-US";
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
  };

  const submit = async (rating: Rating) => {
    if (!current) return;
    setSubmitting(true);
    try {
      const now = Date.now();
      const startedAtMs = questionStartedAtRef.current ?? now;
      const timeMs = now - startedAtMs;

      const res = await apiClient.learner.flashcards.submitReview({
        flashcardId: current.id,
        rating,
        timeMs,
      });
      const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
      const nextDue = payload?.nextDueAt ? new Date(payload.nextDueAt).toLocaleString("vi-VN") : "—";
      notify({
        variant: "success",
        title: rating === "good" ? "Đã chấm: Nhớ" : "Đã chấm: Chưa nhớ",
        message: `Lịch ôn tiếp theo: ${nextDue}`,
        durationMs: 1800,
      });

      const nextIndex = index + 1;
      if (nextIndex >= queue.length) {
        setSessionDone(true);
        return;
      }
      setIndex(nextIndex);
      setReveal(null);
      setTyping("");
      questionStartedAtRef.current = Date.now();
      setTimeout(() => typingRef.current?.focus(), 0);
    } catch (e: any) {
      notify({ variant: "error", title: "Ghi kết quả thất bại", message: e.message || "Vui lòng thử lại" });
    } finally {
      setSubmitting(false);
    }
  };

  const elapsedMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  const modeCards: Array<{ id: Mode; icon: any; title: string; hint: string; disabled?: boolean }> =
    [
      { id: "flash", icon: FlipHorizontal2, title: "Flash", hint: "Lật thẻ" },
      { id: "mcq", icon: Target, title: "MCQ", hint: "Chọn đáp án" },
      { id: "typing", icon: Keyboard, title: "Typing", hint: "Gõ đáp án" },
      { id: "listen_mcq", icon: Ear, title: "Listening", hint: "Nghe chọn", disabled: speakSupport === "unsupported" },
    ];

  const mcq = useMemo(() => {
    if (!current) return null;
    const distractors = sampleDistinct(queue.filter((x) => x.id !== current.id), 3);
    const options = [...distractors, current].sort(() => Math.random() - 0.5);
    return { options };
  }, [current, queue]);

  useEffect(() => {
    setReveal(null);
    setTyping("");
    setFlashFlipped(false);
    questionStartedAtRef.current = Date.now();
    setTimeout(() => typingRef.current?.focus(), 0);
    if (mode === "listen_mcq" && current && speakSupport === "supported") {
      const t = setTimeout(() => speakFront(currentAudioPrompt), 150);
      return () => clearTimeout(t);
    }
  }, [current?.id, mode, currentAudioPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/student/flashcards/${deckId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại bộ thẻ
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
          <button type="button" onClick={loadQueue} className="btn-secondary rounded-2xl px-3 py-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : sessionDone ? (
        <div className="surface-soft py-14 text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Xong</p>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={loadQueue} className="btn-primary rounded-2xl px-4 py-2">
              Lấy lượt mới
            </button>
            <Link href={`/student/flashcards/${deckId}`} className="btn-secondary rounded-2xl px-4 py-2">
              Về bộ thẻ
            </Link>
          </div>
        </div>
      ) : !current ? (
        <div className="surface-soft py-14 text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Không có thẻ</p>
          <div className="mt-5 flex justify-center">
            <Link href={`/student/flashcards/${deckId}`} className="btn-primary rounded-2xl px-4 py-2">
              Về bộ thẻ <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <aside className="surface p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {modeCards.map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                const disabled = Boolean(m.disabled);
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
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {reveal?.ok ? 1 : 0}
                </div>
              </div>
              <div className="surface-soft rounded-2xl px-3 py-2 text-center">
                <div className="text-xs text-muted">#</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {reveal ? 1 : 0}
                </div>
              </div>
              <div className="surface-soft rounded-2xl px-3 py-2 text-center">
                <div className="text-xs text-muted">%</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {reveal ? (reveal.ok ? 100 : 0) : 0}
                </div>
              </div>
              <div className="surface-soft rounded-2xl px-3 py-2 text-center">
                <div className="text-xs text-muted">🔥</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">0</div>
              </div>
            </div>
          </aside>

          <section className="surface p-5">
            {mode === "flash" ? (
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Flash</div>
                  <button type="button" onClick={() => setFlashFlipped((v) => !v)} className="btn-secondary rounded-2xl px-3 py-2">
                    <FlipHorizontal2 className="h-4 w-4" />
                    Lật
                  </button>
                </div>

                <div className="mt-4">
                  <button type="button" onClick={() => setFlashFlipped((v) => !v)} className="group block w-full text-left" aria-label="Lật thẻ">
                    <div className="flex w-full justify-center">
                      <div className="relative h-[200px] w-full max-w-[560px] rounded-3xl" style={{ perspective: 1200 }}>
                        <div className="pointer-events-none absolute -inset-6 hidden rounded-[2rem] opacity-70 blur-2xl dark:block">
                          <div className="h-full w-full rounded-[2rem] bg-gradient-to-r from-blue-500/35 via-violet-500/30 to-amber-400/30" />
                        </div>
                        <div className="pointer-events-none absolute -inset-3 hidden rounded-[2rem] opacity-70 blur-xl dark:block">
                          <div className="h-full w-full rounded-[2rem] bg-gradient-to-br from-blue-400/22 via-sky-400/16 to-violet-400/22" />
                        </div>

                        <motion.div
                          animate={{ rotateY: flashFlipped ? 180 : 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 24 }}
                          className="relative h-full w-full rounded-3xl"
                          style={{ transformStyle: "preserve-3d" }}
                        >
                          <div
                            className="absolute inset-0 flex h-full flex-col justify-between rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-7 text-slate-900 shadow-sm transition-shadow group-hover:shadow-md dark:border-blue-400/60 dark:bg-gradient-to-br dark:from-[#2f7cff] dark:via-[#3a2a70] dark:to-[#ffbf2f] dark:text-slate-100 dark:ring-2 dark:ring-blue-400/45 dark:shadow-[0_26px_90px_rgba(47,124,255,0.28)]"
                            style={{ backfaceVisibility: "hidden" }}
                          >
                            <div className="text-xs font-semibold text-muted">Mặt trước · chạm để lật</div>
                            <div className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">{currentFront}</div>
                            <div className="mt-3 flex min-h-6 flex-wrap items-center gap-2 text-sm text-muted">
                              {currentMeta?.partOfSpeech ? <span className="chip text-[11px] font-bold">{currentMeta.partOfSpeech}</span> : null}
                              {currentMeta?.pronunciation ? <span className="font-mono">{currentMeta.pronunciation}</span> : null}
                              {currentMeta?.meaningEn ? <span className="line-clamp-1">{currentMeta.meaningEn}</span> : null}
                            </div>
                          </div>

                          <div
                            className="absolute inset-0 flex h-full flex-col justify-between rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-7 text-slate-900 shadow-sm transition-shadow group-hover:shadow-md dark:border-violet-400/60 dark:bg-gradient-to-br dark:from-[#a78bfa] dark:via-[#2f7cff] dark:to-[#22c55e] dark:text-slate-100 dark:ring-2 dark:ring-violet-400/45 dark:shadow-[0_26px_90px_rgba(167,139,250,0.28)]"
                            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                          >
                            <div className="text-xs font-semibold text-muted">Mặt sau</div>
                            <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{currentBack}</div>
                            <div className="mt-3 text-sm text-muted space-y-1">
                              <div className="linimage.pnge-clamp-1">
                                <span className="font-semibold">Từ:</span> {currentFront}
                              </div>
                              {currentMeta?.exampleVi || currentMeta?.exampleEn || current.tags?.[0] ? (
                                <div className="line-clamp-2">{currentMeta?.exampleVi || currentMeta?.exampleEn || current.tags?.[0]}</div>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : mode === "typing" ? (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Typing</div>
                <h2 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-slate-100">{currentFront}</h2>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={typingRef}
                    value={typing}
                    onChange={(e) => setTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !reveal) {
                        const ok = normalizeAnswer(typing) === normalizeAnswer(currentBack);
                        setReveal({ ok, correct: currentBack });
                      }
                    }}
                    placeholder="Nhập mặt sau…"
                    className="input-modern w-full px-4 py-3 font-semibold"
                  />
                  <button
                    type="button"
                    disabled={!typing.trim() || !!reveal}
                    onClick={() => {
                      const ok = normalizeAnswer(typing) === normalizeAnswer(currentBack);
                      setReveal({ ok, correct: currentBack });
                    }}
                    className="btn-primary shrink-0 rounded-2xl px-4 py-3 disabled:opacity-50"
                  >
                    Check
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">{mode === "listen_mcq" ? "Listening" : "MCQ"}</div>
                  {mode === "listen_mcq" ? (
                    <button
                      type="button"
                      onClick={() => speakFront(currentAudioPrompt)}
                      disabled={speakSupport !== "supported" || !voicesReady}
                      className="btn-secondary rounded-2xl px-3 py-2 disabled:opacity-50"
                    >
                      {speakSupport !== "supported" ? <VolumeX className="h-4 w-4" /> : <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-blue-700" : ""}`} />}
                      Nghe
                    </button>
                  ) : null}
                </div>
                <h2 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-slate-100">{mode === "listen_mcq" ? "Chọn đáp án" : currentFront}</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(mcq?.options ?? []).map((opt) => {
                    const isCorrect = reveal ? opt.id === current.id : false;
                    const isWrong = reveal && opt.id !== current.id && !reveal.ok;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={!!reveal}
                        onClick={() => {
                          const ok = opt.id === current.id;
                          setReveal({ ok, correct: currentBack });
                        }}
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
                        {opt.back}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {reveal ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {reveal.ok ? "Đúng" : "Sai"} · <span className="font-mono">{reveal.correct}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={submitting} onClick={() => submit("again")} className="btn-secondary rounded-2xl px-4 py-2 disabled:opacity-50">
                    Chưa nhớ
                  </button>
                  <button type="button" disabled={submitting} onClick={() => submit("good")} className="btn-primary rounded-2xl px-4 py-2 disabled:opacity-50">
                    Nhớ
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
