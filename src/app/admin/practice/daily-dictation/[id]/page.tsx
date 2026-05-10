"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Pause,
  Play,
  Save,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { AdminCard, AdminEmptyState } from "@/components/admin";

type DailyDictationContent = {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl?: string | null;
  level: string;
  topics: string[];
  status: "draft" | "published" | "archived";
};

type DailyDictationSegment = {
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

function unwrap(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function statusBadge(status?: DailyDictationContent["status"]) {
  if (!status) return { label: "Draft", className: "bg-amber-500/90 text-white" };
  if (status === "published") return { label: "Published", className: "bg-emerald-500/90 text-white" };
  if (status === "archived") return { label: "Archived", className: "bg-slate-900/55 text-white" };
  return { label: "Draft", className: "bg-amber-500/90 text-white" };
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

export default function AdminDailyDictationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id ?? "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState<DailyDictationContent | null>(null);
  const [segments, setSegments] = useState<DailyDictationSegment[]>([]);

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("A1");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [topicsText, setTopicsText] = useState("");

  const [segmentPage, setSegmentPage] = useState(1);
  const segmentPageSize = 5;

  const [previewTab, setPreviewTab] = useState<"dictation" | "transcript">("dictation");
  const [translationMode, setTranslationMode] = useState<"none" | "vi" | "ipa" | "both">("none");
  const [repeatSegment, setRepeatSegment] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1x");
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checkedAnswer, setCheckedAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);

  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef(false);
  const ytTickRef = useRef<number | null>(null);
  const repeatSegmentRef = useRef(false);
  const playbackSpeedRef = useRef("1x");

  useEffect(() => {
    repeatSegmentRef.current = repeatSegment;
  }, [repeatSegment]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    const player = ytPlayerRef.current;
    if (!player || !ytReadyRef.current) return;
    const rate = Number(String(playbackSpeed).replace("x", "")) || 1;
    try {
      player.setPlaybackRate(rate);
    } catch {}
  }, [playbackSpeed]);

  const currentSegment = segments[activeSegmentIndex] ?? null;

  const compareResult = useMemo(() => {
    if (!currentSegment || !checkedAnswer.trim()) return null;
    return buildDiff(currentSegment.textEn, checkedAnswer);
  }, [currentSegment, checkedAnswer]);

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
    const segment = segments[index];
    if (!player || !segment) return;
    clearYtTick();
    const rate = Number(String(playbackSpeedRef.current).replace("x", "")) || 1;
    try {
      player.setPlaybackRate(rate);
    } catch {}
    try {
      player.seekTo(Math.max(0, segment.startSec), true);
      player.playVideo();
    } catch {}

    ytTickRef.current = window.setInterval(() => {
      try {
        const currentTime = Number(player.getCurrentTime?.() ?? 0) || 0;
        if (currentTime >= Math.max(segment.startSec + 0.15, segment.endSec - 0.05)) {
          if (repeatSegmentRef.current) {
            player.seekTo(Math.max(0, segment.startSec), true);
            player.playVideo?.();
            return;
          }
          player.pauseVideo?.();
          clearYtTick();
        }
      } catch {}
    }, 120);
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.admin.dailyDictation.getDetail(id);
      const data = unwrap(res);
      const c = data?.content as DailyDictationContent;
      const segs = (data?.segments ?? []) as any[];
      setContent(c);
      setTitle(c?.title ?? "");
      setLevel(c?.level ?? "A1");
      setStatus((c?.status ?? "draft") as any);
      setTopicsText(Array.isArray(c?.topics) ? c.topics.join(", ") : "");
      const normalizedSegments = segs
        .map((s) => ({
          order: Number(s.order) || 0,
          startSec: Number(s.startSec) || 0,
          endSec: Number(s.endSec) || 0,
          textEn: String(s.textEn ?? ""),
          textVi: s.textVi == null ? null : String(s.textVi),
          ipa: s.ipa == null ? null : String(s.ipa),
        }))
        .filter((x) => x.order > 0)
        .sort((a, b) => a.order - b.order);
      setSegments(normalizedSegments);
      setActiveSegmentIndex(0);
      setAnswer("");
      setCheckedAnswer("");
      setShowAnswer(false);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được chi tiết DailyDictation.");
      setContent(null);
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setSegmentPage(1);
  }, [id]);

  useEffect(() => {
    setAnswer("");
    setCheckedAnswer("");
    setShowAnswer(false);
  }, [activeSegmentIndex]);

  useEffect(() => {
    if (typeof window === "undefined" || !content?.youtubeId) return;

    let cancelled = false;
    void (async () => {
      await ensureYoutubeApi();
      if (cancelled) return;
      const w = window as any;
      const mountId = "daily-dictation-yt-player";
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
            const rate = Number(String(playbackSpeedRef.current).replace("x", "")) || 1;
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
  }, [content?.youtubeId]);

  const topics = useMemo(() => {
    return Array.from(
      new Set(
        topicsText
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ).slice(0, 10);
  }, [topicsText]);

  const segmentsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil((segments?.length ?? 0) / segmentPageSize));
  }, [segments?.length]);

  const safeSegmentPage = Math.min(Math.max(1, segmentPage), segmentsTotalPages);

  const pageSegments = useMemo(() => {
    const start = (safeSegmentPage - 1) * segmentPageSize;
    return segments.slice(start, start + segmentPageSize);
  }, [safeSegmentPage, segments]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/practice/daily-dictation"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-blue-800 admin-dark:text-[#7aa2ff] admin-dark:hover:text-[#9bb8ff]"
          >
            <ArrowLeft className="h-4 w-4" />
            Danh sách
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="heading-lg truncate">{content?.title ?? "DailyDictation"}</h1>
            {content ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-extrabold tracking-wide shadow-sm ${statusBadge(
                  content.status,
                ).className}`}
              >
                {statusBadge(content.status).label}
              </span>
            ) : null}
          </div>
          {content?.youtubeId ? (
            <p className="mt-1 text-sm text-slate-500 admin-dark:text-[var(--admin-muted)]">
              YouTube ID: <span className="font-semibold text-slate-700 admin-dark:text-[var(--admin-text)]">{content.youtubeId}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            disabled={saving || loading || !content}
            onClick={async () => {
              if (!content) return;
              setSaving(true);
              setError(null);
              try {
                await apiClient.admin.dailyDictation.publish(content.id);
                await load();
              } catch (e: any) {
                setError(e?.message ?? "Publish thất bại.");
              } finally {
                setSaving(false);
              }
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Publish
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải...
        </div>
      ) : !content ? (
        <AdminEmptyState
          icon={FileText}
          title="Không tìm thấy nội dung"
          description="Nội dung DailyDictation này không tồn tại hoặc bạn không có quyền truy cập."
          action={
            <button type="button" className="btn-secondary" onClick={() => router.push("/admin/practice/daily-dictation")}>
              Quay lại danh sách
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(420px,0.95fr)_minmax(560px,1.05fr)]">
          <div className="space-y-4">
            <AdminCard>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">Tiêu đề</p>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-modern w-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">Level</p>
                    <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-modern w-full">
                      <option value="A1">A1</option>
                      <option value="A2">A2</option>
                      <option value="B1">B1</option>
                      <option value="B2">B2</option>
                    </select>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">Trạng thái</p>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="input-modern w-full">
                      <option value="draft">Chưa publish</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">
                    Topics (phân tách bằng dấu phẩy)
                  </p>
                  <input
                    value={topicsText}
                    onChange={(e) => setTopicsText(e.target.value)}
                    className="input-modern w-full"
                    placeholder="daily, toeic, work..."
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {topics.length ? (
                      topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 admin-dark:border-[var(--admin-border)] admin-dark:bg-[#15213b] admin-dark:text-[var(--admin-muted)]"
                        >
                          {topic}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">Chưa có topics</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      await apiClient.admin.dailyDictation.update(content.id, {
                        title: title.trim() || undefined,
                        level,
                        status,
                        topics,
                      });
                      await load();
                    } catch (e: any) {
                      setError(e?.message ?? "Không lưu được metadata.");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                  Lưu
                </button>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">YouTube Preview</p>
                  <p className="mt-1 text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">
                    Video này được dùng để phát theo từng câu khi luyện DailyDictation.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 admin-dark:text-[var(--admin-muted)]">
                  <span>{segments.length} câu</span>
                  <span>{playbackSpeed}</span>
                </div>
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
                {content.youtubeId ? (
                  <div className="aspect-video w-full">
                    <div id="daily-dictation-yt-player" className="h-full w-full" />
                  </div>
                ) : (
                  <div className="p-4 text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">Không có video.</div>
                )}
              </div>
            </AdminCard>
          </div>

          <div className="space-y-4">
            <AdminCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">Preview DailyDictation</p>
                  <p className="mt-1 text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">
                    Giao diện mô phỏng bài luyện nghe-chép để kiểm tra transcript trước khi publish.
                  </p>
                </div>
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 admin-dark:border-[var(--admin-border)] admin-dark:bg-[#15213b]">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      previewTab === "dictation"
                        ? "bg-white text-slate-900 shadow-sm admin-dark:bg-[var(--admin-surface)] admin-dark:text-[var(--admin-text)]"
                        : "text-slate-500 admin-dark:text-[var(--admin-muted)]"
                    }`}
                    onClick={() => setPreviewTab("dictation")}
                  >
                    Dictation
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      previewTab === "transcript"
                        ? "bg-white text-slate-900 shadow-sm admin-dark:bg-[var(--admin-surface)] admin-dark:text-[var(--admin-text)]"
                        : "text-slate-500 admin-dark:text-[var(--admin-muted)]"
                    }`}
                    onClick={() => setPreviewTab("transcript")}
                  >
                    Full transcript
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 admin-dark:border-[var(--admin-border)] admin-dark:bg-[#15213b]">
                <select
                  value={translationMode}
                  onChange={(e) => setTranslationMode(e.target.value as any)}
                  className="input-modern min-w-[180px]"
                >
                  <option value="none">No translation</option>
                  <option value="vi">Vietnamese</option>
                  <option value="ipa">IPA</option>
                  <option value="both">VI + IPA</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 admin-dark:text-[var(--admin-text)]">
                  <input type="checkbox" checked={repeatSegment} onChange={(e) => setRepeatSegment(e.target.checked)} />
                  Repeat
                </label>
                <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(e.target.value)} className="input-modern min-w-[110px]">
                  <option value="0.75x">0.75x</option>
                  <option value="1x">1x</option>
                  <option value="1.25x">1.25x</option>
                  <option value="1.5x">1.5x</option>
                </select>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
                  {previewTab === "dictation" ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">
                            Câu {currentSegment ? currentSegment.order : 0}/{segments.length}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">
                            {currentSegment ? `${fmtTime(currentSegment.startSec)} → ${fmtTime(currentSegment.endSec)}` : "—"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary inline-flex items-center gap-2"
                          onClick={() => setShowAnswer((prev) => !prev)}
                        >
                          {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {showAnswer ? "Ẩn đáp án" : "Hiện đáp án"}
                        </button>
                      </div>

                      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 admin-dark:border-blue-500/20 admin-dark:bg-blue-500/10">
                        <p className="text-center text-lg font-extrabold leading-relaxed text-slate-900 admin-dark:text-[var(--admin-text)]">
                          {showAnswer ? currentSegment?.textEn ?? "Không có câu để luyện." : "Nghe câu rồi gõ lại nội dung bạn nghe được."}
                        </p>
                        {(translationMode === "ipa" || translationMode === "both") && currentSegment?.ipa ? (
                          <p className="mt-2 text-center text-sm font-semibold text-sky-700 admin-dark:text-sky-200">
                            {currentSegment.ipa}
                          </p>
                        ) : null}
                        {(translationMode === "vi" || translationMode === "both") && currentSegment?.textVi ? (
                          <p className="mt-2 text-center text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">
                            {currentSegment.textVi}
                          </p>
                        ) : null}
                      </div>

                      <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        rows={5}
                        placeholder="Nghe và gõ lại câu tại đây..."
                        className="input-modern min-h-[132px] w-full resize-y px-3 py-2"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary h-10 w-10 px-0"
                          aria-label="Câu trước"
                          disabled={activeSegmentIndex <= 0}
                          onClick={() => setActiveSegmentIndex((idx) => Math.max(0, idx - 1))}
                        >
                          <SkipBack className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-primary inline-flex items-center gap-2"
                          onClick={() => playSegment(activeSegmentIndex)}
                          disabled={!currentSegment}
                        >
                          <Play className="h-4 w-4" />
                          Phát câu
                        </button>
                        <button
                          type="button"
                          className="btn-secondary h-10 w-10 px-0"
                          aria-label="Dừng"
                          onClick={() => {
                            clearYtTick();
                            try {
                              ytPlayerRef.current?.pauseVideo?.();
                            } catch {}
                          }}
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-secondary inline-flex items-center gap-2"
                          onClick={() => setCheckedAnswer(answer)}
                          disabled={!answer.trim()}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Check
                        </button>
                        <button
                          type="button"
                          className="btn-secondary h-10 w-10 px-0"
                          aria-label="Câu tiếp theo"
                          disabled={activeSegmentIndex >= segments.length - 1}
                          onClick={() => setActiveSegmentIndex((idx) => Math.min(segments.length - 1, idx + 1))}
                        >
                          <SkipForward className="h-4 w-4" />
                        </button>
                      </div>

                      {compareResult ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 admin-dark:border-[var(--admin-border)] admin-dark:bg-[#15213b]">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Đúng: {compareResult.correct}</span>
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Thiếu: {compareResult.missing}</span>
                            <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Thừa: {compareResult.extra}</span>
                            <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">Sai: {compareResult.mismatch}</span>
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
                  ) : (
                    <div className="max-h-[460px] space-y-3 overflow-auto pr-1">
                      {segments.map((segment, index) => (
                        <button
                          key={`${segment.order}-${segment.startSec}`}
                          type="button"
                          onClick={() => setActiveSegmentIndex(index)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            index === activeSegmentIndex
                              ? "border-blue-300 bg-blue-50 admin-dark:border-blue-500/30 admin-dark:bg-blue-500/10"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100 admin-dark:border-[var(--admin-border)] admin-dark:bg-[#15213b] admin-dark:hover:bg-[#1c2a47]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">
                              Câu {segment.order}
                            </p>
                            <p className="text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">
                              {fmtTime(segment.startSec)} → {fmtTime(segment.endSec)}
                            </p>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-slate-700 admin-dark:text-[var(--admin-text)]">{segment.textEn}</p>
                          {(translationMode === "ipa" || translationMode === "both") && segment.ipa ? (
                            <p className="mt-2 text-xs font-semibold text-sky-700 admin-dark:text-sky-200">{segment.ipa}</p>
                          ) : null}
                          {(translationMode === "vi" || translationMode === "both") && segment.textVi ? (
                            <p className="mt-1 text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">{segment.textVi}</p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
                  <p className="text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">Danh sách câu</p>
                  <div className="mt-3 max-h-[460px] space-y-2 overflow-auto pr-1">
                    {segments.map((segment, index) => (
                      <div
                        key={`${segment.order}-${segment.endSec}`}
                        className={`rounded-2xl border p-3 transition ${
                          index === activeSegmentIndex
                            ? "border-blue-300 bg-blue-50 admin-dark:border-blue-500/30 admin-dark:bg-blue-500/10"
                            : "border-slate-200 bg-slate-50 admin-dark:border-[var(--admin-border)] admin-dark:bg-[#15213b]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)] admin-dark:text-[var(--admin-text)]"
                            onClick={() => {
                              setActiveSegmentIndex(index);
                              playSegment(index);
                            }}
                            aria-label={`Phát câu ${segment.order}`}
                          >
                            <Play className="h-4 w-4" />
                          </button>
                          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setActiveSegmentIndex(index)}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">Câu {segment.order}</p>
                              <span className="text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">
                                {fmtTime(segment.startSec)}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-3 text-sm text-slate-700 admin-dark:text-[var(--admin-text)]">{segment.textEn}</p>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">Segments</p>
                  <p className="mt-1 text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">
                    Chỉnh sửa EN/VI và timestamp. Sau đó bấm “Lưu segments”.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2"
                  disabled={saving || segments.length === 0}
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      await apiClient.admin.dailyDictation.replaceSegments(content.id, {
                        segments: segments.map((segment) => ({
                          order: segment.order,
                          startSec: segment.startSec,
                          endSec: segment.endSec,
                          textEn: segment.textEn,
                          textVi: segment.textVi ?? null,
                        })),
                      });
                      await load();
                    } catch (e: any) {
                      setError(e?.message ?? "Không lưu được segments.");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                  Lưu segments
                </button>
              </div>

              <div className="mt-3 overflow-auto rounded-2xl border border-slate-200 admin-dark:border-[var(--admin-border)]">
                <table className="min-w-[860px] w-full border-collapse bg-white text-sm admin-dark:bg-[var(--admin-surface)]">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-600 admin-dark:bg-[var(--admin-surface-2)] admin-dark:text-[var(--admin-muted)]">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-left">Time</th>
                      <th className="px-2 py-2 text-left">EN</th>
                      <th className="px-2 py-2 text-left">VI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSegments.map((segment, localIdx) => {
                      const absoluteIndex = (safeSegmentPage - 1) * segmentPageSize + localIdx;
                      return (
                        <tr
                          key={`${segment.order}-${absoluteIndex}`}
                          className="border-t border-slate-200 transition hover:bg-slate-50 admin-dark:border-[var(--admin-border)] admin-dark:hover:bg-[#15213b]"
                        >
                          <td className="px-2 py-2 align-top font-bold text-slate-700 admin-dark:text-[var(--admin-text)]">
                            {segment.order}
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="flex items-center gap-1.5">
                              <input
                                value={segment.startSec}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setSegments((prev) => {
                                    const next = prev.slice();
                                    next[absoluteIndex] = { ...next[absoluteIndex], startSec: Number.isFinite(value) ? value : 0 };
                                    return next;
                                  });
                                }}
                                className="input-modern w-[78px]"
                                type="number"
                                min={0}
                              />
                              <span className="text-xs text-slate-400">→</span>
                              <input
                                value={segment.endSec}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setSegments((prev) => {
                                    const next = prev.slice();
                                    next[absoluteIndex] = { ...next[absoluteIndex], endSec: Number.isFinite(value) ? value : 0 };
                                    return next;
                                  });
                                }}
                                className="input-modern w-[78px]"
                                type="number"
                                min={0}
                              />
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">
                              {fmtTime(segment.startSec)} → {fmtTime(segment.endSec)}
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <textarea
                              value={segment.textEn}
                              onChange={(e) => {
                                const value = e.target.value;
                                setSegments((prev) => {
                                  const next = prev.slice();
                                  next[absoluteIndex] = { ...next[absoluteIndex], textEn: value };
                                  return next;
                                });
                              }}
                              rows={3}
                              className="input-modern min-h-[80px] w-full resize-y px-2.5 py-2 text-[0.92rem] leading-[1.35]"
                            />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <textarea
                              value={segment.textVi ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setSegments((prev) => {
                                  const next = prev.slice();
                                  next[absoluteIndex] = { ...next[absoluteIndex], textVi: value };
                                  return next;
                                });
                              }}
                              rows={3}
                              className="input-modern min-h-[80px] w-full resize-y px-2.5 py-2 text-[0.92rem] leading-[1.35]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-500 admin-dark:text-[var(--admin-muted)]">
                <span>
                  Hiển thị {segments.length === 0 ? 0 : (safeSegmentPage - 1) * segmentPageSize + 1}-
                  {Math.min(safeSegmentPage * segmentPageSize, segments.length)} / {segments.length}
                </span>
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
                  <button
                    type="button"
                    className="btn-secondary h-9 w-9 px-0"
                    onClick={() => setSegmentPage((current) => Math.max(1, current - 1))}
                    disabled={safeSegmentPage <= 1}
                    aria-label="Trang trước"
                    title="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-700 admin-dark:text-[var(--admin-text)]">
                    {safeSegmentPage}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary h-9 w-9 px-0"
                    onClick={() => setSegmentPage((current) => Math.min(segmentsTotalPages, current + 1))}
                    disabled={safeSegmentPage >= segmentsTotalPages}
                    aria-label="Trang sau"
                    title="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
      )}
    </div>
  );
}
