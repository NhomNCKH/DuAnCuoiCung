import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Loader2, RefreshCw, TrendingUp } from "lucide-react";
import type {
  AdminDashboardRecentAttempt,
  AdminDashboardRecentCredential,
  AdminDashboardRecentUser,
} from "@/types/admin-dashboard";
import {
  attemptStatusTone,
  attemptTableGridClass,
  cn,
  credentialStatusTone,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatScore,
  getAttemptStatusLabel,
  getCredentialStatusLabel,
  getModeLabel,
  getUserStatusLabel,
  panelClass,
  pillClass,
  toneStyles,
  userStatusTone,
  type DistributionRow,
  type StatCardItem,
} from "./dashboard-helpers";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

type DistributionCardProps = {
  title: string;
  subtitle?: string;
  rows: DistributionRow[];
  tone?: keyof typeof toneStyles;
  valueLabel?: (value: number) => string;
};

type EntityListCardProps<T> = {
  title: string;
  href: string;
  hrefLabel: string;
  items: T[];
  emptyMessage: string;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
};

type StatCardProps = StatCardItem & {
  size?: "large" | "small";
};

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-dashboard-page min-h-screen bg-gradient-to-b from-slate-100/80 via-slate-50 to-slate-100/60">
      <div className="mx-auto max-w-7xl space-y-4">{children}</div>
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(panelClass, "rounded-2xl", className)}>{children}</div>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: string;
}) {
  return <span className={cn(pillClass, tone)}>{label}</span>;
}

