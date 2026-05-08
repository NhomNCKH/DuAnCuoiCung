"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  ChevronLeft,
  Languages,
  Layers3,
  Loader2,
  PenLine,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";

type WritingResult = {
  overallScore?: number;
  criteria?: {
    grammar?: number;
    vocabulary?: number;
    coherence?: number;
    taskFulfillment?: number;
  };
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  evidence?: string[];
  actionPlan?: string[];
  improvements?: string[];
  correctedVersion?: string;
};

type WritingTask = {
  id: string;
  code?: string;
  title?: string;
  prompt?: string;
  taskType?: string;
  minWords?: number | null;
  maxWords?: number | null;
  tips?: string[];
};

type WritingSetItem = {
  id: string;
  sortOrder?: number;
  task?: WritingTask;
};

type WritingSetDetail = {
  id: string;
  code?: string;
  title?: string;
  totalQuestions?: number;
  timeLimitSec?: number | null;
  items?: WritingSetItem[];
};

type ItemFeedback = {
  loading: boolean;
  rawText: string | null;
  parsed: WritingResult | null;
};

type TranslationExercise = {
  title?: string;
  sourceText?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  glossary?: Array<{ source?: string; target?: string; note?: string }>;
};

type TranslationSuggestion = {
  vocabularyHints?: Array<{ word?: string; meaning?: string }>;
  structureHints?: string[];
};

type TranslationReview = {
  overallScore?: number;
  summary?: string;
  grammarHint?: string;
  vocabularyHint?: string;
  suggestedPattern?: string;
  improvedTranslation?: string;
};

function extractList(raw: any): any[] {
  const data = raw?.data?.data ?? raw?.data ?? raw;
  return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
}

function extractData(raw: any): any {
  return raw?.data?.data ?? raw?.data ?? raw;
}

