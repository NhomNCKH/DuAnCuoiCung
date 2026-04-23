// app/admin/proctoring/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type ProctoringViolation = {
  id: string;
  userId: string;
  examId: string;
  violationType: string;
  message?: string | null;
  severity: number;
  confidence?: number;
  timestamp?: string;
  createdAt?: string;
};

type ViolationsResponseData = {
  total?: number;
  limit?: number;
  offset?: number;
  data?: ProctoringViolation[];
};

function unwrapResponse<T>(payload: unknown): T {
  const asAny = payload as any;
  if (asAny?.data?.data !== undefined) return asAny.data.data as T;
  if (asAny?.data !== undefined) return asAny.data as T;
  return asAny as T;
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

  const stats = useMemo(() => {
    const severeCount = violations.filter((item) => Number(item.severity) >= 4).length;
    const warningCount = violations.filter((item) => Number(item.severity) >= 2 && Number(item.severity) < 4).length;
    return {
      total: total || violations.length,
      severe: severeCount,
      warnings: warningCount,
    };
  }, [total, violations]);

  const fetchViolations = useCallback(async () => {
    if (!userId.trim() || !examId.trim()) {
      setError("Vui long nhap userId va examId de tra cuu.");
      setViolations([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.admin.proctoring.getViolations(userId.trim(), examId.trim(), {
        limit,
        offset,
      });

      const payload = unwrapResponse<ViolationsResponseData>(res);
      const rows = Array.isArray(payload?.data) ? payload.data : [];

      setViolations(rows);
      setTotal(Number(payload?.total) || rows.length);
    } catch (err: any) {
      setViolations([]);
      setTotal(0);
      setError(err?.message || "Khong tai duoc du lieu gian lan.");
    } finally {
      setLoading(false);
    }
  }, [examId, limit, offset, userId]);

  useEffect(() => {
    if (!userId.trim() || !examId.trim()) return;
    void fetchViolations();
  }, [fetchViolations, userId, examId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Kiem tra gian lan</h1>
        <p className="text-sm text-slate-600">
          Trang nay hien thi vi pham theo tung nguoi dung va bai thi tu endpoint `/proctoring/violations/:userId/:examId`.
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
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exam ID</span>
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong vi pham</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Muc nghiem trong (&gt;=4)</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.severe}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Muc canh bao (2-3)</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.warnings}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Thoi gian</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">User ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Exam ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Hanh vi</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Muc do</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Message</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {violations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Chua co du lieu. Nhap `userId` va `examId` roi bam "Kiem tra gian lan".
                  </td>
                </tr>
              ) : (
                violations.map((item) => {
                  const timeValue = item.timestamp || item.createdAt;
                  const severity = Number(item.severity) || 0;
                  const severityClass =
                    severity >= 4
                      ? "bg-red-100 text-red-700"
                      : severity >= 2
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-700";

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-slate-700">{timeValue ? new Date(timeValue).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item.userId}</td>
                      <td className="px-4 py-3 text-slate-700">{item.examId}</td>
                      <td className="px-4 py-3 text-slate-700">{item.violationType || "unknown"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${severityClass}`}>
                          {severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="inline-flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <span>{item.message || "(khong co message)"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
