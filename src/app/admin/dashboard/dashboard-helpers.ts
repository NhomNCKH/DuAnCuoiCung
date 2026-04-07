import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Award,
  BookOpen,
  Clock3,
  FileText,
  GraduationCap,
  Users,
} from "lucide-react";
import type {
  AdminDashboardActivity,
  AdminDashboardCountBucket,
  AdminDashboardPartCoverage,
  AdminDashboardSummary,
} from "@/types/admin-dashboard";

export type AccentTone = keyof typeof toneStyles;

export type StatCardItem = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone: AccentTone;
};

export type DistributionRow = {
  label: string;
  value: number;
};

export const modeLabels: Record<string, string> = {
  practice: "Luyện tập",
  mock_test: "Thi thử",
  official_exam: "Thi chuẩn",
};

export const attemptStatusLabels: Record<string, string> = {
  in_progress: "Đang làm",
  submitted: "Đã nộp",
  graded: "Đã chấm",
  abandoned: "Bỏ dở",
  cancelled: "Đã hủy",
};

export const userStatusLabels: Record<string, string> = {
  active: "Hoạt động",
  pending_verification: "Chờ kích hoạt",
  suspended: "Tạm khóa",
  deleted: "Đã xóa",
};

export const credentialStatusLabels: Record<string, string> = {
  issued: "Đã cấp",
  revoked: "Đã thu hồi",
  failed: "Lỗi cấp phát",
};

export const attemptStatusTone: Record<string, string> = {
  in_progress:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  submitted:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200",
  graded:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  abandoned:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200",
  cancelled:
    "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
};

export const userStatusTone: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending_verification: "border-amber-200 bg-amber-50 text-amber-700",
  suspended: "border-rose-200 bg-rose-50 text-rose-700",
  deleted: "border-slate-200 bg-slate-100 text-slate-600",
};

export const credentialStatusTone: Record<string, string> = {
  issued: "border-blue-200 bg-blue-50 text-blue-700",
  revoked: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

export const toneStyles = {
  blue: {
    iconWrap: "bg-blue-50 text-blue-600",
    progress: "from-blue-600 to-cyan-500",
  },
  emerald: {
    iconWrap: "bg-emerald-50 text-emerald-600",
    progress: "from-emerald-600 to-teal-500",
  },
  amber: {
    iconWrap: "bg-amber-50 text-amber-600",
    progress: "from-amber-500 to-orange-500",
  },
  rose: {
    iconWrap: "bg-rose-50 text-rose-600",
    progress: "from-rose-500 to-pink-500",
  },
  slate: {
    iconWrap: "bg-slate-100 text-slate-700",
    progress: "from-slate-700 to-slate-500",
  },
} as const;

export const panelClass = "rounded-xl border border-slate-200 bg-white shadow-sm";

export const primaryButtonClass =
  "inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

export const pillClass =
  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium";

export const attemptTableGridClass =
  "grid min-w-[760px] grid-cols-[1.2fr_1.4fr_0.9fr_0.8fr] gap-4";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("vi-VN").format(value ?? 0);
}

export function formatScore(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "Chưa ghi nhận";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0) return `${hrs} giờ ${mins} phút`;
  return `${mins} phút`;
}

export function getModeLabel(mode: string) {
  return modeLabels[mode] ?? mode;
}

export function getAttemptStatusLabel(status: string) {
  return attemptStatusLabels[status] ?? status;
}

export function getUserStatusLabel(status: string) {
  return userStatusLabels[status] ?? status;
}

export function getCredentialStatusLabel(status: string) {
  return credentialStatusLabels[status] ?? status;
}

export function buildOverviewCards(
  summary: AdminDashboardSummary | null | undefined,
): StatCardItem[] {
  if (!summary) return [];

  return [
    {
      label: "Đề thi",
      value: formatNumber(summary.totalTemplates),
      helper: `${formatNumber(summary.publishedTemplates)} đã phát hành`,
      icon: FileText,
      tone: "blue",
    },
    {
      label: "Nhóm câu hỏi",
      value: formatNumber(summary.totalQuestionGroups),
      helper: `${formatNumber(summary.publishedQuestionGroups)} đã duyệt`,
      icon: BookOpen,
      tone: "emerald",
    },
    {
      label: "Câu hỏi",
      value: formatNumber(summary.totalQuestions),
      helper: "Tổng số câu hỏi",
      icon: GraduationCap,
      tone: "amber",
    },
    {
      label: "Chứng chỉ",
      value: formatNumber(summary.totalCredentials),
      helper: `${formatNumber(summary.issuedCredentials)} đã cấp`,
      icon: Award,
      tone: "rose",
    },
  ];
}

export function buildMetricCards(
  summary: AdminDashboardSummary | null | undefined,
): StatCardItem[] {
  if (!summary) return [];

  return [
    {
      label: "Học viên",
      value: formatNumber(summary.activeUsers),
      helper: `${formatNumber(summary.totalUsers)} tài khoản`,
      icon: Users,
      tone: "blue",
    },
    {
      label: "Lượt thi",
      value: formatNumber(summary.totalAttempts),
      helper: `${formatNumber(summary.gradedAttempts)} đã chấm`,
      icon: Activity,
      tone: "amber",
    },
    {
      label: "Đang mở",
      value: formatNumber(summary.inProgressAttempts),
      helper: "Bài đang làm",
      icon: Clock3,
      tone: "emerald",
    },
    {
      label: "Điểm trung bình",
      value: formatScore(summary.averageTotalScore),
      helper: "Toàn hệ thống",
      icon: GraduationCap,
      tone: "slate",
    },
  ];
}

export function buildActivityCards(
  activity: AdminDashboardActivity | null | undefined,
): StatCardItem[] {
  return [
    {
      label: "Mới 7 ngày",
      value: formatNumber(activity?.newUsersLast7Days ?? 0),
      icon: Users,
      tone: "blue",
    },
    {
      label: "Lượt thi 7 ngày",
      value: formatNumber(activity?.attemptsLast7Days ?? 0),
      icon: Clock3,
      tone: "amber",
    },
    {
      label: "Chứng chỉ 30 ngày",
      value: formatNumber(activity?.credentialsLast30Days ?? 0),
      icon: Award,
      tone: "emerald",
    },
  ];
}

export function buildTemplateModeRows(
  templateModes: AdminDashboardCountBucket[],
): DistributionRow[] {
  return templateModes.map((bucket) => ({
    label: getModeLabel(bucket.key),
    value: bucket.count,
  }));
}

export function buildAttemptStatusRows(
  attemptStatuses: AdminDashboardCountBucket[],
): DistributionRow[] {
  return attemptStatuses.map((bucket) => ({
    label: getAttemptStatusLabel(bucket.key),
    value: bucket.count,
  }));
}

export function buildQuestionCoverageRows(
  questionCoverage: AdminDashboardPartCoverage[],
): DistributionRow[] {
  return questionCoverage.map((bucket) => ({
    label: bucket.part,
    value: bucket.questionCount,
  }));
}
