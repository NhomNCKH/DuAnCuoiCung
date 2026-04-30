// app/admin/proctoring/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Eye, RefreshCw, Search, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";

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
  leaving_frame: "Roi khoi khung hinh",
  multiple_faces: "Nhieu nguoi trong khung hinh",
  phone_usage: "Su dung dien thoai",
  cheating_device: "Thiet bi/vat dung khong duoc phep",
  looking_away: "Nhin ra ngoai man hinh",
  face_occluded: "Che khuon mat",
  eye_closed: "Nham mat qua lau",
  camera_unavailable: "Khong tim thay camera",
  camera_permission_denied: "Khong co quyen truy cap camera",
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
  const [userId, setUserId] = useState("");
  const [examId, setExamId] = useState("");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ViolationGroup | null>(null);

  const groups = useMemo(() => groupViolations(violations), [violations]);

  const stats = useMemo(() => {
    const severeCount = violations.filter((item) => Number(item.severity) >= 4).length;
    const affectedCandidates = new Set(violations.map((item) => item.userId)).size;
    return {
      total: total || violations.length,
      cases: groups.length,
      candidates: affectedCandidates,
      severe: severeCount,
    };
  }, [groups.length, total, violations]);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.admin.proctoring.listViolations({
        userId: userId.trim() || undefined,
        examId: examId.trim() || undefined,
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
      setError(err?.message || "Khong tai duoc du lieu gian lan.");
    } finally {
      setLoading(false);
    }
  }, [examId, limit, offset, userId]);

  useEffect(() => {
    void fetchViolations();
  }, [fetchViolations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Kiem tra gian lan</h1>
        <p className="text-sm text-slate-600">
          Danh sach tong quan gom theo nguoi thi va bai thi. Bam xem chi tiet de xem tung hanh vi vi pham.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">User ID</span>
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="Nhap userId"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exam/Attempt ID</span>
            <input
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
              placeholder="Nhap examId"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Limit</span>
            <input
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(event) => setLimit(Math.max(1, Number(event.target.value) || 1))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offset</span>
            <input
              type="number"
              min={0}
              value={offset}
              onChange={(event) => setOffset(Math.max(0, Number(event.target.value) || 0))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => void fetchViolations()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {loading ? "Dang tai..." : "Kiem tra gian lan"}
          </button>

          <button
            onClick={() => {
              setUserId("");
              setExamId("");
              setOffset(0);
              setViolations([]);
              setTotal(0);
              setSelectedGroup(null);
              setError(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong vi pham</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ho so gian lan</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{stats.cases}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nguoi thi bi anh huong</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.candidates}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Muc nghiem trong</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.severe}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Thoi gian</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Ten nguoi thi</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Ten bai thi</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Co hanh vi gian lan</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Xem chi tiet</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Chua co du lieu gian lan.
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.key} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{formatTime(group.latestTime)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{group.userName}</div>
                      {group.userEmail ? <div className="text-xs text-slate-500">{group.userEmail}</div> : null}
                      <div className="text-xs text-slate-400">{group.userId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{group.examName}</div>
                      <div className="text-xs text-slate-400">{group.examId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Co, {group.total} vi pham
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedGroup(group)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                        Xem chi tiet
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Chi tiet hanh vi gian lan</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedGroup.userName} - {selectedGroup.examName}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Tong so vi pham: {selectedGroup.total}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Dong chi tiet"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <div className="grid gap-4">
                {selectedGroup.violations.map((violation) => {
                  const severity = Number(violation.severity) || 0;
                  return (
                    <div key={violation.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {violation.screenshotUrl || violation.snapshotImage ? (
                            <img
                              src={violation.screenshotUrl || violation.snapshotImage || ""}
                              alt="Anh chup hanh vi vi pham"
                              className="h-40 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-slate-500">
                              Chua co anh chup man hinh cho vi pham nay
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {getActionLabel(violation.violationType)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClass(severity)}`}>
                              Muc do {severity}
                            </span>
                            {typeof violation.confidence === "number" ? (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                Tin cay {Math.round(violation.confidence * 100)}%
                              </span>
                            ) : null}
                          </div>

                          <dl className="grid gap-3 text-sm md:grid-cols-2">
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vao luc</dt>
                              <dd className="mt-1 text-slate-900">{formatTime(getTimeValue(violation))}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hanh vi</dt>
                              <dd className="mt-1 text-slate-900">{getActionLabel(violation.violationType)}</dd>
                            </div>
                            <div className="md:col-span-2">
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</dt>
                              <dd className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-slate-800">
                                {violation.message || "(khong co message)"}
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
