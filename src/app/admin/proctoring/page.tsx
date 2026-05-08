// app/admin/proctoring/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { DateRange } from "react-date-range";
import { addDays, format, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { apiClient } from "@/lib/api-client";
import { AdminCard, AdminEmptyState } from "@/components/admin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { EnhancedStatCard } from "@/components/ui/EnhancedStatCard";
import { SharedTable, SharedTableBody, SharedTableHead } from "@/components/ui/shared-table";
import { SharedDropdown } from "@/components/ui/shared-dropdown";
import { useToast } from "@/hooks/useToast";

type ProctoringViolation = {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  examId: string;
  examAttemptId?: string | null;
  examName?: string | null;
  examCode?: string | null;
  violationType: string;
  message?: string | null;
  severity: number;
  confidence?: number;
  snapshotImage?: string | null;
  screenshotUrl?: string | null;
  timestamp?: string;
  createdAt?: string;
};

type ViolationGroup = {
  key: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  examId: string;
  examName: string;
  latestTime?: string;
  total: number;
  maxSeverity: number;
  violations: ProctoringViolation[];
};

type ViolationsResponseData = {
  total?: number;
  limit?: number;
  offset?: number;
  data?: ProctoringViolation[];
};

const ACTION_LABEL: Record<string, string> = {
  face_mismatch: "Danh tinh khong khop voi anh dang ky",
  face_verification_failed: "Khong xac minh duoc danh tinh",
  leaving_frame: "Roi khoi khung hinh",
  multiple_faces: "Nhieu nguoi trong khung hinh",
  phone_usage: "Su dung dien thoai",
  cheating_device: "Thiet bi/vat dung khong duoc phep",
  looking_away: "Nhin ra ngoai man hinh",
  face_occluded: "Che khuon mat",
  eye_closed: "Nham mat qua lau",
  camera_unavailable: "Khong tim thay camera",
  camera_permission_denied: "Khong co quyen truy cap camera",
  tab_switch: "Chuyen tab",
  window_blur: "Cua so bai thi mat tieu diem",
  fullscreen_exit: "Thoat toan man hinh",
  split_screen: "Chia doi man hinh",
  page_leave: "Roi khoi trang lam bai",
  context_menu: "Mo menu chuot phai",
  forbidden_key: "Dung phim tat cam",
};

function unwrapViolationsResponse(payload: unknown): ViolationsResponseData {
  const asAny = payload as any;
  const candidates = [asAny?.data, asAny];

  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "object" &&
      ("total" in candidate || "limit" in candidate || "offset" in candidate || Array.isArray(candidate.data))
    ) {
      return candidate as ViolationsResponseData;
    }
  }

  if (Array.isArray(asAny?.data?.data)) {
    return {
      data: asAny.data.data,
      total: Number(asAny.data.total) || asAny.data.data.length,
      limit: Number(asAny.data.limit) || undefined,
      offset: Number(asAny.data.offset) || undefined,
    };
  }

  if (Array.isArray(asAny)) {
    return { data: asAny, total: asAny.length };
  }

  return { data: [], total: 0 };
}

function getTimeValue(item: ProctoringViolation) {
  return item.timestamp || item.createdAt;
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN");
}

function getActionLabel(action?: string | null) {
  return ACTION_LABEL[action || ""] || action || "unknown";
}

function getSeverityClass(severity: number) {
  if (severity >= 4) return "bg-red-100 text-red-700";
  if (severity >= 2) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function groupViolations(rows: ProctoringViolation[]): ViolationGroup[] {
  const map = new Map<string, ViolationGroup>();

  for (const item of rows) {
    const key = `${item.userId}:${item.examAttemptId || item.examId}`;
    const userName = item.userName || item.userEmail || item.userId;
    const examName = item.examName || item.examCode || item.examId;
    const timeValue = getTimeValue(item);
    const severity = Number(item.severity) || 0;

    if (!map.has(key)) {
      map.set(key, {
        key,
        userId: item.userId,
        userName,
        userEmail: item.userEmail,
        examId: item.examId,
        examName,
        latestTime: timeValue,
        total: 0,
        maxSeverity: severity,
        violations: [],
      });
    }

    const group = map.get(key)!;
    group.total += 1;
    group.maxSeverity = Math.max(group.maxSeverity, severity);
    group.violations.push(item);

    const currentLatest = group.latestTime ? new Date(group.latestTime).getTime() : 0;
    const nextTime = timeValue ? new Date(timeValue).getTime() : 0;
    if (nextTime > currentLatest) {
      group.latestTime = timeValue;
    }
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      violations: group.violations.sort((a, b) => {
        const left = getTimeValue(a) ? new Date(getTimeValue(a)!).getTime() : 0;
        const right = getTimeValue(b) ? new Date(getTimeValue(b)!).getTime() : 0;
        return right - left;
      }),
    }))
    .sort((a, b) => {
      const left = a.latestTime ? new Date(a.latestTime).getTime() : 0;
      const right = b.latestTime ? new Date(b.latestTime).getTime() : 0;
      return right - left;
    });
}

