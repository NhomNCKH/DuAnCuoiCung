"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Headphones,
  Languages,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

type DictationItem = {
  id: string;
  title: string;
  youtubeId?: string;
  level?: string;
  topics?: string[];
  durationSec?: number;
  practiceCount?: number;
  segmentCount?: number;
  thumbnailUrl?: string | null;
};

type DictationSegment = {
  order: number;
  startSec: number;
  endSec: number;
  textEn: string;
  textVi?: string | null;
  ipa?: string | null;
};

type DiffToken = {
  key: string;
  label: string;
  state: "correct" | "missing" | "extra" | "mismatch";
};

function unwrapDictationList(payload: any): { items: DictationItem[]; total: number; page: number; limit: number } {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  const items = (data?.items ?? data?.data ?? []) as DictationItem[];
  const total = Number(data?.total ?? items.length ?? 0) || 0;
  const page = Number(data?.page ?? 1) || 1;
  const limit = Number(data?.limit ?? 12) || 12;
  return { items, total, page, limit };
}

function extractData(raw: any): any {
  return raw?.data?.data ?? raw?.data ?? raw;
}

function fmtDuration(sec?: number): string {
  const s = Math.max(0, Math.floor(Number(sec ?? 0) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function fmtTime(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function normalizeForCompare(text: string) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\w'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDiff(expected: string, actual: string) {
  const expectedWords = normalizeForCompare(expected).split(" ").filter(Boolean);
  const actualWords = normalizeForCompare(actual).split(" ").filter(Boolean);
  const length = Math.max(expectedWords.length, actualWords.length);
  const tokens: DiffToken[] = [];
  let correct = 0;
  let missing = 0;
  let extra = 0;
  let mismatch = 0;

  for (let i = 0; i < length; i += 1) {
    const exp = expectedWords[i];
    const act = actualWords[i];
    if (exp && act && exp === act) {
      correct += 1;
      tokens.push({ key: `ok-${i}-${exp}`, label: act, state: "correct" });
      continue;
    }
    if (exp && !act) {
      missing += 1;
      tokens.push({ key: `missing-${i}-${exp}`, label: exp, state: "missing" });
      continue;
    }
    if (!exp && act) {
      extra += 1;
      tokens.push({ key: `extra-${i}-${act}`, label: act, state: "extra" });
      continue;
    }
    if (exp && act) {
      mismatch += 1;
      tokens.push({ key: `mismatch-${i}-${exp}-${act}`, label: `${act} -> ${exp}`, state: "mismatch" });
    }
  }

  return {
    correct,
    missing,
    extra,
    mismatch,
    total: expectedWords.length,
    tokens,
  };
}

export default function DailyDictationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = pathname ?? "/student/daily-dictation";
  const detailId = searchParams?.get("id") ?? null;

  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState("most-practiced");
  const [topic, setTopic] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DictationItem[]>([]);
  const [total, setTotal] = useState(0);
  const limit = 12;

  const [view, setView] = useState<"list" | "detail">("list");
  const [detailLoading, setDetailLoading] = useState(false);
  const [content, setContent] = useState<DictationItem | null>(null);
  const [segments, setSegments] = useState<DictationSegment[]>([]);

  const [translationMode, setTranslationMode] = useState<"none" | "vi" | "ipa" | "both">("none");
  const [detailTab, setDetailTab] = useState<"dictation" | "transcript">("dictation");
  const [repeatSegment, setRepeatSegment] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [speed, setSpeed] = useState("1x");
  const [activeSeg, setActiveSeg] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showImmediateFeedback, setShowImmediateFeedback] = useState(true);
  const [showFullReference, setShowFullReference] = useState(true);
  const [answerByOrder, setAnswerByOrder] = useState<Record<number, string>>({});
  const [checkedByOrder, setCheckedByOrder] = useState<Record<number, string>>({});
  const [playerStatus, setPlayerStatus] = useState<"idle" | "playing" | "paused">("idle");
  const [segmentElapsed, setSegmentElapsed] = useState(0);

  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef(false);
  const ytTickRef = useRef<number | null>(null);
  const repeatRef = useRef(false);
  const speedRef = useRef("1x");
  const sentenceRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const practiceHydratedRef = useRef<string | null>(null);
  const practiceStorageKey = content?.id ? `toeicmaster:daily-dictation:${content.id}` : null;

  useEffect(() => {
    repeatRef.current = repeatSegment;
  }, [repeatSegment]);

  useEffect(() => {
    speedRef.current = speed;
    const player = ytPlayerRef.current;
    if (!player || !ytReadyRef.current) return;
    const rate = Number(String(speed).replace("x", "")) || 1;
    try {
      player.setPlaybackRate(rate);
    } catch {}
  }, [speed]);

  const current = segments[activeSeg] ?? null;
  const currentOrder = current?.order ?? 0;
  const currentAnswer = answerByOrder[currentOrder] ?? "";
  const checkedAnswer = checkedByOrder[currentOrder] ?? "";
  const compareResult = useMemo(() => {
    if (!current || !checkedAnswer.trim()) return null;
    return buildDiff(current.textEn, checkedAnswer);
  }, [checkedAnswer, current]);

  const answeredCount = useMemo(
    () => Object.values(checkedByOrder).filter((value) => String(value).trim().length > 0).length,
    [checkedByOrder],
  );

  async function loadList(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.learner.dailyDictation.list({
        page: nextPage,
        limit,
        keyword: keyword.trim() || undefined,
        level: level || undefined,
        topic: topic || undefined,
        sort: sort || undefined,
      });
      const unwrapped = unwrapDictationList(res);
      setItems(unwrapped.items ?? []);
      setTotal(unwrapped.total ?? 0);
      setPage(unwrapped.page ?? nextPage);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setError(e?.message ?? "Không tải được danh sách DailyDictation.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(contentId: string) {
    if (!contentId) return;
    setDetailLoading(true);
    setError(null);
    try {
      const res = await apiClient.learner.dailyDictation.getDetail(contentId);
      const data = extractData(res);
      const c = (data?.content ?? data) as any;
      const segs = (data?.segments ?? []) as any[];
      setContent({
        id: String(c?.id ?? contentId),
        title: String(c?.title ?? "DailyDictation"),
        youtubeId: c?.youtubeId ? String(c.youtubeId) : undefined,
        level: c?.level ? String(c.level) : undefined,
        topics: Array.isArray(c?.topics) ? c.topics : [],
        durationSec: Number(c?.durationSec ?? 0) || 0,
        practiceCount: Number(c?.practiceCount ?? 0) || 0,
        segmentCount: Number(c?.segmentCount ?? 0) || 0,
        thumbnailUrl: c?.thumbnailUrl ?? null,
      });
      setSegments(
        segs
          .map((seg) => ({
            order: Number(seg.order) || 0,
            startSec: Number(seg.startSec) || 0,
            endSec: Number(seg.endSec) || 0,
            textEn: String(seg.textEn ?? ""),
            textVi: seg.textVi == null ? null : String(seg.textVi),
            ipa: seg.ipa == null ? null : String(seg.ipa),
          }))
          .filter((seg) => seg.order > 0)
          .sort((a, b) => a.order - b.order),
      );
      setDetailTab("dictation");
      setActiveSeg(0);
      setShowAnswer(false);
      setAutoScroll(true);
      setShowImmediateFeedback(true);
      setShowFullReference(true);
      setAnswerByOrder({});
      setCheckedByOrder({});
      setPlayerStatus("idle");
      setSegmentElapsed(0);
      practiceHydratedRef.current = null;
    } catch (e: any) {
      setContent(null);
      setSegments([]);
      setError(e?.message ?? "Không tải được chi tiết DailyDictation.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetailView() {
    pauseSegment();
    router.replace(currentPath, { scroll: false });
    practiceHydratedRef.current = null;
    setView("list");
    setContent(null);
    setSegments([]);
  }

  async function openDetailView(contentId: string) {
    if (!contentId) return;
    setView("detail");
    router.replace(`${currentPath}?id=${contentId}`, { scroll: false });
    await loadDetail(contentId);
  }

  useEffect(() => {
    void loadList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!detailId) return;
    setView("detail");
    if (content?.id === detailId && segments.length > 0) return;
    void loadDetail(detailId);
  }, [content?.id, detailId, segments.length]);

  useEffect(() => {
    if (view !== "list") return;
    setPage(1);
    void loadList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, level, sort, topic, view]);

  async function ensureYoutubeApi(): Promise<void> {
    if (typeof window === "undefined") return;
    const w = window as any;
    if (w.YT?.Player) return;
    if (w.__ytApiPromise) {
      await w.__ytApiPromise;
      return;
    }
    w.__ytApiPromise = new Promise<void>((resolve) => {
      const existing = document.querySelector("script[data-yt-iframe-api]");
      if (existing) {
        const timer = window.setInterval(() => {
          if ((window as any).YT?.Player) {
            window.clearInterval(timer);
            resolve();
          }
        }, 60);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.ytIframeApi = "1";
      (document.head || document.body).appendChild(script);
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        try {
          prev?.();
        } catch {}
        resolve();
      };
    });
    await w.__ytApiPromise;
  }

  function clearYtTick() {
    if (ytTickRef.current != null && typeof window !== "undefined") {
      window.clearInterval(ytTickRef.current);
      ytTickRef.current = null;
    }
  }

  function pauseSegment() {
    clearYtTick();
    try {
      ytPlayerRef.current?.pauseVideo?.();
    } catch {}
    setPlayerStatus("paused");
  }

  function playSegment(index: number) {
    const safeIndex = Math.max(0, Math.min(index, Math.max(segments.length - 1, 0)));
    const seg = segments[safeIndex];
    setActiveSeg(safeIndex);
    if (!seg) return;
    const player = ytPlayerRef.current;
    if (!player) return;
    setPlayerStatus("playing");
    setSegmentElapsed(0);
    clearYtTick();
    const rate = Number(String(speedRef.current).replace("x", "")) || 1;
    try {
      player.setPlaybackRate(rate);
    } catch {}
    try {
      player.seekTo(Math.max(0, seg.startSec), true);
      player.playVideo();
    } catch {}

    ytTickRef.current = window.setInterval(() => {
      try {
        const currentTime = Number(player.getCurrentTime?.() ?? 0) || 0;
        setSegmentElapsed(Math.max(0, currentTime - seg.startSec));
        if (currentTime >= Math.max(seg.startSec + 0.15, seg.endSec - 0.05)) {
          setSegmentElapsed(Math.max(0, seg.endSec - seg.startSec));
          if (repeatRef.current) {
            player.seekTo(Math.max(0, seg.startSec), true);
            player.playVideo?.();
            return;
          }
          player.pauseVideo?.();
          clearYtTick();
          setPlayerStatus("paused");
        }
      } catch {}
    }, 120);
  }

  useEffect(() => {
    if (typeof window === "undefined" || view !== "detail" || !content?.youtubeId) return;

    let cancelled = false;
    void (async () => {
      await ensureYoutubeApi();
      if (cancelled) return;
      const w = window as any;
      const mountId = "daily-dictation-learner-player";
      const el = document.getElementById(mountId);
      if (!el) return;
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {}
      ytPlayerRef.current = null;
      ytReadyRef.current = false;
      ytPlayerRef.current = new w.YT.Player(mountId, {
        videoId: content.youtubeId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 0,
        },
        events: {
          onReady: () => {
            ytReadyRef.current = true;
            const rate = Number(String(speedRef.current).replace("x", "")) || 1;
            try {
              ytPlayerRef.current?.setPlaybackRate?.(rate);
            } catch {}
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      clearYtTick();
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {}
      ytPlayerRef.current = null;
      ytReadyRef.current = false;
    };
  }, [content?.youtubeId, view]);

  useEffect(() => {
    setShowAnswer(false);
    setSegmentElapsed(0);
    if (!autoScroll || view !== "detail") return;
    const seg = segments[activeSeg];
    if (!seg) return;
    sentenceRefs.current[seg.order]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeSeg, autoScroll, segments, view]);

  useEffect(() => {
    if (typeof window === "undefined" || view !== "detail" || detailTab !== "dictation") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (segments.length === 0) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "input" || tag === "select" || target?.isContentEditable) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (playerStatus === "playing") {
          pauseSegment();
        } else {
          playSegment(activeSeg);
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        pauseSegment();
        setActiveSeg((prev) => Math.max(0, prev - 1));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        pauseSegment();
        setActiveSeg((prev) => Math.min(segments.length - 1, prev + 1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeSeg, detailTab, playerStatus, segments.length, view]);

  useEffect(() => {
    if (!practiceStorageKey || segments.length === 0 || typeof window === "undefined") return;
    if (practiceHydratedRef.current === practiceStorageKey) return;
    practiceHydratedRef.current = practiceStorageKey;

    try {
      const raw = window.localStorage.getItem(practiceStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setAnswerByOrder(saved?.answerByOrder ?? {});
      setCheckedByOrder(saved?.checkedByOrder ?? {});
      setActiveSeg(Math.max(0, Math.min(Number(saved?.activeSeg ?? 0), Math.max(segments.length - 1, 0))));
      setDetailTab(saved?.detailTab === "transcript" ? "transcript" : "dictation");
      setShowAnswer(Boolean(saved?.showAnswer));
      setRepeatSegment(Boolean(saved?.repeatSegment));
      setSpeed(typeof saved?.speed === "string" ? saved.speed : "1x");
      setTranslationMode(["none", "vi", "ipa", "both"].includes(saved?.translationMode) ? saved.translationMode : "none");
      setShowImmediateFeedback(saved?.showImmediateFeedback !== false);
      setShowFullReference(saved?.showFullReference !== false);
    } catch {}
  }, [practiceStorageKey, segments.length]);

  useEffect(() => {
    if (!practiceStorageKey || segments.length === 0 || typeof window === "undefined") return;
    if (practiceHydratedRef.current !== practiceStorageKey) return;

    try {
      window.localStorage.setItem(
        practiceStorageKey,
        JSON.stringify({
          answerByOrder,
          checkedByOrder,
          activeSeg,
          detailTab,
          showAnswer,
          repeatSegment,
          speed,
          translationMode,
          showImmediateFeedback,
          showFullReference,
        }),
      );
    } catch {}
  }, [
    activeSeg,
    answerByOrder,
    checkedByOrder,
    detailTab,
    practiceStorageKey,
    repeatSegment,
    segments.length,
    showAnswer,
    showFullReference,
    showImmediateFeedback,
    speed,
    translationMode,
  ]);

  const listCountLabel = useMemo(() => {
    return `${items.length} bài`;
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const progressPercent = segments.length > 0 ? Math.round((answeredCount / segments.length) * 100) : 0;
  const segmentDuration = current ? Math.max(0, current.endSec - current.startSec) : 0;
  const segmentProgressPercent =
    segmentDuration > 0 ? Math.max(0, Math.min(100, Math.round((segmentElapsed / segmentDuration) * 100))) : 0;
  const currentChecked = Boolean(String(checkedAnswer).trim());
  const currentPerfect =
    compareResult != null &&
    compareResult.missing === 0 &&
    compareResult.extra === 0 &&
    compareResult.mismatch === 0 &&
    compareResult.total > 0;
  const isDetailView = view === "detail";
  const fullTranscriptText = useMemo(() => segments.map((segment) => segment.textEn.trim()).filter(Boolean).join(" "), [segments]);

  return (
    <div className={isDetailView ? "px-4 py-3 sm:px-6 lg:px-10" : "px-4 py-5 sm:px-6 lg:px-10"}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={isDetailView ? "mb-3" : "mb-5"}>
        <div className="surface overflow-hidden">
          <div className={`relative ${isDetailView ? "px-4 py-3 sm:px-5" : "px-5 py-5 sm:px-6"}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.16),_transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,245,255,0.96))]" />
            <div className={`relative flex flex-wrap ${isDetailView ? "items-center gap-3" : "items-start gap-4"}`}>
              <div
                className={`grid place-items-center bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200/70 ${
                  isDetailView ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl"
                }`}
              >
                <Headphones className={isDetailView ? "h-5 w-5" : "h-6 w-6"} />
              </div>
              <div className="min-w-0 flex-1">
                

                {view === "detail" ? (
                  <button
                    type="button"
                    onClick={() => closeDetailView()}
                    className="mt-2 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-blue-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Quay lại thư viện bài luyện
                  </button>
                ) : null}
              </div>
              <div className={`ml-auto flex flex-wrap items-center ${isDetailView ? "gap-1.5" : "gap-2"}`}>
                <span className={`chip inline-flex items-center gap-1.5 ${isDetailView ? "text-xs" : ""}`}>
                  <BookOpenCheck className="h-4 w-4" />
                  {view === "list" ? listCountLabel : `${answeredCount}/${segments.length || 0} câu đã check`}
                </span>
                <span className={`chip inline-flex items-center gap-1.5 ${isDetailView ? "text-xs" : ""}`}>
                  <Languages className="h-4 w-4" />
                  {view === "list" ? "Thư viện bài nghe" : `${progressPercent}% tiến độ`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {view === "list" ? (
        <section className="surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-extrabold text-slate-900">Chọn bài DailyDictation đã xuất bản</p>
              <p className="mt-1 text-sm text-muted">Mỗi bài gồm nhiều câu ngắn để luyện nghe-chép theo từng đoạn.</p>
            </div>
            <button type="button" onClick={() => void loadList(1)} className="btn-secondary inline-flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2 xl:grid-cols-[minmax(280px,1fr)_170px_210px_210px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên bài hoặc nội dung..."
                className="input-modern w-full pl-9"
              />
            </div>

            <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-modern w-full">
              <option value="">Tất cả level</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>

            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-modern w-full">
              <option value="most-practiced">Luyện nhiều nhất</option>
              <option value="newest">Mới nhất</option>
              <option value="shortest">Ngắn nhất</option>
            </select>

            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="input-modern w-full">
              <option value="">Tất cả chủ đề</option>
              <option value="daily">Giao tiếp hằng ngày</option>
              <option value="work">Công việc</option>
              <option value="toeic">TOEIC</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setLevel("");
                setSort("most-practiced");
                setTopic("");
                setPage(1);
                void loadList(1);
              }}
              className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400"
            >
              Xóa bộ lọc
            </button>
          </div>

          {error ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải thư viện DailyDictation...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
              <p className="font-semibold">Chưa có bài DailyDictation nào.</p>
              <p className="mt-1 text-muted">Hãy quay lại sau khi admin đã publish nội dung.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const questionCount = Number(item.segmentCount ?? 0) || 0;
                const practiceCount = Number(item.practiceCount ?? 0) || 0;
                const topics = (item.topics ?? []).filter(Boolean).slice(0, 3);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={async () => openDetailView(item.id)}
                    className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                      {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                      <div className="absolute left-3 top-3 flex items-center gap-2">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-slate-900 shadow-sm">
                          {item.level ?? "A1"}
                        </span>
                        <span className="rounded-full bg-blue-600/90 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
                          {questionCount || "?"} câu
                        </span>
                      </div>
                      <div className="absolute left-3 bottom-3 flex items-center gap-2">
                        <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
                          {fmtDuration(item.durationSec)}
                        </span>
                        <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
                          {practiceCount} lượt luyện
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <p className="line-clamp-2 text-lg font-extrabold leading-tight text-slate-900">
                        {item.title}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {topics.length > 0 ? (
                          topics.map((tag) => (
                            <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted">Chưa gắn chủ đề</span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Daily Dictation</p>
                          <p className="mt-1 text-sm font-semibold text-slate-600">Nghe từng câu, gõ lại và tự kiểm tra.</p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-bold text-white transition group-hover:bg-blue-700">
                          Vào luyện
                          <Play className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>Hiển thị {items.length} / {total} bài</span>
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                className="btn-secondary h-9 w-9 px-0"
                aria-label="Trang trước"
                disabled={page <= 1}
                onClick={() => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  void loadList(next);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700">{page}</span>
              <button
                type="button"
                className="btn-secondary h-9 w-9 px-0"
                aria-label="Trang sau"
                disabled={page >= totalPages}
                onClick={() => {
                  const next = Math.min(totalPages, page + 1);
                  setPage(next);
                  void loadList(next);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {detailLoading ? (
            <div className="surface flex items-center gap-2 p-4 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải bài luyện...
            </div>
          ) : !content ? (
            <div className="surface p-5 text-sm text-muted">Không tìm thấy nội dung DailyDictation.</div>
          ) : (
            <>
              <div className="surface overflow-hidden">
                <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(241,247,255,0.92),rgba(255,255,255,0.96))]">
                  <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-[1.6rem]">
                          {content.title}
                        </h2>
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-extrabold text-blue-700">
                          {content.level ?? "A1"}
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                          {segments.length} câu luyện
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {(content.topics ?? []).slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid min-w-[240px] grid-cols-3 gap-2">
                      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Tiến độ</p>
                        <p className="mt-1 text-lg font-extrabold text-slate-900">{progressPercent}%</p>
                        <p className="text-xs text-slate-500">{answeredCount}/{segments.length || 0} câu đã check</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Đang luyện</p>
                        <p className="mt-1 text-lg font-extrabold text-slate-900">{current?.order ?? 0}/{segments.length || 0}</p>
                        <p className="text-xs text-slate-500">
                          {current ? `${fmtTime(current.startSec)} → ${fmtTime(current.endSec)}` : "Chưa có câu"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Phát video</p>
                        <p className="mt-1 text-sm font-extrabold text-slate-900 sm:text-[15px]">
                          {playerStatus === "playing" ? "Đang phát" : playerStatus === "paused" ? "Tạm dừng" : "Sẵn sàng"}
                        </p>
                        <p className="text-xs text-slate-500">Repeat {repeatSegment ? "bật" : "tắt"} • {speed}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 px-4 pb-2.5 sm:px-5">
                    <button
                      type="button"
                      onClick={() => {
                        pauseSegment();
                        setDetailTab("dictation");
                      }}
                      className={`rounded-lg px-3 py-1.5 text-sm font-extrabold transition ${
                        detailTab === "dictation"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Dictation
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pauseSegment();
                        setDetailTab("transcript");
                      }}
                      className={`rounded-lg px-3 py-1.5 text-sm font-extrabold transition ${
                        detailTab === "transcript"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Full transcript
                    </button>
                  </div>
                </div>

                {detailTab === "dictation" ? (
                  <div className="p-2 sm:p-2.5">
                    <div className="mb-2 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_145px_124px]">
                      <label className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
                        <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          <Languages className="h-4 w-4" />
                          Hiển thị
                        </span>
                        <select
                          value={translationMode}
                          onChange={(e) => setTranslationMode(e.target.value as any)}
                          className="input-modern w-full"
                        >
                          <option value="none">No translation</option>
                          <option value="vi">Dịch tiếng Việt</option>
                          <option value="ipa">Phiên âm IPA</option>
                          <option value="both">VI + IPA</option>
                        </select>
                      </label>

                      <label className="flex rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
                        <span className="flex flex-1 items-center justify-between gap-3">
                          <span>
                            <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Repeat</span>
                            <span className="mt-1 block text-[12px] font-semibold leading-tight text-slate-800">Lặp lại đúng 1 câu</span>
                          </span>
                          <input type="checkbox" checked={repeatSegment} onChange={(e) => setRepeatSegment(e.target.checked)} />
                        </span>
                      </label>

                      <label className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
                        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Tốc độ</span>
                        <select value={speed} onChange={(e) => setSpeed(e.target.value)} className="input-modern w-full">
                          <option value="0.75x">0.75x</option>
                          <option value="1x">1x</option>
                          <option value="1.25x">1.25x</option>
                          <option value="1.5x">1.5x</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.94fr)_minmax(420px,1fr)] xl:items-start">
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-950 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.65)]">
                          {content.youtubeId ? (
                            <div className="relative aspect-[16/5.2]">
                              <div id="daily-dictation-learner-player" className="h-full w-full" />
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent p-2">
                                <div className="flex items-end justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Phát từng câu</p>
                                    <p className="mt-1 text-sm font-extrabold text-white">
                                      Câu {current?.order ?? 0}: {current ? `${fmtTime(current.startSec)} → ${fmtTime(current.endSec)}` : "—"}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                                    {segmentProgressPercent}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid aspect-[16/5.2] place-items-center p-4 text-sm text-white/80">Không có video cho bài này.</div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[190px_minmax(0,1fr)]">
                          <div className="rounded-[16px] border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Trạng thái</p>
                                <p className="mt-1 text-[15px] font-extrabold text-slate-900">
                                  {playerStatus === "playing" ? "Đang phát" : playerStatus === "paused" ? "Tạm dừng" : "Sẵn sàng"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Repeat {repeatSegment ? "bật" : "tắt"} • {speed}</p>
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-extrabold ${
                                  currentChecked
                                    ? currentPerfect
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {currentChecked ? (currentPerfect ? "Đúng" : "Đã check") : "Chưa check"}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-slate-200 bg-white p-3 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Gợi ý</p>
                            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-slate-800">
                              {showAnswer
                                ? current?.textEn ?? "Không có câu để luyện."
                                : "Bấm phát từng câu rồi gõ lại chính xác nội dung bạn nghe được."}
                            </p>
                            {(translationMode === "ipa" || translationMode === "both") && current?.ipa ? (
                              <p className="mt-2 text-xs font-semibold text-sky-700">{current.ipa}</p>
                            ) : null}
                            {(translationMode === "vi" || translationMode === "both") && current?.textVi ? (
                              <p className="mt-2 text-xs text-slate-600">{current.textVi}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(244,248,255,0.92))] p-3 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Luyện tập</p>
                              <p className="mt-1 text-[15px] font-extrabold text-slate-900">Nghe và gõ lại từng câu</p>
                              <p className="mt-1 text-[13px] text-slate-500">
                                Câu {current?.order ?? 0}/{segments.length} •{" "}
                                {current ? `${fmtTime(current.startSec)} → ${fmtTime(current.endSec)}` : "Chưa có dữ liệu câu"}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12px] font-bold text-slate-700 transition hover:bg-slate-100"
                              onClick={() => setShowAnswer((prev) => !prev)}
                            >
                              {showAnswer ? "Ẩn đáp án" : "Hiện đáp án"}
                            </button>
                          </div>

                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 transition-all"
                              style={{ width: `${segmentProgressPercent}%` }}
                            />
                          </div>

                          <textarea
                            value={currentAnswer}
                            onChange={(e) =>
                              setAnswerByOrder((prev) => ({
                                ...prev,
                                [currentOrder]: e.target.value,
                              }))
                            }
                            rows={4}
                            placeholder="Gõ lại câu bạn nghe được tại đây..."
                            className="input-modern mt-3 min-h-[152px] resize-y rounded-[16px] px-3 py-2.5 text-[14px] leading-relaxed"
                          />

                          <div className="mt-3 grid grid-cols-[40px_minmax(0,1fr)_40px_40px] gap-2">
                            <button
                              type="button"
                              className="btn-secondary h-10 w-10 px-0"
                              disabled={activeSeg <= 0}
                              onClick={() => {
                                if (activeSeg <= 0) return;
                                playSegment(activeSeg - 1);
                              }}
                              aria-label="Câu trước"
                            >
                              <SkipBack className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="btn-primary inline-flex items-center justify-center gap-2 px-3 py-2 text-sm"
                              onClick={() => playSegment(activeSeg)}
                              disabled={!current || !content.youtubeId}
                            >
                              <Volume2 className="h-4 w-4" />
                              Phát câu này
                            </button>
                            <button
                              type="button"
                              className="btn-secondary h-10 w-10 px-0"
                              onClick={() => pauseSegment()}
                              aria-label="Tạm dừng"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="btn-secondary h-10 w-10 px-0"
                              disabled={activeSeg >= segments.length - 1}
                              onClick={() => {
                                if (activeSeg >= segments.length - 1) return;
                                playSegment(activeSeg + 1);
                              }}
                              aria-label="Câu tiếp theo"
                            >
                              <SkipForward className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              className="btn-primary justify-center px-3 py-2 text-sm"
                              onClick={() =>
                                setCheckedByOrder((prev) => ({
                                  ...prev,
                                  [currentOrder]: currentAnswer,
                                }))
                              }
                              disabled={!currentAnswer.trim()}
                            >
                              <CircleCheckBig className="h-4 w-4" />
                              Check đáp án
                            </button>
                            <button
                              type="button"
                              className="btn-secondary justify-center px-3 py-2 text-sm"
                              onClick={() => {
                                setAnswerByOrder((prev) => ({ ...prev, [currentOrder]: "" }));
                                setCheckedByOrder((prev) => ({ ...prev, [currentOrder]: "" }));
                              }}
                            >
                              Làm lại câu
                            </button>
                            <button
                              type="button"
                              className="btn-secondary justify-center px-3 py-2 text-sm"
                              onClick={() => {
                                const text = String(current?.textEn ?? "").trim();
                                if (!text || typeof window === "undefined") return;
                                const synth = window.speechSynthesis;
                                if (!synth) return;
                                const utterance = new SpeechSynthesisUtterance(text);
                                utterance.lang = "en-US";
                                synth.cancel();
                                synth.speak(utterance);
                              }}
                            >
                              <Play className="h-4 w-4" />
                              Đọc mẫu
                            </button>
                            <button
                              type="button"
                              className="btn-secondary justify-center px-3 py-2 text-sm"
                              onClick={() => {
                                if (activeSeg >= segments.length - 1) return;
                                pauseSegment();
                                setActiveSeg((prev) => Math.min(segments.length - 1, prev + 1));
                              }}
                              disabled={activeSeg >= segments.length - 1}
                            >
                              Câu kế tiếp
                            </button>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1.5 font-bold">Space: Play/Pause</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1.5 font-bold">← →: đổi câu</span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                            <label className="inline-flex items-center gap-2 font-semibold">
                              <input
                                type="checkbox"
                                checked={showImmediateFeedback}
                                onChange={(e) => setShowImmediateFeedback(e.target.checked)}
                              />
                              Hiện phản hồi ngay
                            </label>
                            <label className="inline-flex items-center gap-2 font-semibold">
                              <input
                                type="checkbox"
                                checked={showFullReference}
                                onChange={(e) => setShowFullReference(e.target.checked)}
                              />
                              Hiện toàn bộ đáp án
                            </label>
                          </div>

                          {showImmediateFeedback && compareResult ? (
                            <div className="mt-3 rounded-[16px] border border-slate-200 bg-white p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                                    currentPerfect ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {currentPerfect ? "Chính xác" : "Cần xem lại"}
                                </span>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                                  Đúng: {compareResult.correct}
                                </span>
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-700">
                                  Thiếu: {compareResult.missing}
                                </span>
                                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-extrabold text-rose-700">
                                  Thừa: {compareResult.extra}
                                </span>
                                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-sky-700">
                                  Sai: {compareResult.mismatch}
                                </span>
                              </div>
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {compareResult.tokens.map((token) => {
                                  const className =
                                    token.state === "correct"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : token.state === "missing"
                                        ? "bg-amber-100 text-amber-800"
                                        : token.state === "extra"
                                          ? "bg-rose-100 text-rose-800"
                                          : "bg-sky-100 text-sky-800";
                                  return (
                                    <span key={token.key} className={`rounded-md px-2 py-1 text-xs font-bold ${className}`}>
                                      {token.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {showFullReference && (showAnswer || currentChecked) ? (
                            <div className="mt-3 rounded-[16px] border border-blue-100 bg-blue-50/70 p-3">
                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500">Đáp án mẫu</p>
                              <p className="mt-2 text-base font-extrabold leading-relaxed text-slate-900">{current?.textEn ?? "—"}</p>
                              {(translationMode === "ipa" || translationMode === "both") && current?.ipa ? (
                                <p className="mt-2 text-sm font-semibold text-sky-700">{current.ipa}</p>
                              ) : null}
                              {(translationMode === "vi" || translationMode === "both") && current?.textVi ? (
                                <p className="mt-2 text-sm text-slate-600">{current.textVi}</p>
                              ) : null}
                            </div>
                          ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">Full transcript</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Soát toàn bộ câu sau khi luyện xong hoặc nhảy lại từng segment để nghe tiếp.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          pauseSegment();
                          setDetailTab("dictation");
                        }}
                      >
                        Quay lại Dictation
                      </button>
                    </div>

                    <div className="mb-4 rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(244,248,255,0.92))] p-4 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Bản transcript đầy đủ</p>
                      <p className="mt-3 text-base leading-8 text-slate-800">{fullTranscriptText || "Chưa có transcript."}</p>
                    </div>

                    <div className="space-y-3">
                      {segments.map((segment, index) => {
                        const checked = Boolean((checkedByOrder[segment.order] ?? "").trim());
                        return (
                          <div
                            key={`${segment.order}-${segment.endSec}`}
                            className={`rounded-[20px] border p-4 shadow-sm ${
                              checked ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-extrabold text-slate-900">Câu {segment.order}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {fmtTime(segment.startSec)} → {fmtTime(segment.endSec)} • {fmtDuration(segment.endSec - segment.startSec)}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                onClick={() => {
                                  setDetailTab("dictation");
                                  window.setTimeout(() => playSegment(index), 0);
                                }}
                              >
                                <Play className="mr-1 inline h-3.5 w-3.5" />
                                Phát câu
                              </button>
                            </div>

                            <p className="mt-4 text-lg font-extrabold leading-relaxed text-slate-900">{segment.textEn}</p>
                            {segment.ipa ? <p className="mt-3 text-sm font-semibold text-sky-700">{segment.ipa}</p> : null}
                            {segment.textVi ? <p className="mt-2 text-sm text-slate-600">{segment.textVi}</p> : null}

                            {checked ? (
                              <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/80 p-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">Bài làm của bạn</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-700">{checkedByOrder[segment.order]}</p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