function HoverCountNumber({
  value,
  active,
  durationMs = 600,
  formatter = formatNumber,
}: {
  value: number;
  active: boolean;
  durationMs?: number;
  formatter?: (value: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (!active) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      setDisplayValue(Math.round(value * progress));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    setDisplayValue(0);
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [active, durationMs, value]);

  return <>{formatter(displayValue)}</>;
}

export function HeroInsight({
  totalAttempts,
  gradedAttempts,
  inProgressAttempts,
  averageScore,
}: {
  totalAttempts: string;
  gradedAttempts: string;
  inProgressAttempts: string;
  averageScore: string;
}) {
  return (
    <Panel className="dashboard-pop-in dashboard-hero-card relative overflow-hidden border-blue-200/80 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-5 text-white shadow-blue-300/40">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-10 left-24 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl" />
      <div className="relative grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
            Performance Snapshot
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Tổng quan vận hành kỳ thi
          </h2>
          <p className="mt-2 text-sm text-blue-100/95">
            Theo dõi tiến độ chấm điểm, trạng thái bài thi và chất lượng đầu ra trong cùng một màn hình.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-sm">
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-blue-100">Lượt thi</p>
            <p className="mt-1 text-xl font-semibold">{totalAttempts}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-blue-100">Đã chấm</p>
            <p className="mt-1 text-xl font-semibold">{gradedAttempts}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-blue-100">Đang làm</p>
            <p className="mt-1 text-xl font-semibold">{inProgressAttempts}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-blue-100">Điểm TB</p>
            <p className="mt-1 text-xl font-semibold">{averageScore}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  size = "large",
}: StatCardProps) {
  const toneStyle = toneStyles[tone];
  const isSmall = size === "small";

  return (
    <Panel className={cn("border-slate-200/90", isSmall ? "p-3.5" : "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 font-semibold tracking-tight text-slate-900",
              isSmall ? "text-xl" : "text-[28px]",
            )}
          >
            {value}
          </p>
          {helper ? (
            <p className="mt-1 text-xs text-slate-500">{helper}</p>
          ) : null}
        </div>
        <div className={cn("rounded-lg p-2.5", toneStyle.iconWrap)}>
          <Icon className={cn(isSmall ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </div>
      </div>
    </Panel>
  );
}

export function TrendBarsCard({
  title,
  rows,
}: {
  title: string;
  rows: DistributionRow[];
}) {
  const [isHovered, setIsHovered] = useState(false);
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <Panel className="dashboard-fade-up p-4">
      <SectionHeader
        eyebrow="Trend"
        title={title}
        description="So sánh nhanh theo nhóm dữ liệu"
      />

      {rows.length === 0 ? (
        <EmptyState message="Chưa có dữ liệu để hiển thị." />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium">{row.label}</span>
                <span className="font-semibold text-slate-900">
                  <HoverCountNumber value={row.value} active={isHovered} />
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                  style={{ width: `${(row.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      </Panel>
    </div>
  );
}

export function DonutDistributionCard({
  title,
  rows,
}: {
  title: string;
  rows: DistributionRow[];
}) {
  const [isHovered, setIsHovered] = useState(false);
  const total = rows.reduce((acc, row) => acc + row.value, 0);
  const palette = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#64748b"];
  const colorByLabel = new Map(rows.map((row, idx) => [row.label, palette[idx % palette.length]]));

  const gradientStops =
    total === 0
      ? "#cbd5e1 0 100%"
      : rows
          .filter((row) => row.value > 0)
          .reduce<{ color: string; from: number; to: number }[]>((acc, row) => {
            const previous = acc.length === 0 ? 0 : acc[acc.length - 1].to;
            const next = previous + (row.value / total) * 100;
            acc.push({
              color: colorByLabel.get(row.label) ?? palette[0],
              from: previous,
              to: next,
            });
            return acc;
          }, [])
          .map((stop) => `${stop.color} ${stop.from}% ${stop.to}%`)
          .join(", ");

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <Panel className="dashboard-fade-up p-4">
      <SectionHeader title={title} description="Tỷ trọng dữ liệu theo phần trăm" />
      {rows.length === 0 ? (
        <EmptyState message="Chưa có dữ liệu để hiển thị." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
          <div
            className="dashboard-donut-ring mx-auto h-40 w-40 rounded-full p-4"
            style={
              {
                background: `conic-gradient(${gradientStops})`,
                "--dashboard-donut-gradient": `conic-gradient(${gradientStops})`,
              } as CSSProperties
            }
          >
            <div className="dashboard-donut-core flex h-full w-full items-center justify-center rounded-full bg-white text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Tổng</p>
                <p className="text-2xl font-semibold text-slate-900">
                  <HoverCountNumber value={total} active={isHovered} />
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {rows.map((row, idx) => {
              const ratio = total > 0 ? (row.value / total) * 100 : 0;
              return (
                <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colorByLabel.get(row.label) ?? palette[idx % palette.length] }}
                    />
                    <span className="text-sm font-medium text-slate-700">{row.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      <HoverCountNumber value={row.value} active={isHovered} />
                    </p>
                    <p className="text-xs text-slate-500">{ratio.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </Panel>
    </div>
  );
}

export function DistributionCard({
  title,
  subtitle,
  rows,
  tone = "blue",
  valueLabel,
}: DistributionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const toneStyle = toneStyles[tone];
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <Panel className="dashboard-fade-up p-4">
      <SectionHeader title={title} description={subtitle} />

      {rows.length === 0 ? (
        <EmptyState message="Chưa có dữ liệu để hiển thị." />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="space-y-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-600">{row.label}</span>
                <span className="font-semibold text-slate-900">
                  {valueLabel ? valueLabel(row.value) : <HoverCountNumber value={row.value} active={isHovered} />}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-1.5 rounded-full bg-gradient-to-r transition-[width]",
                    toneStyle.progress,
                  )}
                  style={{ width: `${(row.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      </Panel>
    </div>
  );
}

export function ActivityPanel({ cards }: { cards: StatCardItem[] }) {
  return (
    <Panel className="dashboard-fade-up p-4">
      <SectionHeader title="Hoạt động" action={<TrendingUp className="h-4 w-4 text-blue-600" />} />
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} size="small" />
        ))}
      </div>
    </Panel>
  );
}

export function RecentAttemptsTable({
  rows,
  statusRows,
}: {
  rows: AdminDashboardRecentAttempt[];
  statusRows: DistributionRow[];
}) {
  return (
    <Panel className="dashboard-fade-up p-4">
      <SectionHeader
        title="Lượt thi gần nhất"
        action={
          <div className="hidden flex-wrap gap-1.5 lg:flex">
            {statusRows.map((bucket) => (
              <span
                key={bucket.label}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
              >
                {bucket.label}: {formatNumber(bucket.value)}
              </span>
            ))}
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <div
            className={cn(
              attemptTableGridClass,
              "border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400",
            )}
          >
            <span>Học viên</span>
            <span>Đề thi</span>
            <span>Trạng thái</span>
            <span>Điểm</span>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-500">
              Chưa có dữ liệu lượt thi gần đây.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {rows.map((attempt) => (
                <div
                  key={attempt.id}
                  className={cn(
                    attemptTableGridClass,
                    "px-4 py-3.5 text-sm transition hover:bg-slate-50",
                  )}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {attempt.user?.name ?? "Không xác định"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {attempt.user?.email ?? "Không có email"}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Bắt đầu: {formatDateTime(attempt.startedAt)}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">
                      {attempt.template?.name ?? "Không xác định"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {getModeLabel(attempt.template?.mode ?? "")} · Lần {attempt.attemptNo}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {attempt.correctCount}/{attempt.totalQuestions} đúng · {formatDuration(attempt.durationSec)}
                    </p>
                  </div>

                  <div className="flex items-start">
                    <StatusBadge
                      label={getAttemptStatusLabel(attempt.status)}
                      tone={
                        attemptStatusTone[attempt.status] ??
                        "border-slate-200 bg-slate-50 text-slate-600"
                      }
                    />
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {formatScore(attempt.totalScore)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {attempt.answeredCount} câu trả lời
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function EntityListCard<T>({
  title,
  href,
  hrefLabel,
  items,
  emptyMessage,
  getKey,
  renderItem,
}: EntityListCardProps<T>) {
  return (
    <Panel className="p-4">
      <SectionHeader
        title={title}
        action={
          <Link
            href={href}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-900"
          >
            {hrefLabel}
          </Link>
        }
      />

      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          items.map((item) => <div key={getKey(item)}>{renderItem(item)}</div>)
        )}
      </div>
    </Panel>
  );
}

export function RecentUsersCard({
  items,
}: {
  items: AdminDashboardRecentUser[];
}) {
  return (
    <EntityListCard
      title="Học viên mới"
      href="/admin/users"
      hrefLabel="Mở"
      items={items}
      emptyMessage="Chưa có học viên mới."
      getKey={(item) => item.id}
      renderItem={(item) => (
        <div className="rounded-lg border border-slate-200 px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="mt-1 text-sm text-slate-500">{item.email}</p>
            </div>
            <StatusBadge
              label={getUserStatusLabel(item.status)}
              tone={
                userStatusTone[item.status] ??
                "border-slate-200 bg-slate-100 text-slate-600"
              }
            />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Tạo lúc {formatDateTime(item.createdAt)}
          </p>
        </div>
      )}
    />
  );
}

export function RecentCredentialsCard({
  items,
}: {
  items: AdminDashboardRecentCredential[];
}) {
  return (
    <EntityListCard
      title="Chứng chỉ gần nhất"
      href="/admin/certificates"
      hrefLabel="Mở"
      items={items}
      emptyMessage="Chưa có chứng chỉ mới."
      getKey={(item) => item.id}
      renderItem={(item) => (
        <div className="rounded-lg border border-slate-200 px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{item.serialNumber}</p>
              <p className="mt-1 text-sm text-slate-500">
                {item.user?.name ?? "Chưa gắn học viên"}
              </p>
            </div>
            <StatusBadge
              label={getCredentialStatusLabel(item.status)}
              tone={
                credentialStatusTone[item.status] ??
                "border-slate-200 bg-slate-100 text-slate-600"
              }
            />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Cấp lúc {formatDateTime(item.issuedAt)}
          </p>
        </div>
      )}
    />
  );
}

export function LoadingState() {
  return (
    <PageShell>
      <Panel className="p-5">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">Đang tải dữ liệu dashboard...</span>
        </div>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    </PageShell>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void | Promise<void>;
}) {
  return (
    <Panel className="border-rose-200 bg-rose-50 p-5">
      <p className="text-base font-semibold text-rose-700">
        Không tải được dữ liệu dashboard
      </p>
      <p className="mt-2 text-sm text-rose-600">{message}</p>
      <button
        type="button"
        onClick={() => {
          void onRetry();
        }}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
      >
        <RefreshCw className="h-4 w-4" />
        Tải lại
      </button>
    </Panel>
  );
}
