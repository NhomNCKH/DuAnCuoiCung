// app/admin/certificates/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  Search,
  Send,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { AdminOfficialExamResultItem } from "@/types/admin-dashboard";
import { AdminCard, AdminEmptyState } from "@/components/admin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { EnhancedStatCard } from "@/components/ui/EnhancedStatCard";
import { SharedDropdown } from "@/components/ui/shared-dropdown";
import { SharedTable, SharedTableBody, SharedTableHead } from "@/components/ui/shared-table";

type ActiveTab = "results" | "issuance";

type ResultStatus = "graded" | "in_progress" | "submitted" | "abandoned" | "cancelled";
type IssueStatus = "not_issued" | "issued";

interface OfficialExamResultRow {
  id: string;
  userId: string;
  examTemplateId: string;
  studentName: string;
  studentEmail: string;
  examName: string;
  totalScore: number;
  startedAt: string;
  submittedAt?: string | null;
  status: ResultStatus;
  passThreshold: number;
  isEligible: boolean;
  issueStatus: IssueStatus;
  hasViolation: boolean;
  violationCount: number;
}

interface OfficialExamTemplateOption {
  value: string;
  label: string;
}

const DEFAULT_PASS_THRESHOLD = 500;
const PAGE_SIZE = 10;
const CERTIFICATE_TABS: Array<{
  key: ActiveTab;
  label: string;
  icon: typeof FileCheck2;
}> = [
  { key: "results", label: "Kết quả", icon: FileCheck2 },
  { key: "issuance", label: "Cấp chứng chỉ", icon: ShieldCheck },
];

function toResultStatus(status: string): ResultStatus {
  if (status === "graded") return "graded";
  if (status === "submitted") return "submitted";
  if (status === "abandoned") return "abandoned";
  if (status === "cancelled") return "cancelled";
  return "in_progress";
}

function getResultStatusLabel(status: ResultStatus) {
  switch (status) {
    case "graded":
      return "Đã chấm";
    case "submitted":
      return "Đã nộp";
    case "abandoned":
      return "Bỏ dở";
    case "cancelled":
      return "Đã hủy";
    default:
      return "Đang làm";
  }
}

