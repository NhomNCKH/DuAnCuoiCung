"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Clock,
  Play,
  History,
  Star,
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

export default function OfficialExamPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  const officialTemplates = useMemo(
    () => templates.filter((template) => template.mode === "official_exam"),
    [templates],
  );

  const totalAttemptHistory = officialTemplates.reduce(
    (sum, template) => sum + (template.historyCount ?? 0),
    0,
  );
  const totalQuestions = officialTemplates.reduce(
    (sum, template) => sum + Number(template.totalQuestions ?? 0),
    0,
  );

  const filteredTemplates = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return officialTemplates;
    return officialTemplates.filter((template) => {
      const name = String(template.name ?? "").toLowerCase();
      const desc = String(template.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [officialTemplates, keyword]);

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
    return `${Math.floor(sec / 60)} phút`;
  };

  const restartTemplate = (templateId: string) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`mock-test-force-new:${templateId}`, "1");
    }
    router.push(`/student/mock-test/${templateId}`);
  };

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
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-slate-100">
                Thi chính thức
              </h1>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto md:min-w-[520px]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên đề hoặc mô tả..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:border-slate-600/40 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-violet-500/40 dark:focus:ring-violet-500/20"
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

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30">
          <div className="mb-2 inline-flex rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{officialTemplates.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Đề chính thức</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30">
          <div className="mb-2 inline-flex rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalQuestions}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Tổng câu hỏi</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30">
          <div className="mb-2 inline-flex rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
            <History className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalAttemptHistory}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Lượt thi đã lưu</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchTemplates} className="flex items-center gap-1 text-sm underline">
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : officialTemplates.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <ClipboardCheck className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p>Chưa có đề thi chính thức được xuất bản</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-300">
          Không tìm thấy đề phù hợp với từ khóa.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredTemplates.map((template) => {
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
                ? "Tiếp tục thi"
                : "Vào thi chính thức";

            return (
              <div
                key={template.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600/40 dark:bg-slate-900/30 dark:hover:bg-slate-900/40"
              >
                <div className="h-1 w-full bg-violet-200 dark:bg-violet-500/30" />
                <div className="p-5">
                  <h3 className="mb-1 line-clamp-2 font-bold text-slate-900 dark:text-slate-100">
                    {template.name}
                  </h3>
                  {template.description ? (
                    <p className="mb-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">
                      {template.description}
                    </p>
                  ) : null}

                  <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-300">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(template.totalDurationSec)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      {template.totalQuestions ?? 0} câu
                    </div>
                    <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                      Thi chính thức
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <Link
                      href={primaryHref}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold transition-colors ${
                        hasGradedAttempt
                          ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                          : "bg-violet-600 text-white hover:bg-violet-700"
                      }`}
                    >
                      <Play className="h-4 w-4" />
                      {primaryLabel}
                    </Link>

                    {latestAttempt ? (
                      <button
                        type="button"
                        onClick={() => restartTemplate(template.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600/40 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        Làm lại đề này
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
