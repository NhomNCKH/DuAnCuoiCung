"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [repeatSegment, setRepeatSegment] = useState(false);
  const [speed, setSpeed] = useState("1x");
  const [activeSeg, setActiveSeg] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answerByOrder, setAnswerByOrder] = useState<Record<number, string>>({});
  const [checkedByOrder, setCheckedByOrder] = useState<Record<number, string>>({});

  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef(false);
  const ytTickRef = useRef<number | null>(null);
  const repeatRef = useRef(false);
  const speedRef = useRef("1x");

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
      setActiveSeg(0);
      setShowAnswer(false);
      setAnswerByOrder({});
      setCheckedByOrder({});
    } catch (e: any) {
      setContent(null);
      setSegments([]);
      setError(e?.message ?? "Không tải được chi tiết DailyDictation.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function playSegment(index: number) {
    const player = ytPlayerRef.current;
    const seg = segments[index];
    if (!player || !seg) return;
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
        if (currentTime >= Math.max(seg.startSec + 0.15, seg.endSec - 0.05)) {
          if (repeatRef.current) {
            player.seekTo(Math.max(0, seg.startSec), true);
            player.playVideo?.();
            return;
          }
          player.pauseVideo?.();
          clearYtTick();
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

  const listCountLabel = useMemo(() => {
    return `${items.length} bài`;
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const progressPercent = current && segments.length > 0 ? Math.round(((activeSeg + 1) / segments.length) * 100) : 0;

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-10">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="surface overflow-hidden">
          <div className="relative px-5 py-5 sm:px-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.16),_transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,245,255,0.96))]" />
            <div className="relative flex flex-wrap items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200/70">
                <Headphones className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="heading-lg">Luyện DailyDictation</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-700 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    Nghe và chép từng câu
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                  Chọn bài nghe ngắn, phát từng câu và tự gõ lại nội dung. Giao diện này tối ưu để học viên luyện chính tả,
                  nhận biết chỗ đúng sai và theo dõi tiến độ từng câu.
                </p>
                {view === "detail" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setView("list");
                      setContent(null);
                      setSegments([]);
                    }}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-blue-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Quay lại thư viện bài luyện
                  </button>
                ) : null}
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="chip inline-flex items-center gap-1.5">
                  <BookOpenCheck className="h-4 w-4" />
                  {view === "list" ? listCountLabel : `${answeredCount}/${segments.length || 0} câu đã check`}
                </span>
                <span className="chip inline-flex items-center gap-1.5">
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
                    onClick={async () => {
                      setView("detail");
                      await loadDetail(item.id);
                    }}
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
        <section className="space-y-4">
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
                <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1.15fr)_360px]">
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{content.title}</h2>
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">
                            {content.level ?? "A1"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {(content.topics ?? []).slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              {tag}
                            </span>
                          ))}
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                            {segments.length} câu luyện
                          </span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tiến độ</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-900">{progressPercent}%</p>
                        <p className="text-xs text-slate-500">{answeredCount}/{segments.length || 0} câu đã check</p>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                      {content.youtubeId ? (
                        <div className="aspect-video w-full">
                          <div id="daily-dictation-learner-player" className="h-full w-full" />
                        </div>
                      ) : (
                        <div className="p-4 text-sm text-muted">Không có video.</div>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary h-10 w-10 px-0"
                          disabled={activeSeg <= 0}
                          onClick={() => setActiveSeg((prev) => Math.max(0, prev - 1))}
                          aria-label="Câu trước"
                        >
                          <SkipBack className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-primary inline-flex items-center gap-2"
                          onClick={() => playSegment(activeSeg)}
                          disabled={!current}
                        >
                          <Volume2 className="h-4 w-4" />
                          Phát câu này
                        </button>
                        <button
                          type="button"
                          className="btn-secondary h-10 w-10 px-0"
                          onClick={() => {
                            clearYtTick();
                            try {
                              ytPlayerRef.current?.pauseVideo?.();
                            } catch {}
                          }}
                          aria-label="Dừng"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-secondary h-10 w-10 px-0"
                          disabled={activeSeg >= segments.length - 1}
                          onClick={() => setActiveSeg((prev) => Math.min(segments.length - 1, prev + 1))}
                          aria-label="Câu tiếp theo"
                        >
                          <SkipForward className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                          <input type="checkbox" checked={repeatSegment} onChange={(e) => setRepeatSegment(e.target.checked)} />
                          Repeat
                        </label>
                        <select value={speed} onChange={(e) => setSpeed(e.target.value)} className="input-modern w-[96px] py-2">
                          <option value="0.75x">0.75x</option>
                          <option value="1x">1x</option>
                          <option value="1.25x">1.25x</option>
                          <option value="1.5x">1.5x</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-[linear-gradient(180deg,rgba(244,247,255,0.88),rgba(255,255,255,0.98))] p-4 xl:border-l xl:border-t-0">
                    <div className="rounded-[24px] border border-slate-200 bg-white/95 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Đang luyện</p>
                          <p className="mt-1 text-lg font-extrabold text-slate-900">
                            Câu {current?.order ?? 0}/{segments.length}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {current ? `${fmtTime(current.startSec)} → ${fmtTime(current.endSec)}` : "—"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => setShowAnswer((prev) => !prev)}
                        >
                          {showAnswer ? "Ẩn đáp án" : "Hiện đáp án"}
                        </button>
                      </div>

                      <div className="mt-4 rounded-[22px] bg-[linear-gradient(135deg,#eff6ff,#f8fbff)] p-4">
                        <p className="text-center text-lg font-extrabold leading-relaxed text-slate-900">
                          {showAnswer ? current?.textEn ?? "Không có câu để luyện." : "Nghe đoạn audio và gõ lại chính xác nội dung bạn nghe được."}
                        </p>
                        {(translationMode === "ipa" || translationMode === "both") && current?.ipa ? (
                          <p className="mt-3 text-center text-sm font-semibold text-sky-700">{current.ipa}</p>
                        ) : null}
                        {(translationMode === "vi" || translationMode === "both") && current?.textVi ? (
                          <p className="mt-3 text-center text-sm text-slate-600">{current.textVi}</p>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <select
                          value={translationMode}
                          onChange={(e) => setTranslationMode(e.target.value as any)}
                          className="input-modern min-w-[170px] flex-1"
                        >
                          <option value="none">No translation</option>
                          <option value="vi">Dịch tiếng Việt</option>
                          <option value="ipa">Phiên âm IPA</option>
                          <option value="both">VI + IPA</option>
                        </select>
                        <button
                          type="button"
                          className="btn-secondary"
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
                      </div>

                      <textarea
                        value={currentAnswer}
                        onChange={(e) =>
                          setAnswerByOrder((prev) => ({
                            ...prev,
                            [currentOrder]: e.target.value,
                          }))
                        }
                        rows={6}
                        placeholder="Gõ lại câu bạn nghe được tại đây..."
                        className="input-modern mt-4 min-h-[150px] resize-y px-3 py-3 text-[0.96rem] leading-relaxed"
                      />

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="btn-primary"
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
                          className="btn-secondary"
                          onClick={() => {
                            setAnswerByOrder((prev) => ({ ...prev, [currentOrder]: "" }));
                            setCheckedByOrder((prev) => ({ ...prev, [currentOrder]: "" }));
                          }}
                        >
                          Làm lại câu này
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            if (activeSeg >= segments.length - 1) return;
                            setActiveSeg((prev) => prev + 1);
                          }}
                          disabled={activeSeg >= segments.length - 1}
                        >
                          Câu tiếp theo
                        </button>
                      </div>

                      {compareResult ? (
                        <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Đúng: {compareResult.correct}</span>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Thiếu: {compareResult.missing}</span>
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">Thừa: {compareResult.extra}</span>
                            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">Sai: {compareResult.mismatch}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
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
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
                <aside className="surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">Danh sách câu</p>
                      <p className="mt-1 text-xs text-muted">Chạm vào từng câu để phát và luyện riêng.</p>
                    </div>
                    <span className="chip">{segments.length} câu</span>
                  </div>

                  <div className="mt-4 max-h-[680px] space-y-2 overflow-auto pr-1">
                    {segments.map((segment, index) => {
                      const checked = Boolean((checkedByOrder[segment.order] ?? "").trim());
                      return (
                        <button
                          key={`${segment.order}-${segment.startSec}`}
                          type="button"
                          onClick={() => {
                            setActiveSeg(index);
                            if (!repeatRef.current) {
                              window.setTimeout(() => playSegment(index), 0);
                            }
                          }}
                          className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                            index === activeSeg
                              ? "border-blue-300 bg-blue-50 shadow-sm"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2">
                              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
                                <Play className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-sm font-extrabold text-slate-900">Câu {segment.order}</p>
                                <p className="text-xs text-slate-500">{fmtTime(segment.startSec)} → {fmtTime(segment.endSec)}</p>
                              </div>
                            </div>
                            {checked ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                                Đã check
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                            {segment.textEn}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <div className="surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">Full transcript</p>
                      <p className="mt-1 text-xs text-muted">Dùng để soát toàn bộ nội dung sau khi đã luyện từng câu.</p>
                    </div>
                    <span className="chip inline-flex items-center gap-1.5">
                      <CircleCheckBig className="h-4 w-4" />
                      {answeredCount} câu đã nộp
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {segments.map((segment) => {
                      const checked = Boolean((checkedByOrder[segment.order] ?? "").trim());
                      return (
                        <div
                          key={`${segment.order}-${segment.endSec}`}
                          className={`rounded-2xl border p-4 ${
                            checked ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-extrabold text-slate-900">Câu {segment.order}</p>
                            <span className="text-xs text-slate-500">{fmtDuration(segment.endSec - segment.startSec)}</span>
                          </div>
                          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-800">{segment.textEn}</p>
                          {(translationMode === "ipa" || translationMode === "both") && segment.ipa ? (
                            <p className="mt-2 text-xs font-semibold text-sky-700">{segment.ipa}</p>
                          ) : null}
                          {(translationMode === "vi" || translationMode === "both") && segment.textVi ? (
                            <p className="mt-2 text-xs text-slate-500">{segment.textVi}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
