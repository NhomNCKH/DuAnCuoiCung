"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronLeft,
  CheckCircle2,
  Clock3,
  Layers3,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Search,
  Volume2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";

type SpeakingResult = {
  overallScore?: number;
  criteria?: {
    pronunciation?: number;
    fluency?: number;
    grammar?: number;
    vocabulary?: number;
    relevance?: number;
  };
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  evidence?: string[];
  actionPlan?: string[];
  improvements?: string[];
  betterAnswer?: string;
};

type SpeakingTask = {
  id: string;
  code?: string;
  title?: string;
  prompt?: string;
  taskType?: string;
  targetSeconds?: number | null;
  tips?: string[];
};

type SpeakingSetItem = {
  id: string;
  sortOrder?: number;
  task?: SpeakingTask;
};

type SpeakingSetDetail = {
  id: string;
  code?: string;
  title?: string;
  totalQuestions?: number;
  timeLimitSec?: number | null;
  items?: SpeakingSetItem[];
};

type ItemFeedback = {
  loading: boolean;
  rawText: string | null;
  parsed: SpeakingResult | null;
};

function extractList(raw: any): any[] {
  const data = raw?.data?.data ?? raw?.data ?? raw;
  return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
}

function extractData(raw: any): any {
  return raw?.data?.data ?? raw?.data ?? raw;
}

function parseAiJson(text: string): SpeakingResult | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function toPercent(score?: number): number {
  const n = Number(score ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round((n / 200) * 100)));
}

const SPEAKING_PART_LABEL: Record<string, string> = {
  read_aloud: "Part 1 - Read aloud",
  describe_picture: "Part 2 - Describe a picture",
  respond_to_questions: "Part 3 - Respond to questions",
  respond_using_info: "Part 4 - Respond using info",
  express_opinion: "Part 5 - Express an opinion",
  respond_to_question: "Part 6 - Respond to question",
};
const SPEAKING_BAR_COUNT = 140;
const SPEAKING_BAR_MIN = 0;