export default function ProctoringAdminPage() {
  useToast();
  const [userId, setUserId] = useState("");
  const [selectedExamName, setSelectedExamName] = useState("");
  const limit = 50;
  const [offset, setOffset] = useState(0);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const todayYmd = format(new Date(), "yyyy-MM-dd");
  const [dateFrom, setDateFrom] = useState<string>(todayYmd);
  const [dateTo, setDateTo] = useState<string>(todayYmd);
  const [draftRange, setDraftRange] = useState<{
    startDate: Date;
    endDate: Date;
    key: "selection";
  }>({
    startDate: startOfDay(new Date()),
    endDate: startOfDay(new Date()),
    key: "selection",
  });

  useEffect(() => {
    if (!dateFilterOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // Đóng khi click ra ngoài popover.
      if (!target.closest("[data-date-range-popover-root]")) {
        setDateFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [dateFilterOpen]);

  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ViolationGroup | null>(null);

  const dateFilteredViolations = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    if (!from && !to) return violations;

    return violations.filter((item) => {
      const tValue = getTimeValue(item);
      if (!tValue) return false;
      const t = new Date(tValue).getTime();
      if (Number.isNaN(t)) return false;
      if (from && t < from) return false;
      if (to && t > to) return false;
      if (selectedExamName) {
        const label = (item.examName || item.examCode || "").trim();
        if (label !== selectedExamName) return false;
      }
      return true;
    });
  }, [dateFrom, dateTo, selectedExamName, violations]);

  const groups = useMemo(() => groupViolations(dateFilteredViolations), [dateFilteredViolations]);

  const stats = useMemo(() => {
    const severeCount = dateFilteredViolations.filter((item) => Number(item.severity) >= 4).length;
    const affectedCandidates = new Set(dateFilteredViolations.map((item) => item.userId)).size;
    return {
      total: total || dateFilteredViolations.length,
      cases: groups.length,
      candidates: affectedCandidates,
      severe: severeCount,
    };
  }, [dateFilteredViolations, groups.length, total]);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.admin.proctoring.listViolations({
        userId: userId.trim() || undefined,
        // Lưu ý: examId ở BE đang đại diện "phiên/lượt thi", không phải "tên đề".
        // UI dropdown lọc theo examName/examCode sẽ filter phía client.
        limit,
        offset,
      });

      const payload = unwrapViolationsResponse(res);
      const rows = Array.isArray(payload?.data) ? payload.data : [];

      setViolations(rows);
      setTotal(Number(payload?.total) || rows.length);
      setSelectedGroup(null);
    } catch (err: any) {
      setViolations([]);
      setTotal(0);
      setSelectedGroup(null);
      setError(err?.message || "Không tải được dữ liệu gian lận.");
    } finally {
      setLoading(false);
    }
  }, [limit, offset, userId]);

  // Đã bỏ thao tác xoá theo yêu cầu.

  useEffect(() => {
    void fetchViolations();
  }, [fetchViolations]);

  const totalPages = Math.max(1, Math.ceil((total || dateFilteredViolations.length) / limit));
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(offset / limit) + 1));

  const examOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of violations) {
      const label = (v.examName || v.examCode || "").trim();
      if (label) set.add(label);
    }
    return [
      { value: "", label: "Tất cả bài thi" },
      ...Array.from(set.values())
        .sort((a, b) => a.localeCompare(b, "vi"))
        .map((label) => ({ value: label, label })),
    ];
  }, [violations]);

  const activePresetKey = useMemo(() => {
    const end = startOfDay(new Date());
    const start = startOfDay(addDays(end, -6));
    const start30 = startOfDay(addDays(end, -29));
    const start60 = startOfDay(addDays(end, -59));
    const start90 = startOfDay(addDays(end, -89));

    const s = startOfDay(draftRange.startDate).getTime();
    const e = startOfDay(draftRange.endDate).getTime();
    const endMs = end.getTime();

    if (s === endMs && e === endMs) return "today";
    if (s === start.getTime() && e === endMs) return "last7";
    if (s === start30.getTime() && e === endMs) return "last30";
    if (s === start60.getTime() && e === endMs) return "last60";
    if (s === start90.getTime() && e === endMs) return "last90";
    return "custom";
  }, [draftRange.endDate, draftRange.startDate]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <EnhancedStatCard icon={AlertTriangle} label="Tổng vi phạm" value={formatNumber(stats.total)} change="" color="from-slate-600 to-slate-800" bgColor="bg-white" compact tone="red" />
        <EnhancedStatCard icon={AlertCircle} label="Hồ sơ gian lận" value={formatNumber(stats.cases)} change="" color="from-blue-500 to-indigo-600" bgColor="bg-white" compact tone="blue" />
        <EnhancedStatCard icon={Eye} label="Thí sinh ảnh hưởng" value={formatNumber(stats.candidates)} change="" color="from-emerald-500 to-teal-600" bgColor="bg-white" compact tone="green" />
        <EnhancedStatCard icon={Trash2} label="Nghiêm trọng (>=4)" value={formatNumber(stats.severe)} change="" color="from-rose-500 to-pink-600" bgColor="bg-white" compact tone="red" />
      </motion.div>

      <AdminCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="Tìm theo userId..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <SharedDropdown
            value={selectedExamName}
            onChange={(value) => {
              setSelectedExamName(value);
              setOffset(0);
            }}
            options={examOptions}
            placeholder="Tất cả bài thi"
            className="w-full min-w-[220px] lg:w-[320px]"
          />
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3"
              onClick={() => {
                setUserId("");
                setSelectedExamName("");
                setDateFrom("");
                setDateTo("");
                setDateFilterOpen(false);
                setOffset(0);
                void fetchViolations();
              }}
              disabled={loading}
              aria-label="Reset"
              title="Reset"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="relative" data-date-range-popover-root>
              <button
                type="button"
                className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 admin-dark:border-[var(--admin-border)] admin-dark:bg-[#253156] admin-dark:text-[var(--admin-text)] admin-dark:hover:bg-[var(--admin-surface-2)]"
                onClick={() => {
                  const today = new Date();
                  const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : addDays(today, -6);
                  const end = dateTo ? new Date(`${dateTo}T00:00:00`) : today;
                  const nextDraft = {
                    startDate: startOfDay(start),
                    endDate: startOfDay(end),
                    key: "selection",
                  } as const;
                  setDraftRange(nextDraft);
                  setDateFilterOpen((prev) => !prev);
                }}
                disabled={loading}
                aria-label="Chọn khoảng ngày"
                title="Chọn khoảng ngày"
              >
                <CalendarDays className="h-4 w-4 text-slate-500 admin-dark:text-[var(--admin-muted)]" />
                <span className="whitespace-nowrap">
                  {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "Tất cả thời gian"}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform admin-dark:text-[var(--admin-muted)] ${dateFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {dateFilterOpen ? (
                <div className="absolute right-0 top-full z-[120] mt-2 w-[760px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
                  <div className="flex">
                      <div className="w-[220px] border-r border-slate-200 px-4 py-4 admin-dark:border-[var(--admin-border)]">
                      <div className="flex flex-col items-start gap-1.5">
                        {[
                        { key: "today", label: "Today", days: 0 },
                        { key: "last7", label: "Last 7 days", days: 6 },
                        { key: "last30", label: "Last 30 days", days: 29 },
                        { key: "last60", label: "Last 60 days", days: 59 },
                        { key: "last90", label: "Last 90 days", days: 89 },
                        ].map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            className={`proctoring-date-preset rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                              activePresetKey === p.key ? "proctoring-date-preset--active" : ""
                            }`}
                            onClick={() => {
                              const end = startOfDay(new Date());
                              const start = startOfDay(addDays(end, -p.days));
                              setDraftRange({ startDate: start, endDate: end, key: "selection" });
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col px-3 pt-3">
                      <div className="proctoring-date-range min-w-0 flex-1 text-sm">
                        <DateRange
                          ranges={[draftRange]}
                          onChange={(item: any) => {
                            const next = item.selection;
                            if (!next?.startDate || !next?.endDate) return;
                            setDraftRange({
                              startDate: startOfDay(next.startDate),
                              endDate: startOfDay(next.endDate),
                              key: "selection",
                            });
                          }}
                          months={2}
                          direction="horizontal"
                          showDateDisplay={false}
                          showMonthAndYearPickers={false}
                          showMonthArrow
                          weekStartsOn={1}
                          weekdayDisplayFormat="EEE"
                          locale={enUS}
                          rangeColors={["#f7bc2f"]}
                          monthDisplayFormat="MMMM yyyy"
                          moveRangeOnFirstSelection={false}
                        />
                      </div>

                      <div className="flex justify-end border-t border-slate-100 bg-white px-3 py-3 admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center rounded-xl bg-[#f7bc2f] px-5 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:brightness-[0.98] active:scale-[0.99] admin-dark:text-[#1b2542]"
                          onClick={() => {
                            setDateFrom(format(draftRange.startDate, "yyyy-MM-dd"));
                            setDateTo(format(draftRange.endDate, "yyyy-MM-dd"));
                            setDateFilterOpen(false);
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void fetchViolations()}
              disabled={loading}
            >
              <Search className="h-4 w-4" />
              {loading ? "Đang tải..." : "Tìm kiếm"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">
              <p className="font-semibold">Có lỗi</p>
              <p className="mt-0.5 break-words">{error}</p>
            </div>
            <button type="button" onClick={() => void fetchViolations()} className="ml-auto text-sm underline">
              Thử lại
            </button>
          </div>
        ) : null}
      </AdminCard>

      {loading ? (
        <div className="flex items-center justify-center py-14 text-slate-600">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Đang tải dữ liệu...
        </div>
      ) : groups.length === 0 ? (
        <AdminEmptyState
          icon={AlertTriangle}
          title="Chưa có dữ liệu gian lận"
          description="Thử nhập bộ lọc hoặc bấm Làm mới để tải lại."
          action={
            <button type="button" className="btn-primary" onClick={() => void fetchViolations()}>
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <SharedTable className="text-sm">
              <SharedTableHead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Thời gian</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Thí sinh</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Bài thi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Vi phạm</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Thao tác</th>
                </tr>
              </SharedTableHead>
              <SharedTableBody>
                {groups.map((group) => (
                  <tr key={group.key} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3 align-top text-slate-700">{formatTime(group.latestTime)}</td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-semibold text-slate-800">{group.userName}</p>
                      {group.userEmail ? <p className="text-xs text-slate-500">{group.userEmail}</p> : null}
                      <p className="text-xs text-slate-400">{group.userId}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-semibold text-slate-800">{group.examName}</p>
                      <p className="text-xs text-slate-400">{group.examId}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Có, {group.total} vi phạm
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedGroup(group)}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </SharedTableBody>
            </SharedTable>
          </div>

          <AdminPagination
            className="border-t border-slate-100"
            page={currentPage}
            totalPages={totalPages}
            total={total || violations.length}
            limit={limit}
            onPageChange={(page) => setOffset((page - 1) * limit)}
            itemLabel="vi phạm"
          />
        </div>
      )}

      {selectedGroup ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px]"
            onClick={() => setSelectedGroup(null)}
            aria-label="close violation details"
          />
          <div className="surface relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">Chi tiết hành vi gian lận</h2>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {selectedGroup.userName} · {selectedGroup.examName}
                </p>
                <p className="mt-1 text-xs text-slate-400">Tổng số vi phạm: {selectedGroup.total}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Đóng chi tiết"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <div className="grid gap-4">
                {selectedGroup.violations.map((violation) => {
                  const severity = Number(violation.severity) || 0;
                  const imageUrl = violation.screenshotUrl || violation.snapshotImage || "";

                  return (
                    <div key={violation.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {imageUrl ? (
                            <img src={imageUrl} alt="Ảnh chụp vi phạm" className="h-44 w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-44 items-center justify-center px-4 text-center text-sm text-slate-500">
                              Chưa có ảnh chụp màn hình
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {getActionLabel(violation.violationType)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClass(severity)}`}>
                              Mức độ {severity}
                            </span>
                            {typeof violation.confidence === "number" ? (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                Tin cậy {Math.round(violation.confidence * 100)}%
                              </span>
                            ) : null}
                          </div>

                          <dl className="grid gap-3 text-sm md:grid-cols-2">
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời gian</dt>
                              <dd className="mt-1 text-slate-900">{formatTime(getTimeValue(violation))}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hành vi</dt>
                              <dd className="mt-1 text-slate-900">{getActionLabel(violation.violationType)}</dd>
                            </div>
                            <div className="md:col-span-2">
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thông điệp</dt>
                              <dd className="mt-1 rounded-xl bg-slate-50 px-3 py-2 text-slate-800">
                                {violation.message || "—"}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