function getResultStatusClass(status: ResultStatus) {
  switch (status) {
    case "graded":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "submitted":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "in_progress":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "abandoned":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    case "cancelled":
      return "border border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getIssueStatusLabel(status: IssueStatus) {
  return status === "issued" ? "Đã cấp" : "Chưa cấp";
}

function getIssueStatusClass(status: IssueStatus) {
  return status === "issued"
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-amber-200 bg-amber-50 text-amber-700";
}

function StatusBadge({
  label,
  toneClassName,
}: {
  label: string;
  toneClassName: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClassName}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa nộp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export default function AdminCertificatesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resultsSearchTerm, setResultsSearchTerm] = useState("");
  const [issuanceSearchTerm, setIssuanceSearchTerm] = useState("");
  const [selectedResultStatus, setSelectedResultStatus] = useState("all");
  const [selectedIssuanceStatus, setSelectedIssuanceStatus] = useState("all");
  const [selectedResultExamTemplate, setSelectedResultExamTemplate] =
    useState("all");
  const [selectedIssuanceExamTemplate, setSelectedIssuanceExamTemplate] =
    useState("all");
  const [resultsPage, setResultsPage] = useState(1);
  const [issuancePage, setIssuancePage] = useState(1);
  const [rows, setRows] = useState<OfficialExamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeTab: ActiveTab = searchParams?.get("tab") === "issuance" ? "issuance" : "results";

  const hydrateRowsFromApi = (
    items: AdminOfficialExamResultItem[],
  ): OfficialExamResultRow[] => {
    return items.map((attempt) => {
      const totalScore = Number(attempt.totalScore ?? 0);
      const passThreshold = Number(attempt.passThreshold ?? DEFAULT_PASS_THRESHOLD);
      const isEligible = totalScore > DEFAULT_PASS_THRESHOLD;

      return {
        id: attempt.id,
        userId: attempt.user?.id ?? "",
        examTemplateId: attempt.template?.id ?? "",
        studentName: attempt.user?.name ?? "Chưa có tên",
        studentEmail: attempt.user?.email ?? "N/A",
        examName: attempt.template?.name ?? "Đề thi chính thức",
        totalScore,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        status: toResultStatus(attempt.status),
        passThreshold,
        isEligible,
        issueStatus: attempt.issueStatus ?? "not_issued",
        hasViolation: Boolean(attempt.hasViolation),
        violationCount: Number(attempt.violationCount ?? 0),
      };
    });
  };

  const fetchOfficialResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.admin.dashboard.listOfficialResults({
        page: 1,
        limit: 100,
      });
      const payload: any = response;
      const candidates = [
        payload?.data?.items,
        payload?.data?.data?.items,
        payload?.data?.data?.data?.items,
        payload?.items,
      ];
      const items = (candidates.find((value) => Array.isArray(value)) ??
        []) as AdminOfficialExamResultItem[];
      setRows(hydrateRowsFromApi(items));
    } catch (err: any) {
      setRows([]);
      setError(err?.message ?? "Không thể tải dữ liệu kết quả thi chính thức.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOfficialResults();
  }, [fetchOfficialResults]);

  const officialExamOptions = useMemo<OfficialExamTemplateOption[]>(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (!row.examTemplateId) continue;
      if (!map.has(row.examTemplateId)) {
        map.set(row.examTemplateId, row.examName);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [rows]);

  const normalizedResultsSearch = resultsSearchTerm.trim().toLowerCase();
  const normalizedIssuanceSearch = issuanceSearchTerm.trim().toLowerCase();

  const filteredResults = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        normalizedResultsSearch.length === 0 ||
        row.studentName.toLowerCase().includes(normalizedResultsSearch) ||
        row.studentEmail.toLowerCase().includes(normalizedResultsSearch) ||
        row.examName.toLowerCase().includes(normalizedResultsSearch);

      const matchesStatus =
        selectedResultStatus === "all" || row.status === selectedResultStatus;
      const matchesExamTemplate =
        selectedResultExamTemplate === "all" ||
        row.examTemplateId === selectedResultExamTemplate;

      return matchesSearch && matchesStatus && matchesExamTemplate;
    });
  }, [
    rows,
    normalizedResultsSearch,
    selectedResultStatus,
    selectedResultExamTemplate,
  ]);

  const filteredIssuanceRows = useMemo(() => {
    return rows.filter((row) => {
      if (!row.isEligible) return false;

      const matchesSearch =
        normalizedIssuanceSearch.length === 0 ||
        row.studentName.toLowerCase().includes(normalizedIssuanceSearch) ||
        row.studentEmail.toLowerCase().includes(normalizedIssuanceSearch) ||
        row.examName.toLowerCase().includes(normalizedIssuanceSearch);

      const matchesIssueStatus =
        selectedIssuanceStatus === "all" ||
        (selectedIssuanceStatus === "issued" && row.issueStatus === "issued") ||
        (selectedIssuanceStatus === "not_issued" && row.issueStatus === "not_issued");
      const matchesExamTemplate =
        selectedIssuanceExamTemplate === "all" ||
        row.examTemplateId === selectedIssuanceExamTemplate;

      return matchesSearch && matchesIssueStatus && matchesExamTemplate;
    });
  }, [
    rows,
    normalizedIssuanceSearch,
    selectedIssuanceStatus,
    selectedIssuanceExamTemplate,
  ]);

  const stats = useMemo(() => {
    const totalResults = rows.length;
    const gradedCount = rows.filter((row) => row.status === "graded").length;
    const eligibleCount = rows.filter((row) => row.isEligible).length;
    const issuedCount = rows.filter((row) => row.issueStatus === "issued").length;
    const issueRate = eligibleCount > 0 ? Math.round((issuedCount / eligibleCount) * 100) : 0;

    return {
      totalResults,
      gradedCount,
      eligibleCount,
      issueRate,
    };
  }, [rows]);

  const resultsTotalPages = Math.max(
    1,
    Math.ceil(filteredResults.length / PAGE_SIZE),
  );
  const issuanceTotalPages = Math.max(
    1,
    Math.ceil(filteredIssuanceRows.length / PAGE_SIZE),
  );

  const paginatedResults = useMemo(() => {
    const start = (resultsPage - 1) * PAGE_SIZE;
    return filteredResults.slice(start, start + PAGE_SIZE);
  }, [filteredResults, resultsPage]);

  const paginatedIssuanceRows = useMemo(() => {
    const start = (issuancePage - 1) * PAGE_SIZE;
    return filteredIssuanceRows.slice(start, start + PAGE_SIZE);
  }, [filteredIssuanceRows, issuancePage]);

  const handleChangeTab = (nextTab: ActiveTab) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setResultsPage(1);
  }, [resultsSearchTerm, selectedResultStatus, selectedResultExamTemplate]);

  useEffect(() => {
    setIssuancePage(1);
  }, [issuanceSearchTerm, selectedIssuanceStatus, selectedIssuanceExamTemplate]);

  useEffect(() => {
    if (resultsPage > resultsTotalPages) {
      setResultsPage(resultsTotalPages);
    }
  }, [resultsPage, resultsTotalPages]);

  useEffect(() => {
    if (issuancePage > issuanceTotalPages) {
      setIssuancePage(issuanceTotalPages);
    }
  }, [issuancePage, issuanceTotalPages]);

  return (
    <div className="space-y-6">
      <div>
        <nav
          className="border-b border-slate-200 admin-dark:border-[var(--admin-border)]"
          aria-label="Tabs chứng chỉ"
        >
          <div className="-mb-px flex flex-wrap items-end gap-1 sm:gap-2">
            {CERTIFICATE_TABS.map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleChangeTab(tab.key)}
                  className={`relative flex h-11 items-center gap-2 px-2.5 text-sm font-bold transition-colors sm:px-3 ${
                    active
                      ? "text-blue-600 admin-dark:text-[var(--admin-accent)]"
                      : "text-slate-400 hover:text-slate-600 admin-dark:text-[var(--admin-muted)] admin-dark:hover:text-[var(--admin-text)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  {tab.label}
                  {active ? (
                    <motion.span
                      layoutId="admin-certificate-tab-underline"
                      className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-blue-600 admin-dark:bg-[var(--admin-accent)]"
                      transition={{ type: "spring", stiffness: 480, damping: 38 }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {activeTab === "results" ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <EnhancedStatCard
              icon={FileCheck2}
              label="Kết quả thi chính thức"
              value={formatNumber(stats.totalResults)}
              color="from-blue-500 to-indigo-600"
              bgColor="bg-white"
              compact
              tone="blue"
            />
            <EnhancedStatCard
              icon={CheckCircle2}
              label="Bài đã chấm"
              value={formatNumber(stats.gradedCount)}
              color="from-emerald-500 to-teal-600"
              bgColor="bg-white"
              compact
              tone="green"
            />
            <EnhancedStatCard
              icon={Users}
              label="Đủ điều kiện cấp"
              value={formatNumber(stats.eligibleCount)}
              color="from-amber-500 to-orange-600"
              bgColor="bg-white"
              compact
              tone="yellow"
            />
            <EnhancedStatCard
              icon={Award}
              label="Tỉ lệ đã cấp"
              value={`${stats.issueRate}%`}
              color="from-purple-500 to-pink-600"
              bgColor="bg-white"
              compact
              tone="red"
            />
          </motion.div>

          <AdminCard title="Kết quả thi chính thức">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={resultsSearchTerm}
                  onChange={(event) => setResultsSearchTerm(event.target.value)}
                  placeholder="Tìm theo học viên, email, đề thi..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <SharedDropdown
                value={selectedResultStatus}
                onChange={setSelectedResultStatus}
                className="w-full min-w-[190px] lg:w-[220px]"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "graded", label: "Đã chấm" },
                  { value: "submitted", label: "Đã nộp" },
                  { value: "in_progress", label: "Đang làm" },
                  { value: "abandoned", label: "Bỏ dở" },
                  { value: "cancelled", label: "Đã hủy" },
                ]}
              />
              <SharedDropdown
                value={selectedResultExamTemplate}
                onChange={setSelectedResultExamTemplate}
                className="w-full min-w-[220px] lg:w-[320px]"
                options={[
                  { value: "all", label: "Tất cả đề thi chính thức" },
                  ...officialExamOptions,
                ]}
              />
            </div>

            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <Clock3 className="h-4 w-4" />
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-600">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải dữ liệu kết quả thi chính thức...
              </div>
            ) : filteredResults.length === 0 ? (
              <AdminEmptyState
                icon={XCircle}
                title="Không có kết quả phù hợp"
                description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <SharedTable>
                    <SharedTableHead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Học viên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Đề thi chính thức
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Điểm
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Thời gian nộp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Trạng thái
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Cờ gian lận
                        </th>
                      </tr>
                    </SharedTableHead>
                    <SharedTableBody>
                      {paginatedResults.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-semibold text-slate-800">{row.studentName}</p>
                            <p className="text-xs text-slate-500">{row.studentEmail}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-medium text-slate-800">{row.examName}</p>
                            <p className="text-xs text-slate-500">Bắt đầu: {formatDateTime(row.startedAt)}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-bold text-blue-700">{formatNumber(row.totalScore)}</p>
                            <p className="text-xs text-slate-500">Ngưỡng đạt: {row.passThreshold}</p>
                          </td>
                          <td className="px-4 py-3 align-top text-sm text-slate-600">
                            {formatDateTime(row.submittedAt)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge
                              toneClassName={getResultStatusClass(row.status)}
                              label={getResultStatusLabel(row.status)}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            {row.hasViolation ? (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/admin/proctoring?userId=${encodeURIComponent(
                                      row.userId,
                                    )}&examId=${encodeURIComponent(row.id)}`,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Dấu hiệu ({row.violationCount})
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                Bình thường
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </SharedTableBody>
                  </SharedTable>
                </div>
              </div>
            )}

            {!loading && filteredResults.length > 0 ? (
              <AdminPagination
                className="mt-4"
                page={resultsPage}
                totalPages={resultsTotalPages}
                total={filteredResults.length}
                limit={PAGE_SIZE}
                onPageChange={setResultsPage}
                itemLabel="kết quả"
              />
            ) : null}
          </AdminCard>
        </>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <EnhancedStatCard
              icon={Users}
              label="Học viên đủ điều kiện"
              value={formatNumber(stats.eligibleCount)}
              color="from-amber-500 to-orange-600"
              bgColor="bg-white"
              compact
              tone="yellow"
            />
            <EnhancedStatCard
              icon={Award}
              label="Đã cấp chứng chỉ"
              value={formatNumber(rows.filter((row) => row.issueStatus === "issued").length)}
              color="from-blue-500 to-indigo-600"
              bgColor="bg-white"
              compact
              tone="blue"
            />
            <EnhancedStatCard
              icon={Clock3}
              label="Chờ cấp chứng chỉ"
              value={formatNumber(rows.filter((row) => row.isEligible && row.issueStatus === "not_issued").length)}
              color="from-rose-500 to-pink-600"
              bgColor="bg-white"
              compact
              tone="red"
            />
            <EnhancedStatCard
              icon={CheckCircle2}
              label="Tỉ lệ hoàn tất"
              value={`${stats.issueRate}%`}
              color="from-emerald-500 to-teal-600"
              bgColor="bg-white"
              compact
              tone="green"
            />
          </motion.div>

          <AdminCard
            title="Cấp chứng chỉ cho học viên đủ điều kiện"
            rightSlot={
              <button type="button" className="btn-primary" disabled>
                <Send className="h-4 w-4" />
                Cấp hàng loạt
              </button>
            }
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={issuanceSearchTerm}
                  onChange={(event) => setIssuanceSearchTerm(event.target.value)}
                  placeholder="Tìm học viên đủ điều kiện..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <SharedDropdown
                value={selectedIssuanceStatus}
                onChange={setSelectedIssuanceStatus}
                className="w-full min-w-[190px] lg:w-[220px]"
                options={[
                  { value: "all", label: "Tất cả trạng thái cấp" },
                  { value: "not_issued", label: "Chưa cấp" },
                  { value: "issued", label: "Đã cấp" },
                ]}
              />
              <SharedDropdown
                value={selectedIssuanceExamTemplate}
                onChange={setSelectedIssuanceExamTemplate}
                className="w-full min-w-[220px] lg:w-[320px]"
                options={[
                  { value: "all", label: "Tất cả đề thi chính thức" },
                  ...officialExamOptions,
                ]}
              />
            </div>

            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <Clock3 className="h-4 w-4" />
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-600">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải dữ liệu cấp chứng chỉ...
              </div>
            ) : filteredIssuanceRows.length === 0 ? (
              <AdminEmptyState
                icon={ShieldCheck}
                title="Chưa có học viên đủ điều kiện"
                description="Hệ thống sẽ hiển thị tại đây các bài thi chính thức đã đạt ngưỡng cấp chứng chỉ."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <SharedTable>
                    <SharedTableHead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Học viên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Đề thi chính thức
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Điểm đạt
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Trạng thái cấp
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Thao tác
                        </th>
                      </tr>
                    </SharedTableHead>
                    <SharedTableBody>
                      {paginatedIssuanceRows.map((row) => (
                        <tr key={`${row.id}-issuance`} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-semibold text-slate-800">{row.studentName}</p>
                            <p className="text-xs text-slate-500">{row.studentEmail}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-medium text-slate-800">{row.examName}</p>
                            <p className="text-xs text-slate-500">Nộp bài: {formatDateTime(row.submittedAt)}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-bold text-emerald-700">{formatNumber(row.totalScore)}</p>
                            <p className="text-xs text-slate-500">Đủ điều kiện cấp chứng chỉ</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge
                              toneClassName={getIssueStatusClass(row.issueStatus)}
                              label={getIssueStatusLabel(row.issueStatus)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <button type="button" className="btn-primary text-sm" disabled={row.issueStatus === "issued"}>
                              {row.issueStatus === "issued" ? "Đã cấp" : "Cấp chứng chỉ"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </SharedTableBody>
                  </SharedTable>
                </div>
              </div>
            )}

            {!loading && filteredIssuanceRows.length > 0 ? (
              <AdminPagination
                className="mt-4"
                page={issuancePage}
                totalPages={issuanceTotalPages}
                total={filteredIssuanceRows.length}
                limit={PAGE_SIZE}
                onPageChange={setIssuancePage}
                itemLabel="học viên"
              />
            ) : null}
          </AdminCard>
        </>
      )}
    </div>
  );
}