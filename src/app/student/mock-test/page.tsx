"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  Play,
  Star,
  Loader2,
  AlertCircle,
  RefreshCw,
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
  const totalAttemptHistory = templates.reduce(
    (sum, template) => sum + (template.historyCount ?? 0),
    0,
  );

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
      case "practice": return "bg-green-50 text-green-600";
      case "mock_test": return "bg-blue-50 text-blue-600";
      case "official_exam": return "bg-purple-50 text-purple-600";
      default: return "bg-gray-50 text-gray-600";
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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Thi thử TOEIC</h1>
        </div>
        <p className="text-gray-600">Làm quen với cấu trúc đề thi thật và đánh giá năng lực hiện tại</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      >
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">{templates.length}</div>
          <div className="text-sm text-gray-600">Đề thi có sẵn</div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">
            {templates.filter((t) => t.mode === "mock_test" || t.mode === "official_exam").length}
          </div>
          <div className="text-sm text-gray-600">Full test</div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">
            {totalAttemptHistory}
          </div>
          <div className="text-sm text-gray-600">Lần thi đã lưu</div>
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
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Chưa có đề thi nào được xuất bản</p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {templates.map((template) => (
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
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-emerald-100 hover:shadow-md transition-all"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 mb-1">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-gray-500 line-clamp-2">{template.description}</p>
                        )}
                      </div>
                      {template.difficulty && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-lg font-medium whitespace-nowrap">
                          {getDifficultyLabel(template.difficulty)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
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
                      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-700">
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
                              <span className="font-semibold text-blue-700">
                                {latestGradedAttempt.totalScore}
                              </span>
                            </span>
                            <span>
                              {latestGradedAttempt.correctCount}/{latestGradedAttempt.totalQuestions} đúng
                            </span>
                          </div>
                        ) : null}
                        {hasInProgressAttempt && latestGradedAttempt && (
                          <div className="mt-1 text-xs text-slate-500">
                            Kết quả gần nhất: lần {latestGradedAttempt.attemptNo} • {latestGradedAttempt.totalScore} điểm
                          </div>
                        )}
                        {(template.historyCount ?? 0) > 1 && (
                          <div className="mt-1 text-xs text-slate-500">
                            Tổng số lần thi: {template.historyCount}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {hasInProgressAttempt ? (
                        <>
                          <Link
                            href={primaryHref}
                            className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700"
                          >
                            <Play className="w-4 h-4" />
                            Tiếp tục làm
                          </Link>
                          {latestGradedAttempt && (
                            <Link
                              href={`/student/mock-test/${template.id}?attemptId=${latestGradedAttempt.id}&view=result`}
                              className="flex items-center justify-center gap-2 w-full rounded-lg border border-blue-200 bg-white py-2.5 font-medium text-blue-600 transition-colors hover:bg-blue-50"
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
                              ? "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
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
                          className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
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
