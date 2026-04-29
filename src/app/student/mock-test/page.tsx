"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  Play,
  Star,
  Trophy,
  History,
  Gauge,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type {
  LearnerExamAttemptHistoryItem,
  LearnerExamTemplateSummary,
  PaginatedData,
} from "@/types/learner-exam";

type ExamTemplate = LearnerExamTemplateSummary & {
  difficulty?: string;
  description?: string;
  latestAttempt?: LearnerExamAttemptHistoryItem | null;
  latestGradedAttempt?: LearnerExamAttemptHistoryItem | null;
  historyCount?: number;
};

export default function MockTestPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const visibleTemplates = useMemo(
    () =>
      templates.filter(
        (template) => template.mode === "mock_test" || template.mode === "practice",
      ),
    [templates],
  );
  const totalAttemptHistory = visibleTemplates.reduce(
    (sum, template) => sum + (template.historyCount ?? 0),
    0,
  );
  const totalQuestions = visibleTemplates.reduce(
    (sum, template) => sum + Number(template.totalQuestions ?? 0),
    0,
  );
  const inProgressCount = visibleTemplates.filter(
    (template) => template.latestAttempt?.status === "in_progress",
  ).length;
  const filteredTemplates = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return visibleTemplates;
    return visibleTemplates.filter((template) => {
      const name = String(template.name ?? "").toLowerCase();
      const desc = String(template.description ?? "").toLowerCase();
      const mode = String(getModeLabel(template.mode) ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q) || mode.includes(q);
    });
  }, [visibleTemplates, keyword]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const templateRes = await apiClient.learner.listPublishedTemplates();
      const payload = templateRes.data as PaginatedData<ExamTemplate>;
      setTemplates((payload.data ?? []).map((template) => ({ ...template })));
      setIsLoading(false);

      void apiClient.learner.examAttempt
        .listHistory({ limit: 100 })
        .then((historyRes) => {
          const historyPayload = historyRes.data as
            | PaginatedData<LearnerExamAttemptHistoryItem>
            | undefined;
          const latestAttemptByTemplate = new Map<string, LearnerExamAttemptHistoryItem>();
          const latestGradedAttemptByTemplate = new Map<string, LearnerExamAttemptHistoryItem>();
          const historyCountByTemplate = new Map<string, number>();

          for (const attempt of historyPayload?.data ?? []) {
            historyCountByTemplate.set(
              attempt.examTemplateId,
              (historyCountByTemplate.get(attempt.examTemplateId) ?? 0) + 1,
            );

            if (!latestAttemptByTemplate.has(attempt.examTemplateId)) {
              latestAttemptByTemplate.set(attempt.examTemplateId, attempt);
            }

            if (
              attempt.status === "graded" &&
              !latestGradedAttemptByTemplate.has(attempt.examTemplateId)
            ) {
              latestGradedAttemptByTemplate.set(attempt.examTemplateId, attempt);
            }
          }

          setTemplates((prev) =>
            prev.map((template) => ({
              ...template,
              latestAttempt: latestAttemptByTemplate.get(template.id) ?? null,
              latestGradedAttempt:
                latestGradedAttemptByTemplate.get(template.id) ?? null,
              historyCount: historyCountByTemplate.get(template.id) ?? 0,
            })),
          );
        })
        .catch(() => undefined);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách đề thi");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const formatDuration = (sec?: number) => {
    if (!sec) return "—";
    const m = Math.floor(sec / 60);
    return `${m} phút`;
  };

  const getDifficultyLabel = (d?: string) => {
    switch (d) {
      case "easy": return "Cơ bản";
      case "medium": return "Trung cấp";
      case "hard": return "Cao cấp";
      default: return d ?? "—";
    }
  };

  const getModeLabel = (mode?: string) => {
    switch (mode) {
      case "practice": return "Luyện tập";
      case "mock_test": return "Thi thử";
      case "official_exam": return "Thi chính thức";
      default: return mode ?? "—";
    }
  };

  const getModeColor = (mode?: string) => {
    switch (mode) {
      case "practice":
        return "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200";
      case "mock_test":
        return "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200";
      case "official_exam":
        return "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200";
      default:
        return "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300";
    }
  };

  const getAttemptStatusLabel = (status?: string) => {
    switch (status) {
      case "graded":
        return "Đã chấm điểm";
      case "in_progress":
        return "Đang làm dở";
      default:
        return null;
    }
  };

  const restartTemplate = (templateId: string) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`mock-test-force-new:${templateId}`, "1");
    }
    router.push(`/student/mock-test/${templateId}`);
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-600/40 dark:bg-slate-900/40"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                <FileText className="h-5 w-5" />
              </div>
              <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-slate-100">
                Thi thử TOEIC
              </h1>
            </div>

          </div>
          <div className="flex w-full items-center gap-2 md:w-auto md:min-w-[520px]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên đề, mô tả hoặc loại đề..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-amber-500/40 dark:focus:ring-amber-500/20"
              />
            </div>
            <button
              onClick={fetchTemplates}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <motion.div
          variants={item}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30"
        >
          <div className="mb-2 inline-flex rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{visibleTemplates.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Đề thi có sẵn</div>
        </motion.div>
        <motion.div
          variants={item}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30"
        >
          <div className="mb-2 inline-flex rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
            <Gauge className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {visibleTemplates.filter((t) => t.mode === "mock_test").length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Bài thi thử</div>
        </motion.div>
        <motion.div
          variants={item}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30"
        >
          <div className="mb-2 inline-flex rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <History className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalAttemptHistory}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Lượt làm đã lưu</div>
        </motion.div>
        <motion.div
          variants={item}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30"
        >
          <div className="mb-2 inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
            <Star className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalQuestions}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">
            Tổng câu hỏi • {inProgressCount} bài đang làm
          </div>
        </motion.div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchTemplates} className="flex items-center gap-1 text-sm underline">
            <RefreshCw className="w-3.5 h-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : visibleTemplates.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p>Chưa có đề thi thử hoặc bài luyện tập được xuất bản</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-300">
          Không tìm thấy đề phù hợp với từ khóa.
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
        >
          {filteredTemplates.map((template) => (
            (() => {
              const latestAttempt = template.latestAttempt;
              const latestGradedAttempt = template.latestGradedAttempt;
              const hasGradedAttempt = !!latestGradedAttempt;
              const hasInProgressAttempt = latestAttempt?.status === "in_progress";
              const primaryHref = hasGradedAttempt
                ? `/student/mock-test/${template.id}?attemptId=${latestGradedAttempt.id}&view=result`
                : `/student/mock-test/${template.id}`;
              const primaryLabel = hasGradedAttempt
                ? "Xem kết quả"
                : hasInProgressAttempt
                  ? "Tiếp tục làm"
                  : "Bắt đầu thi";

              return (
                <motion.div
                  key={template.id}
                  variants={item}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600/40 dark:bg-slate-900/30 dark:hover:bg-slate-900/40"
                >
                  <div className="h-1 w-full bg-slate-200 dark:bg-slate-700/60" />
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="mb-1 line-clamp-2 font-bold text-slate-900 dark:text-slate-100">
                          {template.name}
                        </h3>
                        {template.description && (
                          <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-300">
                            {template.description}
                          </p>
                        )}
                      </div>
                      {template.difficulty && (
                        <span className="ml-2 px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                          {getDifficultyLabel(template.difficulty)}
                        </span>
                      )}
                    </div>

                    <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(template.totalDurationSec)}
                      </div>
                      {template.totalQuestions && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" />
                          {template.totalQuestions} câu
                        </div>
                      )}
                      {template.mode && (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getModeColor(template.mode)}`}>
                          {getModeLabel(template.mode)}
                        </span>
                      )}
                    </div>

                    {latestAttempt && (
                      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-600/40 dark:bg-slate-900/50 dark:text-slate-200">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-700 dark:text-slate-100">
                            {getAttemptStatusLabel(latestAttempt.status)}
                          </span>
                          <span>Lần {latestAttempt.attemptNo}</span>
                        </div>
                        {hasInProgressAttempt ? (
                          <div className="mt-1">
                            Đã chọn {latestAttempt.answeredCount}/{latestAttempt.totalQuestions} câu
                          </div>
                        ) : latestGradedAttempt ? (
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <span>
                              Điểm gần nhất:{" "}
                              <span className="font-semibold text-amber-800 dark:text-amber-200">
                                {latestGradedAttempt.totalScore}
                              </span>
                            </span>
                            <span>
                              {latestGradedAttempt.correctCount}/{latestGradedAttempt.totalQuestions} đúng
                            </span>
                          </div>
                        ) : null}
                        {hasInProgressAttempt && latestGradedAttempt && (
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                            Kết quả gần nhất: lần {latestGradedAttempt.attemptNo} • {latestGradedAttempt.totalScore} điểm
                          </div>
                        )}
                        {(template.historyCount ?? 0) > 1 && (
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                            Tổng số lần thi: {template.historyCount}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                      {hasInProgressAttempt ? (
                        <>
                          <Link
                            href={primaryHref}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 font-semibold text-slate-900 transition-colors hover:bg-amber-400"
                          >
                            <Play className="w-4 h-4" />
                            Tiếp tục làm
                          </Link>
                          {latestGradedAttempt && (
                            <Link
                              href={`/student/mock-test/${template.id}?attemptId=${latestGradedAttempt.id}&view=result`}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                            >
                              <Play className="w-4 h-4" />
                              Xem kết quả gần nhất
                            </Link>
                          )}
                        </>
                      ) : (
                        <Link
                          href={primaryHref}
                          className={`flex items-center justify-center gap-2 w-full rounded-lg py-2.5 font-medium transition-colors ${
                            hasGradedAttempt
                              ? "rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                              : "rounded-xl bg-amber-500 text-slate-900 hover:bg-amber-400 font-semibold"
                          }`}
                        >
                          <Play className="w-4 h-4" />
                          {primaryLabel}
                        </Link>
                      )}

                      {latestAttempt && (
                        <button
                          type="button"
                          onClick={() => restartTemplate(template.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600/40 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          Làm lại đề này
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()
          ))}
        </motion.div>
      )}
    </div>
  );
}