function parseAiJson(text: string): WritingResult | null {
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

const WRITING_PART_LABEL: Record<string, string> = {
  part1_sentence: "Part 1 - Write a sentence",
  part2_email: "Part 2 - Respond to an email",
  part3_essay: "Part 3 - Opinion essay",
};

const TRANSLATION_DIFFICULTIES = [
  { value: "de", label: "Dễ" },
  { value: "kha_de", label: "Khá dễ" },
  { value: "trung_binh", label: "Trung bình" },
  { value: "kho", label: "Khó" },
  { value: "rat_kho", label: "Rất khó" },
];

const TRANSLATION_PURPOSES = [
  { value: "giao_tiep", label: "Giao tiếp" },
  { value: "toeic", label: "TOEIC" },
  { value: "cong_viec", label: "Công việc" },
];

const TRANSLATION_TOPICS: Record<string, string[]> = {
  de: [
    "Chào hỏi và làm quen",
    "Gia đình và bạn bè",
    "Sở thích cá nhân",
    "Mua sắm cơ bản",
    "Thời tiết hôm nay",
    "Lịch sinh hoạt hằng ngày",
    "Món ăn yêu thích",
    "Đường đi trong thành phố",
    "Ngày cuối tuần của tôi",
    "Giới thiệu bản thân",
  ],
  kha_de: [
    "Đặt lịch hẹn",
    "Du lịch ngắn ngày",
    "Ăn uống và nhà hàng",
    "Mô tả nơi ở",
    "Tập thể dục và sức khỏe",
    "Trải nghiệm mua sắm online",
    "Kế hoạch học tiếng Anh",
    "Thói quen tiết kiệm tiền",
    "Sử dụng phương tiện công cộng",
    "Một ngày làm việc bận rộn",
  ],
  trung_binh: [
    "Phỏng vấn xin việc",
    "Lập kế hoạch công việc",
    "Hợp tác nhóm",
    "Nghi thức email",
    "Xử lý khiếu nại khách hàng",
    "Đề xuất ý tưởng dự án",
    "Cuộc họp định kỳ",
    "Báo cáo tiến độ công việc",
    "Kỹ năng quản lý thời gian",
    "Mục tiêu nghề nghiệp",
  ],
  kho: [
    "Quản lý dự án",
    "Đánh giá hiệu suất",
    "Đàm phán khách hàng",
    "Xử lý vấn đề công việc",
    "Chiến lược marketing số",
    "Tối ưu quy trình vận hành",
    "Quản lý xung đột nội bộ",
    "Phân tích dữ liệu kinh doanh",
    "Định hướng phát triển sản phẩm",
    "Lãnh đạo nhóm đa phòng ban",
  ],  
  rat_kho: [
    "Định hướng chiến lược",
    "Quản trị thay đổi",
    "Thuyết trình doanh nghiệp",
    "Đánh giá rủi ro",
    "Chuyển đổi số trong tổ chức",
    "Quản trị khủng hoảng truyền thông",
    "Chiến lược mở rộng thị trường quốc tế",
    "Đổi mới sáng tạo trong doanh nghiệp",
    "Phân tích xu hướng kinh tế vĩ mô",
    "Ra quyết định trong môi trường bất định",
  ],
};

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

function splitIntoSentences(text: string): string[] {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const pieces = normalized
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return pieces.length ? pieces : [normalized];
}

export default function WritingPage() {
  const { notify } = useToast();

  const [setsLoading, setSetsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sets, setSets] = useState<WritingSetDetail[]>([]);
  const [viewMode, setViewMode] = useState<"sets" | "practice">("sets");
  const [setKeyword, setSetKeyword] = useState("");
  const [setId, setSetId] = useState("");
  const [setDetail, setSetDetail] = useState<WritingSetDetail | null>(null);
  const [itemId, setItemId] = useState("");
  const [timerSetId, setTimerSetId] = useState("");
  const [examRemainingSec, setExamRemainingSec] = useState<number | null>(null);
  const [practiceTab, setPracticeTab] = useState<"writing" | "translation">("writing");

  const [translationViewMode, setTranslationViewMode] = useState<"setup" | "practice">("setup");
  const [translationDifficulty, setTranslationDifficulty] = useState("kha_de");
  const [translationPurpose, setTranslationPurpose] = useState("giao_tiep");
  const [translationBuildMode, setTranslationBuildMode] = useState<"ai_topic" | "manual">("ai_topic");
  const [translationTopic, setTranslationTopic] = useState("Chào hỏi và làm quen");
  const [translationCustomTopic, setTranslationCustomTopic] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationExercise, setTranslationExercise] = useState<TranslationExercise | null>(null);
  const [translationSentenceIndex, setTranslationSentenceIndex] = useState(0);
  const [translationAnswerBySentence, setTranslationAnswerBySentence] = useState<Record<number, string>>({});
  const [translationSuggesting, setTranslationSuggesting] = useState(false);
  const [translationReviewing, setTranslationReviewing] = useState(false);
  const [translationSuggestionBySentence, setTranslationSuggestionBySentence] = useState<Record<number, TranslationSuggestion | null>>({});
  const [translationReviewBySentence, setTranslationReviewBySentence] = useState<Record<number, TranslationReview | null>>({});
  const [translationAiPanel, setTranslationAiPanel] = useState<"guide" | "suggestion" | "review">("guide");
  const [translationElapsedSec, setTranslationElapsedSec] = useState(0);

  const [essayByItem, setEssayByItem] = useState<Record<string, string>>({});
  const [feedbackByItem, setFeedbackByItem] = useState<Record<string, ItemFeedback>>({});
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
    const groups: Record<string, WritingSetItem[]> = {};
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

  const activeEssay = itemId ? (essayByItem[itemId] ?? "") : "";
  const activeFeedback = itemId ? feedbackByItem[itemId] : undefined;

  const wordCount = useMemo(() => {
    const v = activeEssay.trim();
    if (!v) return 0;
    return v.split(/\s+/).filter(Boolean).length;
  }, [activeEssay]);

  const minWords = Number(activeTask?.minWords ?? 0) || 0;
  const maxWords = Number(activeTask?.maxWords ?? 0) || 0;

  const doneCount = useMemo(
    () =>
      sortedItems.filter((it) => {
        const key = it.id;
        return Boolean(feedbackByItem[key]?.parsed || essayByItem[key]?.trim());
      }).length,
    [sortedItems, feedbackByItem, essayByItem],
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
  const translationTopicsByDifficulty = useMemo(
    () => TRANSLATION_TOPICS[translationDifficulty] ?? TRANSLATION_TOPICS.kha_de,
    [translationDifficulty],
  );
  const translationSentences = useMemo(
    () => splitIntoSentences(translationExercise?.sourceText ?? ""),
    [translationExercise?.sourceText],
  );
  const activeTranslationSentence = translationSentences[translationSentenceIndex] ?? "";
  const activeTranslationAnswer = translationAnswerBySentence[translationSentenceIndex] ?? "";
  const activeTranslationSuggestion = translationSuggestionBySentence[translationSentenceIndex] ?? null;
  const activeTranslationReview = translationReviewBySentence[translationSentenceIndex] ?? null;
  const translatedSentenceCount = useMemo(
    () => Object.values(translationAnswerBySentence).filter((x) => String(x || "").trim().length > 0).length,
    [translationAnswerBySentence],
  );

  async function loadSets() {
    setSetsLoading(true);
    try {
      const res = await apiClient.learner.skillTasks.listWritingSets({ page: 1, limit: 50 });
      const list = extractList(res) as WritingSetDetail[];
      setSets(list);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được bộ đề Writing", message: e?.message });
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
      const res = await apiClient.learner.skillTasks.getWritingSet(targetSetId);
      const detail = extractData(res) as WritingSetDetail;
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

  useEffect(() => {
    const list = TRANSLATION_TOPICS[translationDifficulty] ?? [];
    if (list.length === 0) return;
    if (!list.includes(translationTopic)) {
      setTranslationTopic(list[0]);
    }
  }, [translationDifficulty, translationTopic]);

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
    notify({
      variant: "warning",
      title: "Hết thời gian làm bài",
      message: "Bạn đã hết thời gian. Có thể xem lại nội dung đã làm và kết quả hiện có.",
    });
  }, [isTimeUp, notify]);

  useEffect(() => {
    if (practiceTab !== "translation" || translationViewMode !== "practice") return;
    const timer = window.setInterval(() => {
      setTranslationElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [practiceTab, translationViewMode]);

  useEffect(() => {
    if (translationSentences.length === 0) {
      setTranslationSentenceIndex(0);
      return;
    }
    if (translationSentenceIndex >= translationSentences.length) {
      setTranslationSentenceIndex(translationSentences.length - 1);
    }
  }, [translationSentences, translationSentenceIndex]);

  function startPractice(targetSetId: string) {
    if (!targetSetId) return;
    setTimerSetId("");
    setExamRemainingSec(null);
    timeUpNotifiedRef.current = false;
    setSetId(targetSetId);
    setViewMode("practice");
  }

  function setEssayValue(value: string) {
    if (!itemId) return;
    setEssayByItem((prev) => ({ ...prev, [itemId]: value }));
  }

  async function startTranslationPractice() {
    setTranslationLoading(true);
    setTranslationSuggestionBySentence({});
    setTranslationReviewBySentence({});
    setTranslationAiPanel("guide");
    setTranslationAnswerBySentence({});
    setTranslationSentenceIndex(0);
    try {
      const selectedTopic = translationBuildMode === "manual" ? translationCustomTopic.trim() : translationTopic;
      const res = await apiClient.learner.ai.generateTranslationExercise({
        sourceLanguage: "vi",
        targetLanguage: "en",
        difficulty: translationDifficulty,
        purpose: translationPurpose,
        topic: selectedTopic,
        customTopic: translationBuildMode === "manual" ? selectedTopic : undefined,
        exerciseType: "paragraph",
      });
      const result = ((res as any)?.data?.result ?? (res as any)?.result ?? null) as TranslationExercise | null;
      const fallbackText = String((res as any)?.data?.text ?? (res as any)?.text ?? "").trim();
      setTranslationExercise(
        result ?? {
          title: selectedTopic || "Bài luyện dịch mới",
          sourceText: fallbackText || "Không tạo được bài dịch, vui lòng thử lại.",
          sourceLanguage: "vi",
          targetLanguage: "en",
          glossary: [],
        },
      );
      setTranslationElapsedSec(0);
      setTranslationViewMode("practice");
      notify({ variant: "success", title: "Đã tạo bài luyện dịch", message: "Bạn có thể bắt đầu dịch ngay." });
    } catch (e: any) {
      notify({ variant: "error", title: "Không tạo được bài luyện dịch", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setTranslationLoading(false);
    }
  }

  async function suggestTranslation() {
    if (!activeTranslationSentence.trim()) return;
    setTranslationSuggesting(true);
    try {
      const res = await apiClient.learner.ai.suggestTranslation({
        sourceText: activeTranslationSentence,
        targetLanguage: "en",
      });
      const result = ((res as any)?.data?.result ?? (res as any)?.result ?? null) as TranslationSuggestion | null;
      setTranslationSuggestionBySentence((prev) => ({ ...prev, [translationSentenceIndex]: result }));
      setTranslationAiPanel("suggestion");
    } catch (e: any) {
      notify({ variant: "error", title: "Không lấy được gợi ý", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setTranslationSuggesting(false);
    }
  }

  async function reviewTranslation() {
    if (!activeTranslationSentence.trim()) return;
    if (!activeTranslationAnswer.trim()) {
      notify({ variant: "warning", title: "Chưa có bài dịch", message: "Hãy nhập bản dịch trước khi kiểm tra." });
      return;
    }
    setTranslationReviewing(true);
    try {
      const res = await apiClient.learner.ai.reviewTranslation({
        sourceText: activeTranslationSentence,
        translation: activeTranslationAnswer,
        targetLanguage: "en",
      });
      const result = ((res as any)?.data?.result ?? (res as any)?.result ?? null) as TranslationReview | null;
      setTranslationReviewBySentence((prev) => ({ ...prev, [translationSentenceIndex]: result }));
      setTranslationAiPanel("review");
    } catch (e: any) {
      notify({ variant: "error", title: "Không kiểm tra được bài dịch", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setTranslationReviewing(false);
    }
  }

  async function grade() {
    if (!itemId || !activeTask?.prompt) return;
    const essay = (essayByItem[itemId] ?? "").trim();
    if (!essay) {
      notify({ variant: "warning", title: "Chưa có bài viết", message: "Hãy nhập nội dung trước khi chấm." });
      return;
    }

    setFeedbackByItem((prev) => ({
      ...prev,
      [itemId]: { loading: true, rawText: null, parsed: null },
    }));
    try {
      const res = await apiClient.learner.ai.gradeWriting({
        prompt: activeTask.prompt ?? "",
        essay,
        language: "vi",
        taskType: activeTask.taskType,
      });
      const text = (res as any)?.data?.text ?? (res as any)?.text ?? "";
      const parsedFromPayload = ((res as any)?.data?.result ?? (res as any)?.result ?? null) as WritingResult | null;
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

  function goBackFromHeader() {
    if (practiceTab === "translation") {
      if (translationViewMode === "practice") {
        setTranslationViewMode("setup");
        return;
      }
      window.history.back();
      return;
    }
    if (viewMode === "practice") {
      setViewMode("sets");
      return;
    }
    window.history.back();
  }

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-10">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 text-white shadow-sm">
                {practiceTab === "writing" ? <PenLine className="h-5 w-5" /> : <Languages className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <h1 className="heading-lg">{practiceTab === "writing" ? "Luyện viết" : "Luyện dịch"}</h1>
                {practiceTab === "translation" ? (
                  <button
                    type="button"
                    onClick={goBackFromHeader}
                    className="btn-secondary mt-1 inline-flex items-center gap-1 px-2.5 py-1 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Quay lại
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700/60 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => setPracticeTab("writing")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  practiceTab === "writing"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/50"
                }`}
              >
                Luyện viết
              </button>
              <button
                type="button"
                onClick={() => setPracticeTab("translation")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  practiceTab === "translation"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/50"
                }`}
              >
                Luyện dịch
              </button>
            </div>
            <span className="chip inline-flex items-center gap-1.5">
              <BookOpenCheck className="h-4 w-4" />
              {practiceTab === "writing"
                ? viewMode === "sets"
                  ? `${filteredSets.length} bộ đề`
                  : `${doneCount}/${sortedItems.length || 0} câu`
                : translationViewMode === "setup"
                  ? "Sẵn sàng tạo bài"
                  : `${translatedSentenceCount}/${translationSentences.length || 0} câu`}
            </span>
            <span className="chip">
              {practiceTab === "writing"
                ? viewMode === "sets"
                  ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Layers3 className="h-4 w-4" />
                      {setsTotalQuestions} câu hỏi
                    </span>
                  )
                  : examRemainingSec !== null
                    ? `Còn lại ${formatCountdown(examRemainingSec)}`
                    : minWords > 0 && maxWords > 0
                      ? `Mục tiêu: ${minWords}-${maxWords} từ`
                      : "Không giới hạn từ"
                : translationViewMode === "setup"
                  ? "AI tạo bài theo chủ đề"
                  : `Thời gian ${formatCountdown(translationElapsedSec)}`}
            </span>
          </div>
        </div>
      </motion.div>

      {practiceTab === "writing" && viewMode === "sets" ? (
        <section className="surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Chọn bộ đề Writing đã xuất bản</p>
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
            <p className="text-sm text-muted">Hiện chưa có bộ đề Writing nào ở trạng thái published.</p>
          ) : filteredSets.length === 0 ? (
            <p className="text-sm text-muted">Không tìm thấy bộ đề phù hợp từ khóa.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSets.map((s) => (
                <div key={s.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-950/30">
                  <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-rose-500 to-pink-500" />
                  <div className="p-2.5">
                  <p className="truncate font-mono text-xs text-muted">{s.code || "WRITING SET"}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{s.title || "Bộ đề Writing"}</p>
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

      {practiceTab === "writing" && viewMode === "practice" ? (
      <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px,1fr]">
        <aside className="surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{setDetail?.title || "Bộ đề TOEIC Writing"}</p>
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
                      {WRITING_PART_LABEL[partKey] || partKey.replaceAll("_", " ")} ({items.length})
                    </p>
                    <div className="space-y-2">
                      {items.map((it) => {
                        const active = it.id === itemId;
                        const done = Boolean((essayByItem[it.id] ?? "").trim() || feedbackByItem[it.id]?.parsed);
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => setItemId(it.id)}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                              active
                                ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200 dark:hover:bg-slate-900/30"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-semibold">
                                Câu {itemOrderMap[it.id] || "-"}: {it.task?.title || it.task?.taskType || "Writing task"}
                              </span>
                              {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                            </div>
                            <p className="mt-1 truncate text-xs opacity-80">{it.task?.code || it.task?.taskType || "TOEIC Writing"}</p>
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Đề bài</p>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
              {activeTask?.prompt || "Chọn câu hỏi để bắt đầu."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bài làm</p>
                <span
                  className={`text-xs ${
                    wordCount === 0
                      ? "text-muted"
                      : minWords > 0 && wordCount < minWords
                        ? "text-amber-600 dark:text-amber-300"
                        : maxWords > 0 && wordCount > maxWords
                          ? "text-red-600 dark:text-red-300"
                          : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {wordCount} từ
                </span>
              </div>
              <textarea
                value={activeEssay}
                onChange={(e) => setEssayValue(e.target.value)}
                placeholder="Viết câu trả lời của bạn ở đây..."
                rows={12}
                disabled={isTimeUp}
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-orange-500/30 focus:ring-2 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-100"
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
                <p className="mt-2 text-sm text-muted">Chấm xong sẽ hiển thị điểm + feedback của câu hiện tại.</p>
              ) : null}

              {activeFeedback?.parsed ? (
                <div className="mt-3 space-y-3">
                  <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Overall: {activeFeedback.parsed.overallScore ?? "—"}/200
                  </span>
                  {activeFeedback.parsed.summary ? (
                    <p className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                      {activeFeedback.parsed.summary}
                    </p>
                  ) : null}
                  {activeFeedback.parsed.criteria ? (
                    <div className="space-y-2">
                      {[
                        { key: "grammar", label: "Ngữ pháp", value: activeFeedback.parsed.criteria.grammar },
                        { key: "vocabulary", label: "Từ vựng", value: activeFeedback.parsed.criteria.vocabulary },
                        { key: "coherence", label: "Mạch lạc", value: activeFeedback.parsed.criteria.coherence },
                        { key: "taskFulfillment", label: "Bám đề", value: activeFeedback.parsed.criteria.taskFulfillment },
                      ].map((row) => (
                        <div key={row.key}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                            <span>{row.label}</span>
                            <span>{row.value ?? "—"}/200</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${toPercent(row.value)}%` }} />
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
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">Bằng chứng từ bài viết</p>
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
                  {activeFeedback.parsed.correctedVersion ? (
                    <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-100">
                      {activeFeedback.parsed.correctedVersion}
                    </div>
                  ) : null}
                </div>
              ) : activeFeedback?.rawText ? (
                <pre className="mt-3 max-h-[360px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-100">
                  {activeFeedback.rawText}
                </pre>
              ) : null}
            </div>
          </div>
        </section>
      </div>
      </>
      ) : null}

      {practiceTab === "translation" && translationViewMode === "setup" ? (
        <section className="surface p-4 sm:p-5">
          <h2 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-indigo-700 dark:text-indigo-300">
            ✨ Tạo bài luyện dịch mới
          </h2>

          <div className="mx-auto mt-4 grid w-full max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">Ngôn ngữ</p>
              <select className="input-modern w-full" defaultValue="en">
                <option value="en">Tiếng Anh</option>
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">Độ khó</p>
              <select
                value={translationDifficulty}
                onChange={(e) => setTranslationDifficulty(e.target.value)}
                className="input-modern w-full"
              >
                {TRANSLATION_DIFFICULTIES.map((it) => (
                  <option key={it.value} value={it.value}>
                    {it.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mx-auto mt-4 w-full max-w-4xl">
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Mục đích học</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TRANSLATION_PURPOSES.map((it) => {
                const active = translationPurpose === it.value;
                return (
                  <button
                    key={it.value}
                    type="button"
                    onClick={() => setTranslationPurpose(it.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200"
                    }`}
                  >
                    {it.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mx-auto mt-4 w-full max-w-4xl">
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Cách tạo bài</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTranslationBuildMode("ai_topic")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  translationBuildMode === "ai_topic"
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200"
                }`}
              >
                🤖 AI tạo chủ đề
              </button>
              <button
                type="button"
                onClick={() => setTranslationBuildMode("manual")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  translationBuildMode === "manual"
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200"
                }`}
              >
                ✍️ Tự nhập chủ đề
              </button>
            </div>
          </div>

          <div className="mx-auto mt-4 w-full max-w-4xl space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Chủ đề</p>
            <select
              value={translationTopic}
              onChange={(e) => setTranslationTopic(e.target.value)}
              className="input-modern w-full"
              disabled={translationBuildMode === "manual"}
            >
              {translationTopicsByDifficulty.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
            <input
              value={translationCustomTopic}
              onChange={(e) => setTranslationCustomTopic(e.target.value)}
              placeholder="Hoặc nhập chủ đề..."
              disabled={translationBuildMode !== "manual"}
              className="input-modern w-full"
            />
          </div>

          <div className="mx-auto mt-4 w-full max-w-4xl">
            <button
              type="button"
              onClick={() => void startTranslationPractice()}
              disabled={translationLoading || (translationBuildMode === "manual" && !translationCustomTopic.trim())}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-3 font-semibold text-white hover:from-rose-500 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {translationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Bắt đầu luyện dịch
            </button>
          </div>
        </section>
      ) : null}

      {practiceTab === "translation" && translationViewMode === "practice" ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="surface p-3 sm:p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-700">Ngôn ngữ luyện: Tiếng Anh</span>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">Chủ đề: {translationExercise?.title || translationTopic}</span>
              <span className="rounded-md bg-violet-50 px-2 py-1 text-violet-700">
                Độ khó: {TRANSLATION_DIFFICULTIES.find((x) => x.value === translationDifficulty)?.label || "Khá dễ"}
              </span>
            </div>

            <div className="mb-2 flex gap-1">
              {translationSentences.map((_, idx) => {
                const active = idx === translationSentenceIndex;
                const done = Boolean((translationAnswerBySentence[idx] ?? "").trim());
                return (
                  <button
                    key={`progress-${idx}`}
                    type="button"
                    onClick={() => setTranslationSentenceIndex(idx)}
                    className={`h-1.5 rounded-full transition ${
                      active
                        ? "w-20 bg-sky-500"
                        : done
                          ? "w-10 bg-emerald-400"
                          : "w-10 bg-sky-200"
                    }`}
                    aria-label={`Chọn câu ${idx + 1}`}
                  />
                );
              })}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center justify-between bg-indigo-600 px-3 py-2 text-white">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>Đoạn văn song ngữ</span>
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs">
                    ⏱ {formatCountdown(translationElapsedSec)}
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  Câu {Math.min(translationSentenceIndex + 1, Math.max(translationSentences.length, 1))}/{Math.max(translationSentences.length, 1)}
                </span>
              </div>
              <div className="bg-white px-3 py-2 text-sm leading-7 text-slate-800">
                {translationSentences.length === 0 ? (
                  <span>Không có nội dung để dịch.</span>
                ) : (
                  translationSentences.map((sentence, idx) => {
                    const active = idx === translationSentenceIndex;
                    return (
                      <button
                        key={`sentence-${idx}`}
                        type="button"
                        onClick={() => setTranslationSentenceIndex(idx)}
                        className={`mr-1 inline text-left transition ${
                          active
                            ? "rounded-sm bg-amber-50 font-semibold text-orange-700"
                            : "text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {sentence}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="relative">
                <textarea
                  value={activeTranslationAnswer}
                  onChange={(e) =>
                    setTranslationAnswerBySentence((prev) => ({ ...prev, [translationSentenceIndex]: e.target.value }))
                  }
                  placeholder="Nhập bản dịch của bạn..."
                  rows={2}
                  className="w-full resize-y rounded-xl border-2 border-indigo-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none ring-indigo-500/30 focus:ring-2"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setTranslationAnswerBySentence((prev) => ({ ...prev, [translationSentenceIndex]: "" }))
                }
                className="btn-secondary inline-flex items-center gap-1.5"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => void suggestTranslation()}
                disabled={translationSuggesting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {translationSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                Xem gợi ý
              </button>
              <button
                type="button"
                onClick={() => void reviewTranslation()}
                disabled={translationReviewing}
                className="btn-primary inline -flex items-center gap-1.5"
              >
                {translationReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Kiểm tra
              </button>
              {activeTranslationReview?.improvedTranslation ? (
                <button
                  type="button"
                  onClick={() =>
                    setTranslationAnswerBySentence((prev) => ({
                      ...prev,
                      [translationSentenceIndex]: activeTranslationReview.improvedTranslation || "",
                    }))
                  }
                  className="btn-secondary inline-flex items-center gap-1.5"
                >
                  Viết lại
                </button>
              ) : null}
            </div>
          </div>

          <aside className="surface p-0">
            <div className="flex items-center justify-between bg-indigo-600 px-3 py-2 text-white">
              <p className="text-sm font-semibold">{translationAiPanel === "review" ? "Đánh giá từ AI" : "Trợ lý học tập AI"}</p>
              <button type="button" className="rounded-md border border-white/30 bg-white/10 px-2 py-0.5 text-xs">
                Góp ý
              </button>
            </div>

            {translationAiPanel === "guide" ? (
              <div className="p-3 text-sm text-slate-700">
                <p className="font-semibold">👍 Hướng dẫn luyện tập</p>
                <p className="mt-2">Click vào button "Gợi ý" nếu bạn gặp khó khăn, AI sẽ giúp bạn 💡</p>
                <p className="mt-1">Hãy click vào button "Kiểm tra" để AI review và đánh giá câu dịch của bạn ✅</p>
                <p className="mt-3 text-xs italic text-slate-500">🌍 Mỗi từ bạn học là một bước gần hơn đến thế giới mới.</p>
              </div>
            ) : null}

            {translationAiPanel === "suggestion" ? (
              <div className="space-y-3 p-3">
                <p className="text-sm font-semibold text-slate-900">Gợi ý</p>
                <div className="space-y-2">
                  {(activeTranslationSuggestion?.vocabularyHints ?? []).map((v, idx) => (
                    <div key={`${v.word}-${idx}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-sm text-emerald-900">
                      <p className="font-semibold">{v.word}</p>
                      <p>{v.meaning}</p>
                    </div>
                  ))}
                  {(activeTranslationSuggestion?.vocabularyHints ?? []).length === 0 ? (
                    <p className="text-sm text-muted">Chưa có gợi ý từ vựng.</p>
                  ) : null}
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold text-slate-900">Cấu trúc câu</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {(activeTranslationSuggestion?.structureHints ?? []).map((x, idx) => (
                      <li key={`${x}-${idx}`}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {translationAiPanel === "review" ? (
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-emerald-600">✓ Tốt!</p>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-sm font-bold text-indigo-700">
                    {Math.round((activeTranslationReview?.overallScore ?? 0) / 20)}/10
                  </span>
                </div>
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-sm text-emerald-800">
                  {activeTranslationReview?.summary || "Bài dịch đã được chấm xong."}
                </p>
                {activeTranslationReview?.suggestedPattern ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-sm text-amber-800">
                    Gợi ý cấu trúc câu: {activeTranslationReview.suggestedPattern}
                  </p>
                ) : null}
                {activeTranslationReview?.grammarHint || activeTranslationReview?.vocabularyHint ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-sm text-rose-800">
                    {activeTranslationReview?.grammarHint ? <p>Ngữ pháp: {activeTranslationReview.grammarHint}</p> : null}
                    {activeTranslationReview?.vocabularyHint ? <p>Từ vựng: {activeTranslationReview.vocabularyHint}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}
    </div>
  );
}
