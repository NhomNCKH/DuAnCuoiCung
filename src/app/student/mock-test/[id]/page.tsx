"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ProctoringCamera } from "@/components/proctoring/ProctoringCamera";
import { useAuth } from "@/hooks/useAuth";

import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Headphones,
  Library,
  Languages,
  Plus,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getSignedMediaUrl } from "@/lib/media-url";
import { useToast } from "@/hooks/useToast";
import {
  buildBackFromMeta,
  serializeVocabMeta,
  toVocabMetaFromLookup,
} from "@/lib/flashcard-vocab";
import {
  mapAttemptResultToMockExam,
  mapAttemptSessionToMockExam,
  type MockExamAttemptView,
  type MockExamQuestion,
  type MockExamResultView,
  type MockExamSharedAsset,
} from "@/lib/learner-exam-adapter";
import type {
  LearnerExamAttemptHistoryItem,
  LearnerAttemptResultData,
  LearnerAttemptReviewItem,
  LearnerAttemptReviewQuestion,
  LearnerAttemptSessionAsset,
} from "@/types/learner-exam";

type PageState = "loading" | "exam" | "submitting" | "result" | "error";

type ProctoringNotice = {
  id: string;
  action: string;
  message: string;
  severity: number;
  confidence: number;
};

type VocabularyLookupResult = {
  expression?: string;
  partOfSpeech?: string;
  pronunciation?: string;
  meaningVi?: string;
  meaningEn?: string;
  phrasalVerbs?: string[];
  synonyms?: string[];
  antonyms?: string[];
  examples?: Array<{ en?: string; vi?: string }>;
  note?: string;
};

const PART_LABEL: Record<string, string> = {
  P1: "Part 1 - Photos",
  P2: "Part 2 - Question-Response",
  P3: "Part 3 - Conversations",
  P4: "Part 4 - Talks",
  P5: "Part 5 - Incomplete Sentences",
  P6: "Part 6 - Text Completion",
  P7: "Part 7 - Reading Comprehension",
};

const PROCTORING_ACTION_LABEL: Record<string, string> = {
  face_mismatch: "Danh tinh khong khop voi anh dang ky",
  face_verification_failed: "Khong xac minh duoc danh tinh",
  leaving_frame: "Rời khỏi khung hình",
  multiple_faces: "Có nhiều người trong khung hình",
  phone_usage: "Sử dụng điện thoại",
  cheating_device: "Thiết bị/vật dụng không được phép",
  looking_away: "Nhìn ra ngoài màn hình",
  face_occluded: "Che khuôn mặt",
  eye_closed: "Nhắm mắt quá lâu",
  camera_unavailable: "Không tìm thấy camera",
  camera_permission_denied: "Không có quyền truy cập camera",
  tab_switch: "Chuyển tab",
  window_blur: "Cửa sổ bài thi mất tiêu điểm",
  fullscreen_exit: "Thoát toàn màn hình",
  split_screen: "Chia đôi màn hình",
  page_leave: "Rời khỏi trang làm bài",
  context_menu: "Mở menu chuột phải",
  forbidden_key: "Dùng phím tắt cấm",
  unknown: "Vi phạm quy chế",
};

function getProctoringNoticeMessage(violation: any) {
  const action = String(violation?.action || "unknown");
  const fallback = PROCTORING_ACTION_LABEL[action] ?? PROCTORING_ACTION_LABEL.unknown;
  const message = typeof violation?.message === "string" && violation.message.trim()
    ? violation.message.trim()
    : fallback;
  const severity = Number(violation?.severity ?? 1);

  return {
    action,
    title: fallback,
    message,
    severity: Number.isFinite(severity) ? severity : 1,
    confidence: Number(violation?.confidence ?? 0),
  };
}

const PART_TAB_LABEL: Record<string, string> = {
  P1: "Part 1",
  P2: "Part 2",
  P3: "Part 3",
  P4: "Part 4",
  P5: "Part 5",
  P6: "Part 6",
  P7: "Part 7",
};

const LISTENING_PARTS = new Set(["P1", "P2", "P3", "P4"]);
const GROUPED_PARTS = new Set(["P3", "P4", "P6", "P7"]);

function Study4LikeP1Image({
  asset,
  resolveAssetUrl,
}: {
  asset?: MockExamSharedAsset;
  resolveAssetUrl: (asset?: MockExamSharedAsset) => Promise<string | undefined>;
}) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    if (typeof window === "undefined") return;
    const el = hostRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "250px 0px", threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    setFailed(false);
    setUrl(undefined);

    const run = async () => {
      const resolved = await resolveAssetUrl(asset);
      if (!cancelled) setUrl(resolved);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [asset, resolveAssetUrl, shouldLoad]);

  if (!asset) return null;

  if (failed) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-amber-800 dark:border-slate-600/40 dark:bg-white/5 dark:text-amber-100">
        Không tải được hình ảnh của câu này.
      </div>
    );
  }

  if (!url) {
    return (
      <div
        ref={hostRef}
        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-600/40 dark:bg-white/5 dark:text-slate-300"
      >
        {shouldLoad ? "Đang tải hình..." : "Sắp tải hình..."}
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-600/40 dark:bg-transparent"
    >
      <img
        src={url}
        alt="Question image"
        className="max-h-[560px] w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function Study4LikeP1Audio({
  asset,
  resolveAssetUrl,
}: {
  asset?: MockExamSharedAsset;
  resolveAssetUrl: (asset?: MockExamSharedAsset) => Promise<string | undefined>;
}) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    if (typeof window === "undefined") return;
    const el = hostRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "250px 0px", threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    setFailed(false);
    setUrl(undefined);

    const run = async () => {
      const resolved = await resolveAssetUrl(asset);
      if (!cancelled) setUrl(resolved);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [asset, resolveAssetUrl, shouldLoad]);

  if (!asset) return null;

  if (failed) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-amber-800 dark:border-slate-600/40 dark:bg-white/5 dark:text-amber-100">
        Không tải được audio của câu này.
      </div>
    );
  }

  if (!url) {
    return (
      <div
        ref={hostRef}
        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-slate-600/40 dark:bg-white/5 dark:text-slate-300"
      >
        {shouldLoad ? "Đang tải audio..." : "Sắp tải audio..."}
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-600/40 dark:bg-transparent"
    >
      <audio
        controls
        className="w-full"
        onError={() => setFailed(true)}
      >
        <source src={url} />
      </audio>
    </div>
  );
}

function isListeningPart(part?: string | null) {
  return !!part && LISTENING_PARTS.has(part);
}

function isGroupedPart(part?: string | null) {
  return !!part && GROUPED_PARTS.has(part);
}

function shouldHideOptionText(part?: string | null) {
  return part === "P1" || part === "P2";
}

function getAssetByKind(
  assets: MockExamSharedAsset[] | undefined,
  kind: string,
): MockExamSharedAsset | undefined {
  return assets?.find((asset) => asset.kind === kind);
}

function getAssetCacheKey(asset?: MockExamSharedAsset): string | null {
  if (!asset) return null;
  return asset.storageKey ?? asset.publicUrl ?? asset.id ?? null;
}

function deriveStorageKeyFromPublicUrl(publicUrl?: string | null): string | null {
  if (!publicUrl) return null;

  try {
    const parsed = new URL(publicUrl);
    const rawPath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    if (!rawPath) return null;

    const host = parsed.hostname.toLowerCase();
    if (host === "s3.amazonaws.com" || host.startsWith("s3.")) {
      const segments = rawPath.split("/");
      return segments.length > 1 ? segments.slice(1).join("/") : rawPath;
    }

    return rawPath;
  } catch {
    return null;
  }
}

function getQuestionPrompt(question: MockExamQuestion): string {
  if (question.part === "P1" || question.part === "P2") {
    return "";
  }

  const content = question.content.trim();
  if (content) return content;

  return "";
}

function getVisibleOptions(question: MockExamQuestion) {
  return (question.options ?? []).filter((option) => {
    if (question.part === "P2") {
      return option.key !== "D" && option.text.trim().toUpperCase() !== "N/A";
    }

    return true;
  });
}

function getOptionText(question: MockExamQuestion, option: { key: string; text: string }) {
  const text = option.text.trim();

  if (question.part === "P2") {
    return text && text.toUpperCase() !== "N/A" ? text : `Đáp án ${option.key}`;
  }

  return text || `Lựa chọn ${option.key}`;
}

function getRemainingSeconds(
  startedAt: string | undefined,
  totalDurationSec: number | undefined,
) {
  if (!startedAt || !totalDurationSec || totalDurationSec <= 0) {
    return null;
  }

  const startedAtMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedAtMs)) {
    return null;
  }

  const elapsed = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
  return Math.max(0, totalDurationSec - elapsed);
}