function formatCountdown(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SpeakingPage() {
  const { notify } = useToast();

  const [setsLoading, setSetsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sets, setSets] = useState<SpeakingSetDetail[]>([]);
  const [viewMode, setViewMode] = useState<"sets" | "practice">("sets");
  const [setKeyword, setSetKeyword] = useState("");
  const [setId, setSetId] = useState("");
  const [setDetail, setSetDetail] = useState<SpeakingSetDetail | null>(null);
  const [itemId, setItemId] = useState("");
  const [timerSetId, setTimerSetId] = useState("");
  const [examRemainingSec, setExamRemainingSec] = useState<number | null>(null);

  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startAtRef = useRef<number | null>(null);
  const recogRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [audioBars, setAudioBars] = useState<number[]>(
    () => Array.from({ length: SPEAKING_BAR_COUNT }, () => SPEAKING_BAR_MIN),
  );

  const [transcriptByItem, setTranscriptByItem] = useState<Record<string, string>>({});
  const [feedbackByItem, setFeedbackByItem] = useState<Record<string, ItemFeedback>>({});
  const activeItemIdRef = useRef("");
  const timeUpNotifiedRef = useRef(false);

  const sortedItems = useMemo(() => {
    const items = (setDetail?.items ?? []).slice();
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return items;
  }, [setDetail]);

  const itemOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    sortedItems.forEach((it, idx) => {
      map[it.id] = idx + 1;
    });
    return map;
  }, [sortedItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, SpeakingSetItem[]> = {};
    for (const it of sortedItems) {
      const key = String(it.task?.taskType || "other");
      if (!groups[key]) groups[key] = [];
      groups[key].push(it);
    }
    return Object.entries(groups);
  }, [sortedItems]);

  const activeItem = useMemo(
    () => sortedItems.find((x) => x.id === itemId) ?? sortedItems[0] ?? null,
    [sortedItems, itemId],
  );

  const activeTask = activeItem?.task ?? null;
  const activeTranscript = itemId ? (transcriptByItem[itemId] ?? "") : "";
  const activeFeedback = itemId ? feedbackByItem[itemId] : undefined;

  const doneCount = useMemo(
    () =>
      sortedItems.filter((it) => {
        const key = it.id;
        return Boolean(feedbackByItem[key]?.parsed || transcriptByItem[key]?.trim());
      }).length,
    [sortedItems, feedbackByItem, transcriptByItem],
  );
  const isTimeUp = examRemainingSec !== null && examRemainingSec <= 0;

  const filteredSets = useMemo(() => {
    const kw = setKeyword.trim().toLowerCase();
    if (!kw) return sets;
    return sets.filter((s) => {
      const title = String(s.title ?? "").toLowerCase();
      const code = String(s.code ?? "").toLowerCase();
      return title.includes(kw) || code.includes(kw);
    });
  }, [sets, setKeyword]);

  const setsTotalQuestions = useMemo(
    () => filteredSets.reduce((sum, s) => sum + Number(s.totalQuestions ?? 0), 0),
    [filteredSets],
  );

  useEffect(() => {
    activeItemIdRef.current = itemId;
  }, [itemId]);

  useEffect(() => {
    if (viewMode !== "practice" || !setDetail?.id) return;
    const limit = Number(setDetail.timeLimitSec ?? 0) || 0;
    if (limit <= 0) {
      setExamRemainingSec(null);
      return;
    }
    if (timerSetId !== setDetail.id) {
      setTimerSetId(setDetail.id);
      setExamRemainingSec(limit);
      timeUpNotifiedRef.current = false;
      return;
    }
    if (isTimeUp) return;
    const timer = window.setInterval(() => {
      setExamRemainingSec((prev) => {
        if (prev == null) return prev;
        return Math.max(0, prev - 1);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [viewMode, setDetail?.id, setDetail?.timeLimitSec, timerSetId, isTimeUp]);

  useEffect(() => {
    if (!isTimeUp || timeUpNotifiedRef.current) return;
    timeUpNotifiedRef.current = true;
    stopRecord();
    notify({
      variant: "warning",
      title: "Hết thời gian làm bài",
      message: "Bạn đã hết thời gian. Có thể xem lại nội dung đã làm và kết quả hiện có.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeUp]);

  useEffect(() => {
    if (!listening || startAtRef.current == null) return;
    const timer = window.setInterval(() => {
      if (startAtRef.current == null) return;
      setElapsedSec(Math.max(0, Math.round((Date.now() - startAtRef.current) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [listening]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";

    recog.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += `${event.results[i]?.[0]?.transcript ?? ""} `;
      }
      const currentItemId = activeItemIdRef.current;
      if (!currentItemId) return;
      setTranscriptByItem((prev) => ({ ...prev, [currentItemId]: text.trim() }));
    };

    recog.onerror = () => {
      stopVisualizer();
      setListening(false);
    };
    recog.onend = () => {
      stopVisualizer();
      setListening(false);
    };

    recogRef.current = recog;
    return () => {
      try {
        recog.stop();
      } catch {}
      stopVisualizer();
    };
  }, []);

  async function loadSets() {
    setSetsLoading(true);
    try {
      const res = await apiClient.learner.skillTasks.listSpeakingSets({ page: 1, limit: 50 });
      const list = extractList(res) as SpeakingSetDetail[];
      setSets(list);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được bộ đề Speaking", message: e?.message });
    } finally {
      setSetsLoading(false);
    }
  }

  async function loadSetDetail(targetSetId: string) {
    if (!targetSetId) {
      setSetDetail(null);
      setItemId("");
      return;
    }
    setDetailLoading(true);
    try {
      const res = await apiClient.learner.skillTasks.getSpeakingSet(targetSetId);
      const detail = extractData(res) as SpeakingSetDetail;
      setSetDetail(detail);
      const firstItemId = (detail?.items ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.id ?? "";
      setItemId((prev) => (prev && (detail?.items ?? []).some((x) => x.id === prev) ? prev : firstItemId));
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được chi tiết bộ đề", message: e?.message });
      setSetDetail(null);
      setItemId("");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!setId) return;
    void loadSetDetail(setId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  function startPractice(targetSetId: string) {
    if (!targetSetId) return;
    setTimerSetId("");
    setExamRemainingSec(null);
    timeUpNotifiedRef.current = false;
    setSetId(targetSetId);
    setViewMode("practice");
  }

  function setTranscriptValue(value: string) {
    if (!itemId) return;
    setTranscriptByItem((prev) => ({ ...prev, [itemId]: value }));
  }

  function resetVisualizer() {
    setAudioBars(Array.from({ length: SPEAKING_BAR_COUNT }, () => SPEAKING_BAR_MIN));
  }

  function stopVisualizer() {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    resetVisualizer();
  }

  async function startVisualizer() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    stopVisualizer();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.74;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      micStreamRef.current = stream;

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        const node = analyserRef.current;
        if (!node) return;
        node.getByteFrequencyData(freqData);
        const binsPerBar = Math.max(1, Math.floor(freqData.length / SPEAKING_BAR_COUNT));
        const nextBars = new Array<number>(SPEAKING_BAR_COUNT).fill(SPEAKING_BAR_MIN);
        for (let i = 0; i < SPEAKING_BAR_COUNT; i++) {
          const start = i * binsPerBar;
          const end = Math.min(freqData.length, start + binsPerBar);
          let sum = 0;
          let peak = 0;
          for (let j = start; j < end; j++) {
            const v = freqData[j];
            sum += v;
            if (v > peak) peak = v;
          }
          const avg = end > start ? sum / (end - start) : 0;
          const normalized = Math.max(avg / 255, (peak / 255) * 0.75);
          const boosted = Math.min(1, Math.pow(normalized, 0.8) * 1.9);
          nextBars[i] = Math.max(SPEAKING_BAR_MIN, boosted);
        }
        setAudioBars(nextBars);
        rafRef.current = window.requestAnimationFrame(tick);
      };
      tick();
    } catch {
      resetVisualizer();
    }
  }

  function startRecord() {
    if (!supported || !recogRef.current || !itemId) return;
    setFeedbackByItem((prev) => ({
      ...prev,
      [itemId]: { loading: false, rawText: null, parsed: null },
    }));
    startAtRef.current = Date.now();
    setElapsedSec(0);
    try {
      recogRef.current.start();
      void startVisualizer();
      setListening(true);
    } catch {}
  }

  function stopRecord() {
    try {
      recogRef.current?.stop();
    } catch {}
    stopVisualizer();
    setListening(false);
  }

  async function grade() {
    if (!itemId || !activeTask?.prompt) return;
    const transcript = (transcriptByItem[itemId] ?? "").trim();
    if (!transcript) {
      notify({ variant: "warning", title: "Chưa có transcript", message: "Hãy ghi âm hoặc nhập transcript trước khi chấm." });
      return;
    }

    setFeedbackByItem((prev) => ({
      ...prev,
      [itemId]: { loading: true, rawText: null, parsed: null },
    }));
    try {
      const durationSeconds =
        startAtRef.current != null ? Math.max(0, Math.round((Date.now() - startAtRef.current) / 1000)) : undefined;
      const res = await apiClient.learner.ai.gradeSpeaking({
        prompt: activeTask.prompt ?? "",
        transcript,
        durationSeconds,
        language: "vi",
        taskType: activeTask.taskType,
      });
      const text = (res as any)?.data?.text ?? (res as any)?.text ?? "";
      const parsedFromPayload = ((res as any)?.data?.result ?? (res as any)?.result ?? null) as SpeakingResult | null;
      const parsed = parsedFromPayload ?? (text ? parseAiJson(text) : null);
      setFeedbackByItem((prev) => ({
        ...prev,
        [itemId]: { loading: false, rawText: text || "", parsed },
      }));
      notify({ variant: "success", title: "Đã chấm xong", message: "Đã nhận feedback cho câu hiện tại." });
    } catch (e: any) {
      setFeedbackByItem((prev) => ({
        ...prev,
        [itemId]: { loading: false, rawText: null, parsed: null },
      }));
      notify({ variant: "error", title: "Chấm thất bại", message: e?.message || "Vui lòng thử lại." });
    }
  }

  function speakPrompt() {
    if (!activeTask?.prompt || typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(activeTask.prompt);
    u.lang = "en-US";
    synth.cancel();
    synth.speak(u);
  }

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-10">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                <Mic className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="heading-lg">Luyện nói</h1>
              </div>
            </div>
          </div>
          {viewMode === "practice" ? (
            <div className="relative w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white/80 px-2 py-1 sm:w-[300px] lg:w-[360px] dark:border-slate-700/60 dark:bg-slate-950/35">
              <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t border-dotted border-red-400/70" />
              <div className="grid h-14 w-full grid-cols-[repeat(140,minmax(0,1fr))] items-center gap-px">
                {audioBars.map((v, idx) => (
                  <span
                    key={idx}
                    className={`rounded-[2px] transition-all duration-75 ${listening ? "bg-red-500/95" : "bg-transparent"}`}
                    style={{ height: `${Math.max(1, Math.round(34 * v))}px` }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="chip inline-flex items-center gap-1.5">
              <BookOpenCheck className="h-4 w-4" />
              {viewMode === "sets" ? `${filteredSets.length} bộ đề` : `${doneCount}/${sortedItems.length || 0} câu`}
            </span>
            <span className="chip inline-flex items-center gap-1.5">
              {viewMode === "sets" ? <Layers3 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              {viewMode === "sets"
                ? `${setsTotalQuestions} câu hỏi`
                : examRemainingSec !== null
                  ? `Còn lại ${formatCountdown(examRemainingSec)}`
                  : listening
                    ? `${elapsedSec}s`
                    : "Sẵn sàng"}
            </span>
          </div>
        </div>
      </motion.div>

      {!supported ? (
        <div className="surface mb-4 p-4 text-sm text-slate-700 dark:text-slate-200">
          Trình duyệt chưa hỗ trợ SpeechRecognition. Bạn vẫn có thể nhập transcript thủ công.
        </div>
      ) : null}

      {viewMode === "sets" ? (
        <section className="surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Chọn bộ đề Speaking đã xuất bản</p>
              <p className="text-xs text-muted">Learner chọn bộ đề trước, sau đó vào làm từng câu theo part.</p>
            </div>
            <button type="button" onClick={() => void loadSets()} className="btn-secondary inline-flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(260px,1fr)_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" />
              <input
                value={setKeyword}
                onChange={(e) => setSetKeyword(e.target.value)}
                placeholder="Tìm theo tên bộ đề hoặc mã đề"
                className="input-modern w-full pl-9"
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200">
              {filteredSets.length} bộ đề
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200">
              {setsTotalQuestions} câu hỏi
            </div>
          </div>

          {setsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải bộ đề...
            </div>
          ) : sets.length === 0 ? (
            <p className="text-sm text-muted">Hiện chưa có bộ đề Speaking nào ở trạng thái published.</p>
          ) : filteredSets.length === 0 ? (
            <p className="text-sm text-muted">Không tìm thấy bộ đề phù hợp từ khóa.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSets.map((s) => (
                <div key={s.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-950/30">
                  <div className="h-1 w-full bg-gradient-to-r from-violet-400 via-indigo-500 to-blue-500" />
                  <div className="p-2.5">
                  <p className="truncate font-mono text-xs text-muted">{s.code || "SPEAKING SET"}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{s.title || "Bộ đề Speaking"}</p>
                  <p className="mt-2 text-xs text-muted">
                    {(s.totalQuestions ?? 0)} câu • {Math.round((Number(s.timeLimitSec ?? 0) || 0) / 60)} phút
                  </p>
                  <div className="mt-3">
                    <button type="button" onClick={() => startPractice(s.id)} className="btn-primary inline-flex w-full items-center justify-center gap-2 py-1.5 text-sm">
                      Vào làm bài
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {viewMode === "practice" ? (
      <>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px,1fr]">
        <aside className="surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{setDetail?.title || "Bộ đề TOEIC Speaking"}</p>
            <button type="button" onClick={() => setViewMode("sets")} className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" />
              Bộ đề
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải câu hỏi...
              </div>
            ) : sortedItems.length === 0 ? (
              <p className="text-sm text-muted">Bộ đề này chưa có câu hỏi.</p>
            ) : (
              <div className="space-y-3">
                {groupedItems.map(([partKey, items]) => (
                  <div key={partKey}>
                    <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      {SPEAKING_PART_LABEL[partKey] || partKey.replaceAll("_", " ")} ({items.length})
                    </p>
                    <div className="space-y-2">
                      {items.map((it) => {
                        const active = it.id === itemId;
                        const done = Boolean((transcriptByItem[it.id] ?? "").trim() || feedbackByItem[it.id]?.parsed);
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => {
                              stopRecord();
                              setItemId(it.id);
                              setElapsedSec(0);
                            }}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                              active
                                ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200 dark:hover:bg-slate-900/30"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-semibold">
                                Câu {itemOrderMap[it.id] || "-"}: {it.task?.title || it.task?.taskType || "Speaking task"}
                              </span>
                              {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                            </div>
                            <p className="mt-1 truncate text-xs opacity-80">{it.task?.code || it.task?.taskType || "TOEIC Speaking"}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">Đề bài</p>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="chip">Target: {activeTask?.targetSeconds ?? 0}s</span>
                <button type="button" onClick={speakPrompt} className="btn-secondary inline-flex items-center gap-2" disabled={!activeTask?.prompt}>
                  <Volume2 className="h-4 w-4" />
                  Nghe đề
                </button>
                {!listening ? (
                  <button type="button" onClick={startRecord} disabled={!supported || !itemId || isTimeUp} className="btn-primary inline-flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Ghi âm
                  </button>
                ) : (
                  <button type="button" onClick={stopRecord} className="btn-secondary inline-flex items-center gap-2">
                    <MicOff className="h-4 w-4" />
                    Dừng
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
              {activeTask?.prompt || "Chọn câu hỏi để bắt đầu."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Transcript</p>
                <span className="text-xs text-muted">
                  {activeTranscript.trim() ? `${activeTranscript.trim().split(/\s+/).length} từ` : "0 từ"}
                </span>
              </div>
              <textarea
                value={activeTranscript}
                onChange={(e) => setTranscriptValue(e.target.value)}
                rows={11}
                placeholder="Transcript sẽ xuất hiện ở đây hoặc bạn nhập thủ công..."
                disabled={isTimeUp}
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-500/30 focus:ring-2 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-100"
              />
              <div className="mt-3">
                <button type="button" onClick={grade} disabled={Boolean(activeFeedback?.loading) || !itemId || isTimeUp} className="btn-primary inline-flex items-center gap-2">
                  {activeFeedback?.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Chấm bằng AI
                </button>
              </div>
            </div>

            <div className="surface p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Kết quả AI</p>
              {!activeFeedback?.rawText && !activeFeedback?.loading ? (
                <p className="mt-2 text-sm text-muted">Chấm xong sẽ hiển thị điểm và feedback của câu hiện tại.</p>
              ) : null}

              {activeFeedback?.parsed ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                      Overall: {activeFeedback.parsed.overallScore ?? "—"}/200
                    </span>
                  </div>
                  {activeFeedback.parsed.summary ? (
                    <p className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                      {activeFeedback.parsed.summary}
                    </p>
                  ) : null}
                  {activeFeedback.parsed.criteria ? (
                    <div className="space-y-2">
                      {[
                        { key: "pronunciation", label: "Phát âm", value: activeFeedback.parsed.criteria.pronunciation },
                        { key: "fluency", label: "Độ trôi chảy", value: activeFeedback.parsed.criteria.fluency },
                        { key: "grammar", label: "Ngữ pháp", value: activeFeedback.parsed.criteria.grammar },
                        { key: "vocabulary", label: "Từ vựng", value: activeFeedback.parsed.criteria.vocabulary },
                        { key: "relevance", label: "Đúng trọng tâm", value: activeFeedback.parsed.criteria.relevance },
                      ].map((row) => (
                        <div key={row.key}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                            <span>{row.label}</span>
                            <span>{row.value ?? "—"}/200</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${toPercent(row.value)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {Array.isArray(activeFeedback.parsed.strengths) && activeFeedback.parsed.strengths.length ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Điểm mạnh</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                        {activeFeedback.parsed.strengths.slice(0, 5).map((x, idx) => (
                          <li key={idx}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Array.isArray(activeFeedback.parsed.weaknesses) && activeFeedback.parsed.weaknesses.length ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">Cần cải thiện</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                        {activeFeedback.parsed.weaknesses.slice(0, 6).map((x, idx) => (
                          <li key={idx}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Array.isArray(activeFeedback.parsed.evidence) && activeFeedback.parsed.evidence.length ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">Bằng chứng từ bài nói</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                        {activeFeedback.parsed.evidence.slice(0, 6).map((x, idx) => (
                          <li key={idx}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Array.isArray(activeFeedback.parsed.actionPlan) && activeFeedback.parsed.actionPlan.length ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/40">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Kế hoạch luyện tập</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                        {activeFeedback.parsed.actionPlan.slice(0, 6).map((x, idx) => (
                          <li key={idx}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {activeFeedback.parsed.betterAnswer ? (
                    <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-100">
                      {activeFeedback.parsed.betterAnswer}
                    </div>
                  ) : null}
                </div>
              ) : activeFeedback?.rawText ? (
                <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-100">
                  {activeFeedback.rawText}
                </pre>
              ) : null}
            </div>
          </div>
        </section>
      </div>
      </>
      ) : null}
    </div>
  );
}

