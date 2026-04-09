"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
  Headphones,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getSignedMediaUrl } from "@/lib/media-url";
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

const PART_LABEL: Record<string, string> = {
  P1: "Part 1 - Photos",
  P2: "Part 2 - Question-Response",
  P3: "Part 3 - Conversations",
  P4: "Part 4 - Talks",
  P5: "Part 5 - Incomplete Sentences",
  P6: "Part 6 - Text Completion",
  P7: "Part 7 - Reading Comprehension",
};

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

export default function MockTestExamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewAttemptId = searchParams.get("attemptId")?.trim() ?? "";

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

  const clearTimerInterval = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const clearAutoSaveInterval = () => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
  };

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
    [attempt?.id, showResultView],
  );

  useEffect(() => {
    const start = async () => {
      setPageState("loading");
      setErrorMsg("");
      setResult(null);
      setResultPayload(null);

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

        setPageState("exam");
      } catch (err: any) {
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
  }, [attempt?.id, getChangedAnswerPayload, pageState, saveAnswers]);

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
    [attempt, recoverClosedAttemptResult, saveAnswers, showResultView],
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
  }, [pageState, timeLeft]);

  const currentQuestion = allQuestions[currentIdx];

  useEffect(() => {
    let cancelled = false;

    const loadCurrentMedia = async () => {
      if (!currentQuestion) {
        setResolvedMedia({});
        setMediaError({ audio: false, image: false });
        return;
      }

      setMediaError({ audio: false, image: false });

      const imageAsset = getAssetByKind(currentQuestion.assets, "image");
      const audioAsset = getAssetByKind(currentQuestion.assets, "audio");
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
  }, [currentQuestion, resolveAssetUrl]);

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
  const currentPartTabLabel = currentPart
    ? PART_TAB_LABEL[currentPart] ?? PART_LABEL[currentPart] ?? currentPart
    : "Đề thi";
  const isLongListPart = currentPart === "P2";
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

  const jumpToQuestion = (questionId: string) => {
    const nextIndex = allQuestions.findIndex((question) => question.id === questionId);
    if (nextIndex >= 0) {
      setCurrentIdx(nextIndex);

      const targetQuestion = allQuestions[nextIndex];
      if (targetQuestion?.part === "P2") {
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

  const renderQuestionPanel = (question: MockExamQuestion) => {
    const prompt = getQuestionPrompt(question);
    const options = getVisibleOptions(question);
    const hideOptionCopy = shouldHideOptionText(question.part);
    const isAnswered = Boolean(answers[question.id]);

    return (
      <div id={`question-${question.id}`} key={question.id} className="flex items-start gap-4">
        <span
          className={`mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
            isAnswered
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {question.displayNumber}
        </span>

        <div className="min-w-0 flex-1 space-y-3">
          {prompt ? (
            <p className="text-[18px] font-medium leading-8 text-slate-900">{prompt}</p>
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
                      selected ? "text-blue-700" : "text-slate-800"
                    }`}
                  >
                    <span
                      className={`mt-1 inline-flex h-5 w-5 shrink-0 rounded-full border ${
                        selected
                          ? "border-blue-600 bg-blue-600 shadow-[inset_0_0_0_3px_white]"
                          : "border-slate-400 bg-white"
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

    return (
      <div className="space-y-4">
        {showImage && (
          <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
            {resolvedMedia.imageUrl && !mediaError.image ? (
              <img
                src={resolvedMedia.imageUrl}
                alt="Question illustration"
                className="max-h-[760px] w-full object-contain"
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
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="whitespace-pre-line text-[17px] leading-8 text-slate-800">
              {transcript}
            </p>
          </div>
        )}

        {showStem && (
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="whitespace-pre-line text-[17px] leading-8 text-slate-800">
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
        className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <span
            className={`mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
              question.isCorrect
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {question.questionNo}
          </span>

          <div className="min-w-0 flex-1 space-y-3">
            {question.prompt?.trim() ? (
              <p className="text-[18px] font-medium leading-8 text-slate-900">
                {question.prompt}
              </p>
            ) : part === "P1" || part === "P2" ? null : (
              <p className="text-[18px] font-medium leading-8 text-slate-900">
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
                          ? "border-emerald-200 bg-emerald-50"
                          : isSelected
                            ? "border-rose-200 bg-rose-50"
                            : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-start gap-2">
                        <span className="font-semibold text-slate-900">
                          {optionKey}.
                        </span>
                        <span className="flex-1 text-slate-800">
                          {option.content}
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Bạn chọn
                          </span>
                        )}
                        {isCorrect && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Đáp án đúng
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {!question.isCorrect && correctOptionKey ? (
              <p className="text-sm font-medium text-emerald-700">
                Đáp án đúng: {correctOptionKey}
              </p>
            ) : null}

            {question.rationale?.trim() ? (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
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
      <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_100%)] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto w-full max-w-6xl space-y-6"
        >
          <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_60px_rgba(47,103,246,0.10)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 text-left">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
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
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Attempt #{currentAttemptId.slice(0, 8)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              {result.totalScore !== undefined && (
                <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.totalScore}</div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Tổng điểm
                  </div>
                </div>
              )}
              {result.listeningScore !== undefined && (
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-sky-700">
                    {result.listeningScore}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Listening
                  </div>
                </div>
              )}
              {result.readingScore !== undefined && (
                <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-indigo-700">
                    {result.readingScore}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Reading
                  </div>
                </div>
              )}
              {result.accuracy !== undefined && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">
                    {result.accuracy}%
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Độ chính xác
                  </div>
                </div>
              )}
              {result.correctAnswers !== undefined &&
                result.totalQuestions !== undefined && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                    <div className="text-2xl font-bold text-slate-800">
                      {result.correctAnswers}/{result.totalQuestions}
                    </div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Câu đúng
                    </div>
                  </div>
                )}
              {typeof resultPayload?.attempt.answeredCount === "number" && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {resultPayload.attempt.answeredCount}/{resultPayload.attempt.totalQuestions}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
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
                className="flex-1 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Làm lại đề này
              </button>
              <button
                onClick={() => router.push("/student/mock-test")}
                className="flex-1 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Về trang thi thử
              </button>
              {currentAttemptId && (
                <button
                  onClick={() => void openReviewDetails()}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
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
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    Lịch sử các lần làm
                  </h3>
                  <p className="mt-2 text-slate-500">
                    Mở lại chi tiết từng lần làm của đề này.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  {attemptHistory.length} lần làm
                </span>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-3 font-semibold">Lần</th>
                      <th className="px-3 py-3 font-semibold">Trạng thái</th>
                      <th className="px-3 py-3 font-semibold">Thời gian làm</th>
                      <th className="px-3 py-3 font-semibold">Kết quả</th>
                      <th className="px-3 py-3 font-semibold">Thời điểm</th>
                      <th className="px-3 py-3 font-semibold text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attemptHistory.map((historyItem) => {
                      const isCurrentAttempt = historyItem.id === currentAttemptId;
                      const hasResult = historyItem.status === "graded";

                      return (
                        <tr
                          key={historyItem.id}
                          className={isCurrentAttempt ? "bg-blue-50/60" : "bg-white"}
                        >
                          <td className="px-3 py-3 font-semibold text-slate-900">
                            Lần {historyItem.attemptNo}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {getAttemptStatusLabel(historyItem.status)}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {formatAttemptDuration(historyItem.durationSec)}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {hasResult
                              ? `${historyItem.totalScore} điểm • ${historyItem.correctCount}/${historyItem.totalQuestions} đúng`
                              : `${historyItem.answeredCount}/${historyItem.totalQuestions} câu đã chọn`}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {formatAttemptDate(
                              historyItem.gradedAt ??
                                historyItem.submittedAt ??
                                historyItem.startedAt,
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isCurrentAttempt ? (
                              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
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
                                className="inline-flex rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                              >
                                Xem chi tiết
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => router.push(`/student/mock-test/${id}`)}
                                className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
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
        <h2 className="text-xl font-bold text-slate-900">Đề thi không có câu hỏi</h2>
        <button
          onClick={() => router.push("/student/mock-test")}
          className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="-mx-4 min-h-screen bg-[#f6f8fc] text-slate-900 sm:-mx-6 lg:-mx-8">
      <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              {(resolvedMedia.audioUrl && !mediaError.audio) || hasAudioAsset ? (
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

              <div
                className={`flex flex-wrap gap-3 ${
                  ((resolvedMedia.audioUrl && !mediaError.audio) || hasAudioAsset) &&
                  !isLongListPart
                    ? "mt-5 border-t border-slate-100 pt-5"
                    : ""
                }`}
              >
                {sectionsWithQuestions.map((section) => {
                  const isActive = section.id === currentSection?.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => jumpToSection(section.id)}
                      className={`rounded-full px-5 py-2.5 text-lg font-semibold transition ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {PART_TAB_LABEL[section.part ?? ""] ?? section.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm xl:hidden">
              <div className="flex items-center justify-between gap-3">
                {timeLeft !== null && (
                  <div
                    className={`flex items-center gap-2 rounded-2xl px-4 py-3 font-mono text-base font-bold ${
                      timeLeft < 300
                        ? "bg-red-50 text-red-600"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    {formatTime(timeLeft)}
                  </div>
                )}

                <button
                  onClick={() => handleSubmit(false)}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                  Nộp bài
                </button>
              </div>
            </div>

            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-blue-100 px-4 py-2 text-lg font-semibold text-blue-700">
                  {currentPartTabLabel}
                </span>
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
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                {displayedQuestions.length > 1 ? "Nhóm trước" : "Câu trước"}
              </button>
              <button
                onClick={() => nextIndex >= 0 && setCurrentIdx(nextIndex)}
                disabled={nextIndex < 0}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {displayedQuestions.length > 1 ? "Nhóm tiếp" : "Câu tiếp"}
                <ChevronRight className="h-4 w-4" />
              </button>
              </div>
            )}
          </div>

          <aside className="hidden w-[280px] shrink-0 xl:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                {timeLeft !== null && (
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Thời gian còn lại</p>
                    <p
                      className={`mt-2 font-mono text-[40px] font-bold leading-none ${
                        timeLeft < 300 ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {formatTime(timeLeft)}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleSubmit(false)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500 px-5 py-3 text-lg font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  <Send className="h-4 w-4" />
                  Nộp bài
                </button>

                <p className="mt-4 text-sm text-slate-500">
                  {answeredCount}/{totalCount} câu đã chọn
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-600">
                  Bảng câu hỏi
                </p>

                <div className="space-y-6">
                  {sectionsWithQuestions.map((section) => (
                    <div key={section.id}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-lg font-semibold text-slate-900">
                          {PART_TAB_LABEL[section.part ?? ""] ?? section.name}
                        </span>
                        <span className="text-sm text-slate-400">
                          {section.questions.length} câu
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        {section.questions.map((question) => {
                          const answered = Boolean(answers[question.id]);

                          return (
                            <button
                              key={question.id}
                              onClick={() => jumpToQuestion(question.id)}
                              className={`h-11 rounded-xl border text-sm font-semibold transition ${
                                answered
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
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