function getAssetContentText(
  assets: LearnerAttemptSessionAsset[] | undefined,
  kind: string,
) {
  return assets?.find((asset) => asset.kind === kind)?.contentText?.trim() ?? "";
}

function formatAttemptDuration(durationSec?: number | null) {
  if (!durationSec || durationSec <= 0) {
    return "—";
  }

  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatAttemptDate(dateTime?: string | null) {
  if (!dateTime) {
    return "—";
  }

  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAttemptStatusLabel(status?: string) {
  switch (status) {
    case "graded":
      return "Đã chấm điểm";
    case "in_progress":
      return "Đang làm dở";
    default:
      return status ?? "—";
  }
}

function isAttemptClosedError(error: any) {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    error?.statusCode === 400 &&
    (message.includes("chi duoc luu dap an khi bai thi dang mo") ||
      message.includes("phien lam bai khong o trang thai nop bai"))
  );
}

function getRequestErrorMessage(error: any, fallback: string) {
  if (error?.statusCode === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.";
  }

  return error?.message || fallback;
}

function InfoTip({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <span className="group inline-flex items-center">
        <span
          tabIndex={0}
          role="button"
          aria-label="Thông tin"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[12px] font-black text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5 dark:focus-visible:ring-offset-transparent"
        >
          i
        </span>

        <span className="pointer-events-none absolute left-1/2 top-0 z-50 hidden w-[300px] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold leading-6 text-white shadow-xl group-hover:block group-focus-within:block">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-slate-900" />
        </span>
      </span>
    </span>
  );
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function extractApiData<T = any>(raw: any): T | null {
  const data = raw?.data?.data ?? raw?.data ?? raw;
  return (data as T) ?? null;
}

function getFloatingPosition(
  rect: DOMRect,
  options?: { width?: number; height?: number; gap?: number; padding?: number; safeTop?: number },
) {
  const width = options?.width ?? 360;
  const height = options?.height ?? 460;
  const gap = options?.gap ?? 10;
  const padding = options?.padding ?? 12;
  const safeTop = options?.safeTop ?? 74;

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;

  const left = Math.max(padding, Math.min(rect.left, viewportW - width - padding));

  const topBelow = rect.bottom + gap;
  const topAbove = rect.top - height - gap;
  const top =
    topBelow + height <= viewportH - padding
      ? topBelow
      : Math.max(safeTop, Math.min(topAbove, viewportH - height - padding));

  return { top, left };
}

function CreateFlashcardFromSelectionModal({
  open,
  onClose,
  seedText,
}: {
  open: boolean;
  onClose: () => void;
  seedText?: string;
}) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [decks, setDecks] = useState<Array<{ id: string; title: string }>>([]);
  const [deckId, setDeckId] = useState<string>("");
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!open) return;
    setFront(seedText?.trim() ?? "");
    setBack("");
    setNote("");
    setTags("");
    setCreatingDeck(false);
    setNewDeckTitle("");

    let cancelled = false;
    setLoading(true);
    apiClient.learner.flashcards
      .listDecks({ limit: 50, sort: "updatedAt", order: "DESC" })
      .then((res: any) => {
        const payload = res?.data?.data ?? res?.data ?? res;
        const items = payload?.items ?? payload?.data?.items ?? [];
        const next = (items ?? []).map((d: any) => ({ id: d.id, title: d.title }));
        if (!cancelled) {
          setDecks(next);
          setDeckId(next[0]?.id ?? "");
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          notify({
            variant: "error",
            title: "Không tải được danh sách bộ",
            message: e?.message || "Vui lòng thử lại.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, seedText, notify]);

  if (!open) return null;

  const parsedTags = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px]"
        onClick={onClose}
        aria-label="Đóng"
      />
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-600/40 dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Tạo flashcard từ đoạn bôi đen
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Đoạn chọn sẽ được điền vào mặt trước. Bạn bổ sung nghĩa và lưu vào bộ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
          >
            Đóng
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Bộ flashcard
            </label>
            <div className="flex gap-2">
              <select
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                disabled={loading || creatingDeck}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 disabled:opacity-60 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
              >
                {decks.length === 0 ? (
                  <option value="">— Chưa có bộ — (bấm Tạo)</option>
                ) : null}
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCreatingDeck((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-amber-50 hover:text-amber-900 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
              >
                <Plus className="h-4 w-4" />
                Tạo
              </button>
            </div>

            {creatingDeck ? (
              <div className="mt-2 flex gap-2">
                <input
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="Tên bộ mới (VD: Từ vựng từ đề thi)"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  disabled={!newDeckTitle.trim()}
                  onClick={async () => {
                    const title = newDeckTitle.trim();
                    if (!title) return;
                    setLoading(true);
                    try {
                      const res: any = await apiClient.learner.flashcards.createDeck({ title });
                      const payload = res?.data?.data ?? res?.data ?? res;
                      const created = { id: payload.id, title: payload.title };
                      setDecks((prev) => [created, ...prev]);
                      setDeckId(created.id);
                      setCreatingDeck(false);
                      setNewDeckTitle("");
                      notify({ variant: "success", title: "Đã tạo bộ flashcard" });
                    } catch (e: any) {
                      notify({
                        variant: "error",
                        title: "Tạo bộ thất bại",
                        message: e?.message || "Vui lòng thử lại.",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Tags (phân tách bằng dấu phẩy)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="toeic, part5"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Mặt trước
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Mặt sau
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={5}
              placeholder="Nhập nghĩa/giải thích..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="VD: Câu ví dụ / bối cảnh"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!deckId || !front.trim() || !back.trim() || loading}
            onClick={async () => {
              if (!deckId) return;
              setLoading(true);
              try {
                await apiClient.learner.flashcards.createCard(deckId, {
                  front: front.trim(),
                  back: back.trim(),
                  note: note.trim() || undefined,
                  tags: parsedTags.length ? parsedTags : undefined,
                });
                notify({ variant: "success", title: "Đã lưu flashcard" });
                onClose();
              } catch (e: any) {
                notify({
                  variant: "error",
                  title: "Lưu flashcard thất bại",
                  message: e?.message || "Vui lòng thử lại.",
                });
              } finally {
                setLoading(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Lưu flashcard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MockTestExamPage() {
  const { user } = useAuth();
  const [proctoringNotices, setProctoringNotices] = useState<ProctoringNotice[]>([]);

  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { notify } = useToast();
  const searchParams = useSearchParams();
  const qs = searchParams ?? new URLSearchParams();
  const reviewAttemptId = qs.get("attemptId")?.trim() ?? "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [attempt, setAttempt] = useState<MockExamAttemptView | null>(null);
  const [result, setResult] = useState<MockExamResultView | null>(null);
  const [resultPayload, setResultPayload] = useState<LearnerAttemptResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [allQuestions, setAllQuestions] = useState<MockExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptHistory, setAttemptHistory] = useState<LearnerExamAttemptHistoryItem[]>([]);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [proctoringActive, setProctoringActive] = useState(false);
  const [isDesktopExamLayout, setIsDesktopExamLayout] = useState(false);
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [flashcardCreateOpen, setFlashcardCreateOpen] = useState(false);
  const [flashcardSeedText, setFlashcardSeedText] = useState<string>("");
  const [vocabLookupOpen, setVocabLookupOpen] = useState(false);
  const [vocabLookupLoading, setVocabLookupLoading] = useState(false);
  const [vocabLookupError, setVocabLookupError] = useState("");
  const [vocabLookupResult, setVocabLookupResult] = useState<VocabularyLookupResult | null>(null);
  const [vocabLookupExpression, setVocabLookupExpression] = useState("");
  const [vocabPopupPos, setVocabPopupPos] = useState<{ top: number; left: number } | null>(null);
  const [vocabTriggerPos, setVocabTriggerPos] = useState<{ top: number; left: number } | null>(null);
  const [vocabSaving, setVocabSaving] = useState(false);
  const [vocabDeckChoices, setVocabDeckChoices] = useState<Array<{ id: string; title: string }>>([]);
  const [vocabSelectedDeckId, setVocabSelectedDeckId] = useState("");
  const vocabLookupSeqRef = useRef(0);
  const vocabPopupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!highlightEnabled) return;
    if (typeof window === "undefined") return;
    const onMouseUp = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && vocabPopupRef.current?.contains(target)) return;
      const sel = window.getSelection?.();
      const text = sel?.toString?.().trim?.() ?? "";
      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
      if (!text || text.length < 2 || text.length > 80 || wordCount > 8) return;

      const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect?.();
      if (!rect) return;

      setFlashcardSeedText(text);
      setVocabLookupExpression(text);
      setVocabLookupOpen(false);
      setVocabLookupLoading(false);
      setVocabLookupError("");
      setVocabLookupResult(null);
      setVocabDeckChoices([]);
      setVocabSelectedDeckId("");

      setVocabPopupPos(getFloatingPosition(rect));
      const triggerTop = Math.min(window.innerHeight - 54, Math.max(8, rect.bottom + 6));
      const triggerLeft = Math.min(window.innerWidth - 54, Math.max(8, rect.right - 18));
      setVocabTriggerPos({ top: triggerTop, left: triggerLeft });
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [highlightEnabled, allQuestions, currentIdx]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia("(min-width: 1280px)");
    const syncLayout = () => setIsDesktopExamLayout(query.matches);

    syncLayout();
    query.addEventListener("change", syncLayout);
    return () => query.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    if (!vocabLookupOpen && !vocabTriggerPos) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (vocabPopupRef.current && target && !vocabPopupRef.current.contains(target)) {
        setVocabLookupOpen(false);
        setVocabTriggerPos(null);
        setVocabDeckChoices([]);
        setVocabSelectedDeckId("");
      }
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVocabLookupOpen(false);
        setVocabTriggerPos(null);
        setVocabDeckChoices([]);
        setVocabSelectedDeckId("");
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [vocabLookupOpen, vocabTriggerPos]);

  useEffect(() => {
    if (!vocabLookupOpen || !vocabPopupPos) return;
    if (typeof window === "undefined") return;
    const el = vocabPopupRef.current;
    if (!el) return;

    const padding = 12;
    const safeTop = 74;
    const nextTop = Math.max(
      safeTop,
      Math.min(vocabPopupPos.top, window.innerHeight - el.offsetHeight - padding),
    );
    const nextLeft = Math.max(
      padding,
      Math.min(vocabPopupPos.left, window.innerWidth - el.offsetWidth - padding),
    );

    if (nextTop !== vocabPopupPos.top || nextLeft !== vocabPopupPos.left) {
      setVocabPopupPos({ top: nextTop, left: nextLeft });
    }
  }, [vocabLookupOpen, vocabPopupPos, vocabLookupLoading, vocabLookupError, vocabLookupResult]);

  useEffect(() => {
    if (!vocabLookupOpen || !vocabPopupPos) return;
    if (typeof window === "undefined") return;
    const reflow = () => {
      const el = vocabPopupRef.current;
      if (!el) return;
      const padding = 12;
      const safeTop = 74;
      const nextTop = Math.max(
        safeTop,
        Math.min(vocabPopupPos.top, window.innerHeight - el.offsetHeight - padding),
      );
      const nextLeft = Math.max(
        padding,
        Math.min(vocabPopupPos.left, window.innerWidth - el.offsetWidth - padding),
      );
      if (nextTop !== vocabPopupPos.top || nextLeft !== vocabPopupPos.left) {
        setVocabPopupPos({ top: nextTop, left: nextLeft });
      }
    };

    const onViewportChange = () => window.requestAnimationFrame(reflow);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [vocabLookupOpen, vocabPopupPos]);

  useEffect(() => {
    if (highlightEnabled) return;
    setVocabLookupOpen(false);
    setVocabTriggerPos(null);
    setVocabDeckChoices([]);
    setVocabSelectedDeckId("");
  }, [highlightEnabled]);
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});
  const [resolvedMedia, setResolvedMedia] = useState<{
    audioUrl?: string;
    imageUrl?: string;
  }>({});
  const [mediaError, setMediaError] = useState({
    audio: false,
    image: false,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<Record<string, string>>({});
  const submittingRef = useRef(false);
  const recoveringResultRef = useRef(false);
  const answersRef = useRef<Record<string, string>>({});
  const submitRef = useRef<(autoSubmit?: boolean) => void>(() => {});
  const mediaUrlCacheRef = useRef<Record<string, string>>({});

  const clearTimerInterval = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const clearAutoSaveInterval = useCallback(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
  }, []);

  const handleProctoringViolation = useCallback((violation: any) => {
    const notice = getProctoringNoticeMessage(violation);
    const id = `${notice.action}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setProctoringNotices((prev) => [
      {
        id,
        action: notice.title,
        message: notice.message,
        severity: notice.severity,
        confidence: notice.confidence,
      },
      ...prev,
    ].slice(0, 4));

    window.setTimeout(() => {
      setProctoringNotices((prev) => prev.filter((item) => item.id !== id));
    }, 8000);
  }, []);

  const handleProctoringBlocked = useCallback(() => {
    setProctoringActive(false);
    clearTimerInterval();
    clearAutoSaveInterval();
    setErrorMsg("Bai thi da bi dinh chi do vi pham quy che.");
    setPageState("error");
  }, [clearAutoSaveInterval, clearTimerInterval]);

  const leaveExam = useCallback(() => {
    setProctoringActive(false);
    clearTimerInterval();
    clearAutoSaveInterval();
    router.push("/student/mock-test");
  }, [clearAutoSaveInterval, clearTimerInterval, router]);

  const scrollToReviewSection = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById("review-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const resolveAssetUrl = useCallback(async (asset?: MockExamSharedAsset) => {
    if (!asset) return undefined;

    const cacheKey = getAssetCacheKey(asset);
    if (cacheKey && mediaUrlCacheRef.current[cacheKey]) {
      return mediaUrlCacheRef.current[cacheKey];
    }

    let resolvedUrl: string | null = null;
    const storageKey = asset.storageKey ?? deriveStorageKeyFromPublicUrl(asset.publicUrl);

    if (storageKey) {
      resolvedUrl = await getSignedMediaUrl(storageKey);
    }

    if (!resolvedUrl && asset.publicUrl) {
      resolvedUrl = asset.publicUrl;
    }

    if (cacheKey && resolvedUrl) {
      mediaUrlCacheRef.current[cacheKey] = resolvedUrl;
    }

    return resolvedUrl ?? undefined;
  }, []);

  const showResultView = useCallback((payload: LearnerAttemptResultData) => {
    setResultPayload(payload);
    setResult(mapAttemptResultToMockExam(payload));
    setPageState("result");
  }, []);

  const getChangedAnswerPayload = useCallback(
    (currentAnswers: Record<string, string>) =>
      Object.entries(currentAnswers)
        .filter(([questionId, selectedOptionKey]) => {
          return (
            Boolean(selectedOptionKey) &&
            lastSavedRef.current[questionId] !== selectedOptionKey
          );
        })
        .map(([questionId, selectedOptionKey]) => ({
          questionId,
          selectedOptionKey,
          answeredAt: new Date().toISOString(),
        })),
    [],
  );

  const loadAttemptHistory = useCallback(async () => {
    try {
      const historyRes = await apiClient.learner.examAttempt.listHistory({
        examTemplateId: id,
        limit: 100,
      });
      setAttemptHistory(historyRes.data.data ?? []);
    } catch {
      setAttemptHistory([]);
    }
  }, [id]);

  const recoverClosedAttemptResult = useCallback(
    async (error?: any) => {
      if (!attempt?.id || recoveringResultRef.current) {
        return false;
      }

      if (error && !isAttemptClosedError(error)) {
        return false;
      }

      recoveringResultRef.current = true;
      clearTimerInterval();
      clearAutoSaveInterval();

      try {
        const resultRes = await apiClient.learner.examAttempt.getResult(attempt.id);
        showResultView(resultRes.data);
        return true;
      } catch {
        return false;
      } finally {
        recoveringResultRef.current = false;
      }
    },
    [attempt?.id, clearAutoSaveInterval, clearTimerInterval, showResultView],
  );

  useEffect(() => {
    const start = async () => {
      setPageState("loading");
      setErrorMsg("");
      setResult(null);
      setResultPayload(null);
      setProctoringActive(false);

      try {
        if (reviewAttemptId) {
          const resultRes = await apiClient.learner.examAttempt.getResult(reviewAttemptId);
          if (resultRes.data.attempt.examTemplateId !== id) {
            throw new Error("Kết quả này không thuộc đề thi hiện tại");
          }

          showResultView(resultRes.data);
          return;
        }

        const forceNewAttempt =
          typeof window !== "undefined" &&
          window.sessionStorage.getItem(`mock-test-force-new:${id}`) === "1";

        if (forceNewAttempt && typeof window !== "undefined") {
          window.sessionStorage.removeItem(`mock-test-force-new:${id}`);
        }

        const res = await apiClient.learner.examAttempt.start({
          examTemplateId: id,
          forceNew: forceNewAttempt,
          metadata: {
            source: forceNewAttempt ? "restart-button" : "mock-test-page",
          },
        });
        const mapped = mapAttemptSessionToMockExam(res.data);
        setAttempt(mapped.attemptData);
        setAllQuestions(mapped.questions);
        setAnswers(mapped.savedAnswers);
        setCurrentIdx(0);
        answersRef.current = mapped.savedAnswers;
        lastSavedRef.current = mapped.savedAnswers;

        setTimeLeft(
          getRemainingSeconds(
            mapped.attemptData.startedAt,
            mapped.attemptData.totalDurationSec,
          ),
        );

        setProctoringActive(true);
        setPageState("exam");
      } catch (err: any) {
        setProctoringActive(false);
        setErrorMsg(getRequestErrorMessage(err, "Lỗi khi bắt đầu bài thi"));
        setPageState("error");
      }
    };

    start();
  }, [id, reviewAttemptId, showResultView]);

  useEffect(() => {
    if (pageState !== "result") {
      return;
    }

    void loadAttemptHistory();
  }, [loadAttemptHistory, pageState, resultPayload?.attempt.id]);

  useEffect(() => {
    if (pageState !== "result") {
      setReviewExpanded(false);
      setIsReviewLoading(false);
      return;
    }

    setReviewExpanded(false);
    setIsReviewLoading(false);
  }, [pageState, resultPayload?.attempt.id]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!attempt?.id) return;
    const key = `mock-test:review-flags:${attempt.id}`;
    setReviewFlags(safeJsonParse<Record<string, boolean>>(window.localStorage.getItem(key), {}));
  }, [attempt?.id]);

  const toggleReviewFlag = useCallback(
    (questionId: string) => {
      setReviewFlags((prev) => {
        const next = { ...prev, [questionId]: !prev[questionId] };
        if (typeof window !== "undefined" && attempt?.id) {
          const key = `mock-test:review-flags:${attempt.id}`;
          window.localStorage.setItem(key, JSON.stringify(next));
        }
        return next;
      });
    },
    [attempt?.id],
  );

  const saveAnswers = useCallback(
    async (
      currentAnswers: Record<string, string>,
      options?: { suppressErrors?: boolean },
    ) => {
      if (!attempt) return;

      try {
        const payload = getChangedAnswerPayload(currentAnswers);

        if (payload.length === 0) return;

        await apiClient.learner.examAttempt.saveAnswers(attempt.id, {
          answers: payload,
        });
        lastSavedRef.current = {
          ...lastSavedRef.current,
          ...Object.fromEntries(
            payload.map((item) => [item.questionId, item.selectedOptionKey ?? ""]),
          ),
        };
        return true;
      } catch (error) {
        if (options?.suppressErrors) {
          void recoverClosedAttemptResult(error);
          return false;
        }

        throw error;
      }
    },
    [attempt, getChangedAnswerPayload, recoverClosedAttemptResult],
  );

  useEffect(() => {
    if (pageState !== "exam" || !attempt?.id) return;

    autoSaveRef.current = setInterval(() => {
      if (submittingRef.current || recoveringResultRef.current) {
        return;
      }

      const currentAnswers = answersRef.current;
      const changed = getChangedAnswerPayload(currentAnswers);

      if (changed.length > 0) {
        void saveAnswers(currentAnswers, { suppressErrors: true });
      }
    }, 30000);

    return () => clearAutoSaveInterval();
  }, [attempt?.id, clearAutoSaveInterval, getChangedAnswerPayload, pageState, saveAnswers]);

  const handleAnswer = (questionId: string, optionKey: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: optionKey };
      answersRef.current = next;
      return next;
    });
  };

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (!attempt || submittingRef.current) return;
      if (!autoSubmit && !confirm("Bạn có chắc muốn nộp bài?")) return;

      submittingRef.current = true;
      setProctoringActive(false);
      clearTimerInterval();
      clearAutoSaveInterval();
      setPageState("submitting");

      try {
        try {
          await saveAnswers(answersRef.current);
        } catch (error) {
          if (await recoverClosedAttemptResult(error)) {
            return;
          }
          throw error;
        }

        const submitRes = await apiClient.learner.examAttempt.submit(attempt.id, {
          metadata: { source: autoSubmit ? "auto-timeout" : "submit-button" },
        });

        showResultView(submitRes.data);
      } catch (err: any) {
        if (await recoverClosedAttemptResult(err)) {
          return;
        }

        setErrorMsg(getRequestErrorMessage(err, "Nộp bài thất bại"));
        setPageState("error");
      } finally {
        submittingRef.current = false;
      }
    },
    [
      attempt,
      clearAutoSaveInterval,
      clearTimerInterval,
      recoverClosedAttemptResult,
      saveAnswers,
      showResultView,
    ],
  );

  useEffect(() => {
    submitRef.current = (autoSubmit = false) => {
      void handleSubmit(autoSubmit);
    };
  }, [handleSubmit]);

  useEffect(() => {
    if (pageState !== "exam" || timeLeft === null) return;

    if (timeLeft <= 0) {
      clearTimerInterval();
      clearAutoSaveInterval();
      submitRef.current(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearTimerInterval();
          clearAutoSaveInterval();
          submitRef.current(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearTimerInterval();
  }, [clearAutoSaveInterval, clearTimerInterval, pageState, timeLeft]);

  const currentQuestion = allQuestions[currentIdx];

  const sectionsWithQuestions = useMemo(
    () =>
      (attempt?.sections ?? [])
        .map((section) => ({
          ...section,
          questions: section.questionGroups.flatMap((group) => group.questions),
        }))
        .filter((section) => section.questions.length > 0),
    [attempt?.sections],
  );

  const currentSection =
    sectionsWithQuestions.find((section) => section.id === currentQuestion?.sectionId) ??
    sectionsWithQuestions.find((section) =>
      section.questions.some((question) => question.id === currentQuestion?.id),
    ) ??
    null;

  const currentGroup =
    currentSection?.questionGroups.find((group) => group.id === currentQuestion?.groupId) ??
    null;

  const currentPart = currentSection?.part ?? currentQuestion?.part ?? "";

  useEffect(() => {
    let cancelled = false;

    const loadCurrentMedia = async () => {
      if (!currentQuestion) {
        setResolvedMedia({});
        setMediaError({ audio: false, image: false });
        return;
      }

      setMediaError({ audio: false, image: false });

      const part = currentPart ?? currentQuestion.part;
      const isGroupedListening = part === "P3" || part === "P4";
      if (isGroupedListening) {
        // Part 3/4 dùng audio theo nhóm (render riêng), tránh presign lặp hàng loạt ở đây.
        if (!cancelled) setResolvedMedia({});
        return;
      }
      const imageAsset = isGroupedListening
        ? getAssetByKind(currentGroup?.assets, "image") ?? getAssetByKind(currentQuestion.assets, "image")
        : getAssetByKind(currentQuestion.assets, "image");
      const audioAsset = isGroupedListening
        ? getAssetByKind(currentGroup?.assets, "audio") ?? getAssetByKind(currentQuestion.assets, "audio")
        : getAssetByKind(currentQuestion.assets, "audio");
      const [imageUrl, audioUrl] = await Promise.all([
        resolveAssetUrl(imageAsset),
        resolveAssetUrl(audioAsset),
      ]);

      if (!cancelled) {
        setResolvedMedia({ imageUrl, audioUrl });
      }
    };

    void loadCurrentMedia();

    return () => {
      cancelled = true;
    };
  }, [currentGroup?.assets, currentPart, currentQuestion, resolveAssetUrl]);
  const currentPartTabLabel = currentPart
    ? PART_TAB_LABEL[currentPart] ?? PART_LABEL[currentPart] ?? currentPart
    : "Đề thi";
  const isLongListPart = currentPart === "P1" || currentPart === "P2" || currentPart === "P5";
  const isCurrentListeningPart = isListeningPart(currentPart);
  const isCurrentGroupedPart = isGroupedPart(currentPart);

  const answeredCount = Object.keys(answers).length;
  const totalCount = allQuestions.length;
  const transcript = currentQuestion?.transcript?.trim() ?? "";
  const stem = currentQuestion?.stem?.trim() ?? "";
  const audioAsset = getAssetByKind(currentQuestion?.assets, "audio");
  const imageAsset = getAssetByKind(currentQuestion?.assets, "image");
  const hasAudioAsset = Boolean(audioAsset);
  const hasImageAsset = Boolean(imageAsset);
  const isStudy4P3P4 = currentPart === "P3" || currentPart === "P4";
  const groupedAudioAsset = isStudy4P3P4 ? getAssetByKind(currentGroup?.assets, "audio") : undefined;

  const jumpToQuestion = (questionId: string) => {
    const nextIndex = allQuestions.findIndex((question) => question.id === questionId);
    if (nextIndex >= 0) {
      setCurrentIdx(nextIndex);

      const targetQuestion = allQuestions[nextIndex];
      if (
        targetQuestion?.part === "P1" ||
        targetQuestion?.part === "P2" ||
        targetQuestion?.part === "P5"
      ) {
        requestAnimationFrame(() => {
          document
            .getElementById(`question-${questionId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const jumpToSection = (sectionId: string) => {
    const firstQuestion = allQuestions.find((question) => question.sectionId === sectionId);
    if (firstQuestion) {
      setCurrentIdx(firstQuestion.displayNumber - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const displayedQuestions = useMemo(() => {
    const rawQuestions =
      isLongListPart
        ? currentSection?.questions ?? []
        : isCurrentGroupedPart && (currentGroup?.questions.length ?? 0) > 1
        ? currentGroup?.questions ?? []
        : currentQuestion
          ? [currentQuestion]
          : [];

    return rawQuestions.filter(
      (question): question is MockExamQuestion => Boolean(question),
    );
  }, [currentGroup?.questions, currentQuestion, currentSection?.questions, isCurrentGroupedPart, isLongListPart]);

  const currentGroupStartIndex =
    displayedQuestions.length > 0
      ? allQuestions.findIndex((question) => question.id === displayedQuestions[0]?.id)
      : currentIdx;
  const currentGroupEndIndex =
    displayedQuestions.length > 0
      ? allQuestions.findIndex(
          (question) =>
            question.id === displayedQuestions[displayedQuestions.length - 1]?.id,
        )
      : currentIdx;

  const previousIndex = (() => {
    if (!currentQuestion) return -1;

    if (!isCurrentGroupedPart || displayedQuestions.length <= 1) {
      return currentIdx > 0 ? currentIdx - 1 : -1;
    }

    for (let index = currentGroupStartIndex - 1; index >= 0; index -= 1) {
      if (allQuestions[index]?.groupId !== currentQuestion.groupId) {
        return index;
      }
    }

    return -1;
  })();

  const nextIndex = (() => {
    if (!currentQuestion) return -1;

    if (!isCurrentGroupedPart || displayedQuestions.length <= 1) {
      return currentIdx < totalCount - 1 ? currentIdx + 1 : -1;
    }

    for (let index = currentGroupEndIndex + 1; index < allQuestions.length; index += 1) {
      if (allQuestions[index]?.groupId !== currentQuestion.groupId) {
        return index;
      }
    }

    return -1;
  })();

  const showTranscript = !isCurrentListeningPart && Boolean(transcript);
  const showStem = !isCurrentListeningPart && Boolean(stem);
  const showImage = Boolean(resolvedMedia.imageUrl) || (currentPart === "P1" && hasImageAsset);
  const hasSharedContext = showImage || showTranscript || showStem;
  const useReadingSplitLayout =
    (currentPart === "P6" || currentPart === "P7") && hasSharedContext;

  const formatTime = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const openReviewDetails = useCallback(async () => {
    if (!resultPayload?.attempt.id || isReviewLoading) {
      return;
    }

    if (resultPayload.review?.sections?.length) {
      setReviewExpanded(true);
      scrollToReviewSection();
      return;
    }

    setIsReviewLoading(true);
    try {
      const resultRes = await apiClient.learner.examAttempt.getResult(
        resultPayload.attempt.id,
      );
      showResultView(resultRes.data);
      setReviewExpanded(true);
      scrollToReviewSection();
    } catch (error: any) {
      setErrorMsg(getRequestErrorMessage(error, "Không thể tải đáp án chi tiết"));
      setPageState("error");
    } finally {
      setIsReviewLoading(false);
    }
  }, [
    isReviewLoading,
    resultPayload,
    scrollToReviewSection,
    showResultView,
  ]);

  const lookupVocabularyNow = useCallback(async () => {
    if (!vocabLookupExpression.trim()) return;
    setVocabLookupLoading(true);
    setVocabLookupError("");
    try {
      const current = allQuestions[currentIdx];
      const context = [current?.content, current?.transcript, current?.stem]
        .filter(Boolean)
        .join("\n")
        .slice(0, 1200);
      const requestId = ++vocabLookupSeqRef.current;
      const res: any = await apiClient.learner.ai.lookupVocabulary({
        expression: vocabLookupExpression.trim(),
        context,
        language: "vi",
      });
      if (requestId !== vocabLookupSeqRef.current) return;
      const payload = extractApiData<any>(res);
      setVocabLookupResult(payload?.result ?? null);
    } catch (e: any) {
      setVocabLookupError(e?.message || "Không thể tra lại từ này.");
    } finally {
      setVocabLookupLoading(false);
    }
  }, [allQuestions, currentIdx, vocabLookupExpression]);

  const saveSelectionToFlashcard = useCallback(async () => {
    const expression = (vocabLookupResult?.expression || vocabLookupExpression || flashcardSeedText).trim();
    if (!expression) return;

    const meta = toVocabMetaFromLookup(vocabLookupResult ?? null, expression);
    const back = buildBackFromMeta(meta);
    if (!back) {
      notify({
        variant: "warning",
        title: "Chưa đủ dữ liệu",
        message: "Vui lòng đợi AI trả nghĩa trước khi lưu flashcard.",
      });
      return;
    }

    setVocabSaving(true);
    try {
      const deckRes = await apiClient.learner.flashcards.listDecks({
        limit: 50,
        sort: "updatedAt",
        order: "DESC",
      });
      const deckPayload = extractApiData<any>(deckRes);
      const deckItems = (deckPayload?.items ?? deckPayload?.data?.items ?? []) as Array<{
        id: string;
        title: string;
      }>;
      let deck: { id: string; title: string } | null = null;

      if (!deckItems.length) {
        const createdRes = await apiClient.learner.flashcards.createDeck({
          title: "Từ vựng đã lưu",
          description: "Bộ từ vựng lưu nhanh khi làm bài thi",
        });
        deck = extractApiData<any>(createdRes);
      } else if (deckItems.length === 1) {
        deck = deckItems[0];
      } else {
        const safeSelectedId = deckItems.some((d) => d.id === vocabSelectedDeckId)
          ? vocabSelectedDeckId
          : deckItems[0].id;
        if (!vocabSelectedDeckId) {
          setVocabDeckChoices(deckItems.map((d) => ({ id: d.id, title: d.title })));
          setVocabSelectedDeckId(safeSelectedId);
          notify({
            variant: "warning",
            title: "Chọn bộ flashcard",
            message: "Bạn có nhiều bộ. Hãy chọn bộ muốn thêm từ.",
          });
          return;
        }
        deck = deckItems.find((d) => d.id === safeSelectedId) ?? deckItems[0];
      }
      if (!deck?.id) throw new Error("Không xác định được bộ flashcard để lưu.");

      await apiClient.learner.flashcards.createCard(deck.id, {
        front: expression,
        back,
        note: serializeVocabMeta(meta),
        tags: [currentPartTabLabel.toLowerCase().replace(/\s+/g, "-"), "vocab"],
      });

      notify({
        variant: "success",
        title: "Đã thêm vào flashcard",
        message: `"${expression}" đã được lưu vào bộ "${deck.title}".`,
      });
      setVocabDeckChoices([]);
      setVocabSelectedDeckId("");
    } catch (e: any) {
      notify({
        variant: "error",
        title: "Lưu flashcard thất bại",
        message: e?.message || "Vui lòng thử lại.",
      });
    } finally {
      setVocabSaving(false);
    }
  }, [
    currentPartTabLabel,
    flashcardSeedText,
    notify,
    vocabSelectedDeckId,
    vocabLookupExpression,
    vocabLookupResult,
  ]);

  const renderQuestionPanel = (question: MockExamQuestion) => {
    const prompt = getQuestionPrompt(question);
    const options = getVisibleOptions(question);
    const hideOptionCopy = shouldHideOptionText(question.part);
    const isAnswered = Boolean(answers[question.id]);
    const isFlagged = Boolean(reviewFlags[question.id]);
    const isStudy4P1 = question.part === "P1";
    const isStudy4P2 = question.part === "P2";
    const imageAssetForQuestion = isStudy4P1 ? getAssetByKind(question.assets, "image") : undefined;
    const audioAssetForQuestion = (isStudy4P1 || isStudy4P2) ? getAssetByKind(question.assets, "audio") : undefined;

    return (
      <div
        id={`question-${question.id}`}
        key={question.id}
        className={isStudy4P1 ? "space-y-3" : "flex items-start gap-4"}
      >
        {isStudy4P1 ? (
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => toggleReviewFlag(question.id)}
              aria-pressed={isFlagged}
              title={isFlagged ? "Bỏ đánh dấu review" : "Đánh dấu review"}
              className={`relative mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold transition ${
                isAnswered
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                  : isFlagged
                    ? "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
              }`}
            >
              {question.displayNumber}
            </button>
            <div className="min-w-0 flex-1">
              <div className="space-y-3">
                <Study4LikeP1Audio asset={audioAssetForQuestion} resolveAssetUrl={resolveAssetUrl} />
                <Study4LikeP1Image asset={imageAssetForQuestion} resolveAssetUrl={resolveAssetUrl} />
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => toggleReviewFlag(question.id)}
            aria-pressed={isFlagged}
            title={isFlagged ? "Bỏ đánh dấu review" : "Đánh dấu review"}
            className={`relative mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold transition ${
              isAnswered
                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                : isFlagged
                  ? "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
            }`}
          >
            {question.displayNumber}
          </button>
        )}

        <div className={isStudy4P1 ? "min-w-0 space-y-3 pl-[3.75rem]" : "min-w-0 flex-1 space-y-3"}>
          {isStudy4P2 ? (
            <Study4LikeP1Audio asset={audioAssetForQuestion} resolveAssetUrl={resolveAssetUrl} />
          ) : null}
          {prompt ? (
            <p className="text-[18px] font-medium leading-8 text-slate-900 dark:text-slate-100">{prompt}</p>
          ) : null}

          {options.length > 0 ? (
            <div className="space-y-2.5">
              {options.map((option) => {
                const selected = answers[question.id] === option.key;

                return (
                  <button
                    key={option.key}
                    onClick={() => handleAnswer(question.id, option.key)}
                    className={`flex w-full items-start gap-3 rounded-2xl px-1 py-1 text-left ${
                      selected ? "text-amber-800 dark:text-amber-200" : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <span
                      className={`mt-1 inline-flex h-5 w-5 shrink-0 rounded-full border ${
                        selected
                          ? "border-amber-500 bg-amber-500 shadow-[inset_0_0_0_3px_white]"
                          : "border-slate-400 bg-white dark:border-slate-500/70 dark:bg-transparent"
                      }`}
                    />
                    <span className="flex-1 text-[17px] leading-8">
                      <span className="font-medium">{option.key}.</span>
                      {!hideOptionCopy && (
                        <span className="ml-2">{getOptionText(question, option)}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-amber-700">
              Câu hỏi này chưa có lựa chọn trả lời hợp lệ.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSharedContext = () => {
    if (!hasSharedContext) return null;
    if (currentPart === "P1") return null;
    if (currentPart === "P3" || currentPart === "P4") return null;

    return (
      <div className="space-y-4">
        {showImage && (
          <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50 dark:border-slate-600/40 dark:bg-white/5">
            {resolvedMedia.imageUrl && !mediaError.image ? (
              <img
                src={resolvedMedia.imageUrl}
                alt="Question illustration"
                className="max-h-[420px] w-full object-contain"
                onError={() => setMediaError((prev) => ({ ...prev, image: true }))}
              />
            ) : (
              <div className="px-4 py-5 text-sm leading-7 text-amber-800">
                Hình ảnh của nhóm câu hỏi này chưa tải được. Reload lại trang sau
                khi media đã sẵn sàng.
              </div>
            )}
          </div>
        )}

        {showTranscript && (
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-600/40 dark:bg-white/5">
            <p className="whitespace-pre-line text-[17px] leading-8 text-slate-800 dark:text-slate-100">
              {transcript}
            </p>
          </div>
        )}

        {showStem && (
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-600/40 dark:bg-white/5">
            <p className="whitespace-pre-line text-[17px] leading-8 text-slate-800 dark:text-slate-100">
              {stem}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderReviewQuestion = (
    question: LearnerAttemptReviewQuestion,
    part?: string,
  ) => {
    const selectedOptionKey = question.selectedOptionKey?.trim().toUpperCase() ?? null;
    const correctOptionKey = question.correctOptionKey?.trim().toUpperCase();

    return (
      <div
        key={question.id}
        className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-600/40 dark:bg-transparent"
      >
        <div className="flex items-start gap-4">
          <span
            className={`mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
              question.isCorrect
                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
            }`}
          >
            {question.questionNo}
          </span>

          <div className="min-w-0 flex-1 space-y-3">
            {question.prompt?.trim() ? (
              <p className="text-[18px] font-medium leading-8 text-slate-900 dark:text-slate-100">
                {question.prompt}
              </p>
            ) : part === "P1" || part === "P2" ? null : (
              <p className="text-[18px] font-medium leading-8 text-slate-900 dark:text-slate-100">
                Câu hỏi {question.questionNo}
              </p>
            )}

            <div className="space-y-2.5">
              {[...(question.options ?? [])]
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map((option) => {
                  const optionKey = option.optionKey.trim().toUpperCase();
                  const isSelected = selectedOptionKey === optionKey;
                  const isCorrect = correctOptionKey === optionKey;

                  return (
                    <div
                      key={`${question.id}-${option.optionKey}`}
                      className={`rounded-2xl border px-4 py-3 ${
                        isCorrect
                          ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
                          : isSelected
                            ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
                            : "border-slate-200 bg-slate-50 dark:border-slate-600/40 dark:bg-white/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-start gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {optionKey}.
                        </span>
                        <span className="flex-1 text-slate-800 dark:text-slate-100">
                          {option.content}
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                            Bạn chọn
                          </span>
                        )}
                        {isCorrect && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                            Đáp án đúng
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {!question.isCorrect && correctOptionKey ? (
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Đáp án đúng: {correctOptionKey}
              </p>
            ) : null}

            {question.rationale?.trim() ? (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                <span className="font-semibold">Giải thích:</span>{" "}
                {question.rationale}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderReviewGroup = (item: LearnerAttemptReviewItem, part?: string) => {
    const group = item.questionGroup;
    const transcript = getAssetContentText(group.assets, "transcript");
    const passage =
      group.stem?.trim() ||
      getAssetContentText(group.assets, "passage") ||
      "";

    return (
      <div
        key={`${group.id}-${item.displayOrder}`}
        className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {group.title || group.code || `Nhóm ${item.displayOrder}`}
            </p>
            {group.code && group.title && (
              <p className="text-sm text-slate-500">{group.code}</p>
            )}
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {group.questions.length} câu
          </span>
        </div>

        {passage ? (
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="whitespace-pre-line text-[16px] leading-8 text-slate-800">
              {passage}
            </p>
          </div>
        ) : null}

        {transcript ? (
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Transcript
            </p>
            <p className="whitespace-pre-line text-[16px] leading-8 text-slate-800">
              {transcript}
            </p>
          </div>
        ) : null}

        {group.explanation?.trim() ? (
          <div className="rounded-[20px] border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              Giải thích
            </p>
            <p className="mt-2 whitespace-pre-line text-[16px] leading-8 text-slate-800">
              {group.explanation}
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          {group.questions.map((question) => renderReviewQuestion(question, part))}
        </div>
      </div>
    );
  };

  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-600">Đang tải đề thi...</p>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900">Có lỗi xảy ra</h2>
        <p className="text-center text-slate-600">{errorMsg}</p>
        <button
          onClick={() => router.push("/student/mock-test")}
          className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (pageState === "submitting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-600">Đang nộp bài và chấm điểm...</p>
      </div>
    );
  }

  if (pageState === "result" && result) {
    const reviewSections = resultPayload?.review?.sections ?? [];
    const currentAttemptId = resultPayload?.attempt.id;

    return (
      <div className="px-4 py-6 sm:px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto w-full max-w-screen-2xl space-y-6"
        >
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-600/40 dark:bg-transparent">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 text-left">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10">
                  <CheckCircle className="h-8 w-8 text-amber-600 dark:text-amber-200" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    Nộp bài thành công
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 sm:text-base">
                    Kết quả bài thi của bạn
                  </p>
                </div>
              </div>

              {currentAttemptId ? (
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  Attempt #{currentAttemptId.slice(0, 8)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              {result.totalScore !== undefined && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-white/5">
                  <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">{result.totalScore}</div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                    Tổng điểm
                  </div>
                </div>
              )}
              {result.listeningScore !== undefined && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-white/5">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {result.listeningScore}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                    Listening
                  </div>
                </div>
              )}
              {result.readingScore !== undefined && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-white/5">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {result.readingScore}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                    Reading
                  </div>
                </div>
              )}
              {result.accuracy !== undefined && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-white/5">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {result.accuracy}%
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                    Độ chính xác
                  </div>
                </div>
              )}
              {result.correctAnswers !== undefined &&
                result.totalQuestions !== undefined && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-white/5">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {result.correctAnswers}/{result.totalQuestions}
                    </div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                      Câu đúng
                    </div>
                  </div>
                )}
              {typeof resultPayload?.attempt.answeredCount === "number" && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-white/5">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {resultPayload.attempt.answeredCount}/{resultPayload.attempt.totalQuestions}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                    Câu đã trả lời
                  </div>
                </div>
              )}
            </div>

            {typeof resultPayload?.attempt.answeredCount === "number" &&
              resultPayload.attempt.answeredCount > 0 &&
              result.correctAnswers === 0 && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm leading-7 text-amber-900">
                  Hệ thống đã ghi nhận {resultPayload.attempt.answeredCount} câu trả lời,
                  nhưng kết quả hiện tại là 0 câu đúng. Bạn có thể kéo xuống phần đáp án
                  chi tiết để đối chiếu đáp án đúng của từng câu và kiểm tra lại dữ liệu
                  đề trong admin nếu kết quả bất thường.
                </div>
              )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.sessionStorage.setItem(`mock-test-force-new:${id}`, "1");
                  }
                  router.push(`/student/mock-test/${id}`);
                }}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
              >
                Làm lại đề này
              </button>
              <button
                onClick={() => router.push("/student/mock-test")}
                className="flex-1 rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-slate-900 transition hover:bg-amber-400"
              >
                Về trang thi thử
              </button>
              {currentAttemptId && (
                <button
                  onClick={() => void openReviewDetails()}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600/40 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  {isReviewLoading
                    ? "Đang tải đáp án chi tiết..."
                    : reviewExpanded
                      ? "Cuộn tới đáp án chi tiết"
                      : "Xem đáp án chi tiết"}
                </button>
              )}
            </div>
          </div>

          {attemptHistory.length > 0 && (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600/40 dark:bg-transparent">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Lịch sử các lần làm
                  </h3>
                  <p className="mt-2 text-slate-500 dark:text-slate-300">
                    Mở lại chi tiết từng lần làm của đề này.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {attemptHistory.length} lần làm
                </span>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-600/40">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-600/40">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-600 dark:bg-white/5 dark:text-slate-300">
                      <th className="px-4 py-3 font-semibold">Lần</th>
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold">Thời gian làm</th>
                      <th className="px-4 py-3 font-semibold">Kết quả</th>
                      <th className="px-4 py-3 font-semibold">Thời điểm</th>
                      <th className="px-4 py-3 font-semibold text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-600/30 dark:bg-transparent">
                    {attemptHistory.map((historyItem) => {
                      const isCurrentAttempt = historyItem.id === currentAttemptId;
                      const hasResult = historyItem.status === "graded";

                      return (
                        <tr
                          key={historyItem.id}
                          className={isCurrentAttempt ? "bg-amber-50/60 dark:bg-amber-500/10" : ""}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            Lần {historyItem.attemptNo}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-200">
                            {getAttemptStatusLabel(historyItem.status)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-200">
                            {formatAttemptDuration(historyItem.durationSec)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-200">
                            {hasResult
                              ? `${historyItem.totalScore} điểm • ${historyItem.correctCount}/${historyItem.totalQuestions} đúng`
                              : `${historyItem.answeredCount}/${historyItem.totalQuestions} câu đã chọn`}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-200">
                            {formatAttemptDate(
                              historyItem.gradedAt ??
                                historyItem.submittedAt ??
                                historyItem.startedAt,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isCurrentAttempt ? (
                              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                                Đang xem
                              </span>
                            ) : hasResult ? (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/student/mock-test/${id}?attemptId=${historyItem.id}&view=result`,
                                  )
                                }
                                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                              >
                                Xem chi tiết
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => router.push(`/student/mock-test/${id}`)}
                                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                              >
                                Tiếp tục làm
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {reviewExpanded && reviewSections.length > 0 && (
            <section id="review-section" className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">
                  Đáp án và lời giải
                </h3>
                <p className="mt-2 text-slate-500">
                  Xem lại đáp án bạn đã chọn, đáp án đúng và giải thích cho từng câu.
                </p>
              </div>

              {reviewSections
                .slice()
                .sort((left, right) => left.sectionOrder - right.sectionOrder)
                .map((section) => (
                  <div key={`${section.part}-${section.sectionOrder}`} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                        {PART_TAB_LABEL[section.part] ?? section.part}
                      </span>
                      {section.instructions && (
                        <p className="text-sm text-slate-500">{section.instructions}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {section.items
                        .slice()
                        .sort((left, right) => left.displayOrder - right.displayOrder)
                        .map((item) => renderReviewGroup(item, section.part))}
                    </div>
                  </div>
                ))}
            </section>
          )}
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Đề thi không có câu hỏi</h2>
        <button
          onClick={() => router.push("/student/mock-test")}
          className="rounded-2xl bg-amber-500 px-6 py-3 font-semibold text-slate-900 transition hover:bg-amber-400"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-transparent dark:text-slate-100">
      {highlightEnabled && vocabTriggerPos && !vocabLookupOpen ? (
        <div
          className="fixed z-[96] flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1 shadow-xl dark:border-slate-600/40 dark:bg-slate-900"
          style={{ top: vocabTriggerPos.top, left: vocabTriggerPos.left }}
        >
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            onClick={() => {
              setVocabLookupOpen(true);
              setVocabTriggerPos(null);
              void lookupVocabularyNow();
            }}
            title="Tra từ bằng AI"
            aria-label="Tra từ bằng AI"
          >
            <Languages className="h-4 w-4 text-blue-500" />
            Tra từ
          </button>
        </div>
      ) : null}
      {highlightEnabled && vocabLookupOpen && vocabPopupPos ? (
        <div
          ref={vocabPopupRef}
          className="fixed z-[140] w-[360px] max-h-[70vh] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600/40 dark:bg-slate-900"
          style={{ top: vocabPopupPos.top, left: vocabPopupPos.left }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500 dark:text-slate-300">Từ được chọn</p>
              <p className="truncate text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">
                {vocabLookupResult?.expression || vocabLookupExpression}
                {vocabLookupResult?.partOfSpeech ? (
                  <span className="ml-1 text-sm font-semibold italic text-slate-500 dark:text-slate-300">
                    ({vocabLookupResult.partOfSpeech})
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setVocabLookupOpen(false);
                setVocabTriggerPos(null);
                setVocabDeckChoices([]);
                setVocabSelectedDeckId("");
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600/40 dark:text-slate-200 dark:hover:bg-white/5"
              aria-label="Đóng tra từ"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {vocabLookupLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI đang phân tích từ vựng...
            </div>
          ) : vocabLookupError ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {vocabLookupError}
            </p>
          ) : (
            <div className="mt-3 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
              {vocabLookupResult?.meaningVi ? (
                <p className="text-xl font-semibold leading-8 text-amber-500 dark:text-amber-300">{vocabLookupResult.meaningVi}</p>
              ) : null}

              {Array.isArray(vocabLookupResult?.phrasalVerbs) && vocabLookupResult.phrasalVerbs.length ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Phrasal verbs</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{vocabLookupResult.phrasalVerbs.slice(0, 3).join(" • ")}</p>
                </div>
              ) : null}

              {Array.isArray(vocabLookupResult?.synonyms) && vocabLookupResult.synonyms.length ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Đồng nghĩa</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{vocabLookupResult.synonyms.slice(0, 6).join(", ")}</p>
                </div>
              ) : null}

              {Array.isArray(vocabLookupResult?.antonyms) && vocabLookupResult.antonyms.length ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Trái nghĩa</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{vocabLookupResult.antonyms.slice(0, 6).join(", ")}</p>
                </div>
              ) : null}

              {Array.isArray(vocabLookupResult?.examples) && vocabLookupResult.examples.length ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Ví dụ</p>
                  <p className="mt-1 text-sm italic text-slate-700 dark:text-slate-200">
                    {vocabLookupResult.examples[0]?.en}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{vocabLookupResult.examples[0]?.vi}</p>
                </div>
              ) : null}
            </div>
          )}

          {vocabDeckChoices.length > 1 ? (
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Thêm vào bộ
              </label>
              <select
                value={vocabSelectedDeckId}
                onChange={(e) => setVocabSelectedDeckId(e.target.value)}
                className="input-modern w-full"
              >
                {vocabDeckChoices.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void saveSelectionToFlashcard()}
              disabled={vocabSaving || vocabLookupLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {vocabSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              flashcard
            </button>
          </div>
        </div>
      ) : null}
      <CreateFlashcardFromSelectionModal
        open={flashcardCreateOpen}
        seedText={flashcardSeedText}
        onClose={() => setFlashcardCreateOpen(false)}
      />
      {proctoringNotices.length ? (
        <div className="fixed right-4 top-20 z-[150] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2">
          {proctoringNotices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${
                notice.severity >= 4
                  ? "border-red-200 bg-red-50/95 text-red-900 dark:border-red-500/30 dark:bg-red-950/90 dark:text-red-100"
                  : "border-amber-200 bg-amber-50/95 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/90 dark:text-amber-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">{notice.action}</p>
                    <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold dark:bg-white/10">
                      Mức {notice.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium leading-5">{notice.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setProctoringNotices((prev) => prev.filter((item) => item.id !== notice.id))}
                  className="rounded-lg p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Đóng thông báo vi phạm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-10">
        {/* Study4-like top row: title + exit */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
              {attempt?.templateName ?? "TOEIC Practice"}
            </h1>
          </div>
          <button
            type="button"
            onClick={leaveExam}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
          >
            Thoát
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            {/* Audio + part tabs (Study4-like) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600/40 dark:bg-transparent">
              {currentPart !== "P1" && currentPart !== "P2" && !isStudy4P3P4 && ((resolvedMedia.audioUrl && !mediaError.audio) || hasAudioAsset) ? (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Headphones className="h-4 w-4" />
                    Audio
                  </div>

                  {resolvedMedia.audioUrl && !mediaError.audio ? (
                    <audio
                      controls
                      className="w-full"
                      onError={() => setMediaError((prev) => ({ ...prev, audio: true }))}
                    >
                      <source src={resolvedMedia.audioUrl} />
                    </audio>
                  ) : (
                    <div className="text-sm text-amber-800">
                      Audio của nhóm câu hỏi này chưa tải được.
                    </div>
                  )}
                </div>
              ) : null}

              {isStudy4P3P4 ? (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Headphones className="h-4 w-4" />
                    Audio (nhóm)
                  </div>

                  {groupedAudioAsset ? (
                    <Study4LikeP1Audio asset={groupedAudioAsset} resolveAssetUrl={resolveAssetUrl} />
                  ) : (
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      Nhóm câu hỏi này chưa có audio.
                    </div>
                  )}
                </div>
              ) : null}

              <div
                className={`flex flex-wrap gap-3 ${
                  (((resolvedMedia.audioUrl && !mediaError.audio) ||
                    hasAudioAsset ||
                    Boolean(groupedAudioAsset)) &&
                    !isLongListPart)
                    ? "mt-4 border-t border-slate-100 pt-4 dark:border-slate-600/30"
                    : ""
                }`}
              >
                {sectionsWithQuestions.map((section) => {
                  const isActive = section.id === currentSection?.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => jumpToSection(section.id)}
                      className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-transparent ${
                        isActive
                          ? "bg-amber-500 text-slate-900"
                          : "bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-900 dark:bg-transparent dark:text-slate-200 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
                      }`}
                    >
                      {PART_TAB_LABEL[section.part ?? ""] ?? section.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 xl:hidden dark:border-slate-600/40 dark:bg-transparent">
              <div className="flex items-center justify-between gap-3">
                {timeLeft !== null && (
                  <div
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-sm font-bold ${
                      timeLeft < 300
                        ? "bg-red-50 text-red-600 dark:bg-rose-500/10 dark:text-rose-200"
                        : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    {formatTime(timeLeft)}
                  </div>
                )}

                <button
                  onClick={() => handleSubmit(false)}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-900 dark:hover:bg-amber-400"
                >
                  <Send className="h-4 w-4" />
                  Nộp bài
                </button>
              </div>

              {proctoringActive && !isDesktopExamLayout && user?.id && attempt?.id ? (
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-600/30">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                      Giám sát camera
                    </p>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                      Đang ghi hình
                    </span>
                  </div>
                  <ProctoringCamera
                    userId={user.id}
                    examId={attempt.id}
                    examAttemptId={attempt.id}
                    faceVerificationExamTemplateId={attempt.examTemplateId}
                    enableFaceVerification={attempt.templateMode === "official_exam"}
                    onViolation={handleProctoringViolation}
                    onBlocked={handleProctoringBlocked}
                  />
                </div>
              ) : null}
            </div>

            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-600/40 dark:bg-transparent"
            >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    {currentPartTabLabel}
                  </span>

                  <label className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={highlightEnabled}
                      onClick={() => setHighlightEnabled((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        highlightEnabled ? "bg-amber-500" : "bg-slate-300 dark:bg-white/15"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          highlightEnabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-sm italic text-slate-700 dark:text-slate-200">
                      Highlight nội dung
                    </span>
                    <InfoTip text="Bôi đen text để highlight nội dung. Bạn có thể thay đổi màu sắc hoặc thêm ghi chú." />
                  </label>
                </div>
                <span className="text-sm font-medium text-slate-500">
                  Câu {displayedQuestions[0]?.displayNumber}
                  {displayedQuestions.length > 1
                    ? `-${displayedQuestions[displayedQuestions.length - 1]?.displayNumber}`
                    : ""}
                </span>
              </div>

              {useReadingSplitLayout ? (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-start">
                  <div>{renderSharedContext()}</div>

                  <div className="space-y-8">
                    {displayedQuestions.map((question, index) => (
                      <div key={question.id}>
                        {renderQuestionPanel(question)}
                        {index < displayedQuestions.length - 1 && (
                          <div className="mt-6 border-t border-slate-200" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {renderSharedContext()}

                  <div className="space-y-8">
                    {displayedQuestions.map((question, index) => (
                      <div key={question.id}>
                        {renderQuestionPanel(question)}
                        {index < displayedQuestions.length - 1 && (
                          <div className="mt-6 border-t border-slate-200" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {!isLongListPart && (
              <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => previousIndex >= 0 && setCurrentIdx(previousIndex)}
                disabled={previousIndex < 0}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
                {displayedQuestions.length > 1 ? "Nhóm trước" : "Câu trước"}
              </button>
              <button
                onClick={() => nextIndex >= 0 && setCurrentIdx(nextIndex)}
                disabled={nextIndex < 0}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-500 dark:text-slate-900 dark:hover:bg-amber-400"
              >
                {displayedQuestions.length > 1 ? "Nhóm tiếp" : "Câu tiếp"}
                <ChevronRight className="h-4 w-4" />
              </button>
              </div>
            )}
          </div>

          <aside className="hidden w-[300px] shrink-0 xl:block">
            <div className="sticky top-20 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600/40 dark:bg-transparent">
                {timeLeft !== null && (
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Thời gian còn lại</p>
                    <p
                      className={`mt-1 font-mono text-3xl font-bold leading-none ${
                        timeLeft < 300 ? "text-red-600 dark:text-rose-200" : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {formatTime(timeLeft)}
                    </p>
                  </div>
                )}

                {proctoringActive && isDesktopExamLayout && user?.id && attempt?.id ? (
                  <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-600/30">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                        Giám sát camera
                      </p>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                        Đang ghi hình
                      </span>
                    </div>
                    <ProctoringCamera
                      userId={user.id}
                      examId={attempt.id}
                      examAttemptId={attempt.id}
                      faceVerificationExamTemplateId={attempt.examTemplateId}
                      enableFaceVerification={attempt.templateMode === "official_exam"}
                      onViolation={handleProctoringViolation}
                      onBlocked={handleProctoringBlocked}
                    />
                  </div>
                ) : null}

                <button
                  onClick={() => handleSubmit(false)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-900 dark:hover:bg-amber-400"
                >
                  <Send className="h-4 w-4" />
                  Nộp bài
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!attempt?.id) return;
                    try {
                      await saveAnswers(answersRef.current, { suppressErrors: false });
                    } catch (e: any) {
                      if (await recoverClosedAttemptResult(e)) return;
                      setErrorMsg(getRequestErrorMessage(e, "Không thể lưu bài làm"));
                      setPageState("error");
                    }
                  }}
                  className="mt-3 w-full text-left text-[13px] font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-200 dark:hover:text-rose-100"
                >
                  Khôi phục/lưu bài làm &gt;
                </button>

                <p className="mt-3 text-[13px] italic font-semibold text-amber-600 dark:text-amber-200">
                  Chú ý: bạn có thể click vào số thứ tự câu hỏi trong bài để đánh dấu review
                </p>

                <p className="mt-4 text-sm text-slate-500">
                  {answeredCount}/{totalCount} câu đã chọn
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600/40 dark:bg-transparent">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                  Bảng câu hỏi
                </p>

                <div className="space-y-6">
                  {sectionsWithQuestions.map((section) => (
                    <div key={section.id}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {PART_TAB_LABEL[section.part ?? ""] ?? section.name}
                        </span>
                        <span className="text-sm text-slate-400">
                          {section.questions.length} câu
                        </span>
                      </div>

                      <div className="grid grid-cols-6 gap-1.5">
                        {section.questions.map((question) => {
                          const answered = Boolean(answers[question.id]);
                          const flagged = Boolean(reviewFlags[question.id]);

                          return (
                            <button
                              key={question.id}
                              onClick={() => {
                                toggleReviewFlag(question.id);
                                jumpToQuestion(question.id);
                              }}
                              aria-pressed={flagged}
                              className={`relative h-8 rounded border text-[11px] font-semibold transition ${
                                answered
                                  ? "border-slate-900 bg-slate-900 text-white dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                                  : flagged
                                    ? "border-rose-700 bg-rose-600 text-white hover:bg-rose-700 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                              }`}
                            >
                              {question.displayNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

