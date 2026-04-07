"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { getStoredAccessToken } from "@/lib/auth-session";
import type { AdminDashboardData } from "@/types/admin-dashboard";
import {
  buildActivityCards,
  buildAttemptStatusRows,
  buildMetricCards,
  buildOverviewCards,
  buildQuestionCoverageRows,
  buildTemplateModeRows,
  cn,
  formatDateTime,
  formatNumber,
  primaryButtonClass,
  secondaryButtonClass,
} from "./dashboard-helpers";
import {
  ActivityPanel,
  DistributionCard,
  ErrorState,
  LoadingState,
  PageShell,
  RecentAttemptsTable,
  RecentCredentialsCard,
  RecentUsersCard,
  StatCard,
} from "./dashboard-ui";

async function fetchDashboardSummaryFallback(): Promise<AdminDashboardData> {
  const endpoint = `${apiClient.baseURL}/admin/dashboard/summary`;
  const accessToken = getStoredAccessToken();
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw {
      statusCode: response.status,
      message: payload?.message || "Không tải được dữ liệu dashboard.",
      error: payload?.error,
      ...payload,
    };
  }

  return payload?.data as AdminDashboardData;
}

async function loadDashboardData() {
  const dashboardGetter = apiClient.admin?.dashboard?.getSummary;

  if (typeof dashboardGetter === "function") {
    const response = await dashboardGetter();
    return response.data;
  }

  return fetchDashboardSummaryFallback();
}

function DashboardHeader({
  userName,
  lastUpdatedAt,
  totalUsers,
  isRefreshing,
  onRefresh,
}: {
  userName?: string | null;
  lastUpdatedAt?: string | null;
  totalUsers?: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/exams" className={primaryButtonClass}>
            Đề thi
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/admin/questions?tab=groups"
            className={secondaryButtonClass}
          >
            Câu hỏi
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={secondaryButtonClass}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Làm mới
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          {userName ?? "Admin"}
        </span>
        <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          {formatDateTime(lastUpdatedAt)}
        </span>
        {typeof totalUsers === "number" ? (
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {formatNumber(totalUsers)} tài khoản
          </span>
        ) : null}
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(
    null,
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const nextData = await loadDashboardData();
      setDashboardData(nextData);
    } catch (fetchError) {
      console.error("Failed to fetch admin dashboard:", fetchError);
      const nextMessage =
        typeof fetchError === "object" &&
        fetchError !== null &&
        "statusCode" in fetchError &&
        fetchError.statusCode === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem dashboard."
          : typeof fetchError === "object" &&
              fetchError !== null &&
              "message" in fetchError &&
              typeof fetchError.message === "string"
            ? fetchError.message
            : "Có lỗi xảy ra khi tải dữ liệu tổng quan.";
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  if (loading && !dashboardData) {
    return <LoadingState />;
  }

  const summary = dashboardData?.summary;
  const overviewCards = buildOverviewCards(summary);
  const metricCards = buildMetricCards(summary);
  const activityCards = buildActivityCards(dashboardData?.activity);
  const templateModeRows = buildTemplateModeRows(dashboardData?.templateModes ?? []);
  const attemptStatusRows = buildAttemptStatusRows(
    dashboardData?.attemptStatuses ?? [],
  );
  const questionCoverageRows = buildQuestionCoverageRows(
    dashboardData?.questionCoverage ?? [],
  );

  return (
    <PageShell>
      <DashboardHeader
        userName={user?.name}
        lastUpdatedAt={dashboardData?.latestUpdatedAt}
        totalUsers={summary?.totalUsers}
        isRefreshing={loading}
        onRefresh={() => {
          void fetchDashboardData();
        }}
      />

      {error ? <ErrorState message={error} onRetry={fetchDashboardData} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.95fr_1fr_1fr]">
        <ActivityPanel cards={activityCards} />
        <DistributionCard title="Đề thi" rows={templateModeRows} tone="blue" />
        <DistributionCard
          title="Câu hỏi"
          rows={questionCoverageRows}
          tone="emerald"
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.55fr_0.95fr]">
        <RecentAttemptsTable
          rows={dashboardData?.recentAttempts ?? []}
          statusRows={attemptStatusRows}
        />

        <div className="space-y-4">
          <RecentUsersCard items={dashboardData?.recentUsers ?? []} />
          <RecentCredentialsCard items={dashboardData?.recentCredentials ?? []} />
        </div>
      </section>
    </PageShell>
  );
}
