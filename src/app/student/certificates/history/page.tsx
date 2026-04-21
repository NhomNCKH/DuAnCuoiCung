"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Loader2, MailCheck, MailX } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";

type RegistrationItem = {
  id: string;
  status: string;
  examDate: string;
  registeredAt: string;
  confirmationSentAt: string | null;
  reminderSentAt: string | null;
  emailError?: string | null;
  template: {
    id: string;
    code: string;
    name: string;
    totalDurationSec: number;
    totalQuestions: number;
  } | null;
};

function formatDateVi(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTimeVi(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateVi(iso)} ${hh}:${mi}`;
}

function statusLabel(status: string) {
  switch (status) {
    case "registered":
      return "Đã đăng ký";
    case "cancelled":
      return "Đã hủy";
    default:
      return status || "—";
  }
}

export default function OfficialExamRegistrationHistoryPage() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RegistrationItem[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient.learner.officialExam
      .listRegistrations()
      .then((res) => {
        const data = (res as any)?.data ?? (res as any);
        setItems(((data?.items ?? []) as RegistrationItem[]) || []);
      })
      .catch((e: any) => {
        const msg = e?.message || "Không thể tải lịch sử đăng ký.";
        setError(msg);
        notify({ variant: "error", title: "Tải dữ liệu thất bại", message: msg });
      })
      .finally(() => setLoading(false));
  }, [notify]);

  const sorted = useMemo(() => {
    // BE đã DESC theo registeredAt; vẫn sort lại cho chắc
    return [...items].sort((a, b) => +new Date(b.registeredAt) - +new Date(a.registeredAt));
  }, [items]);

  return (
    <div className="w-full">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            <h1 className="heading-lg">Lịch sử đăng ký thi</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Danh sách các suất thi chứng chỉ bạn đã đăng ký từ đề thi chính thức.
          </p>
        </div>
      </div>

      {error ? (
        <div className="surface-soft rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Có lỗi.</span> {error}
        </div>
      ) : null}

      <div className="surface p-5">
        {loading ? (
          <div className="surface-soft flex items-center justify-center gap-2 rounded-xl p-6 text-sm text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Đang tải…
          </div>
        ) : sorted.length === 0 ? (
          <div className="surface-soft rounded-xl p-6 text-sm text-slate-700">
            Bạn chưa có đăng ký nào. Hãy vào trang đăng ký để chọn ngày thi.
            <div className="mt-3">
              <a href="/student/certificates/register" className="btn-primary inline-flex">
                Đăng ký thi ngay
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((r) => {
              const mailOk = Boolean(r.confirmationSentAt);
              return (
                <div key={r.id} className="surface-soft rounded-xl p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {r.template?.name ?? "Đề thi"}{" "}
                        {r.template?.code ? (
                          <span className="font-mono text-xs font-semibold text-slate-500">({r.template.code})</span>
                        ) : null}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4 text-blue-600" />
                          Ngày thi: <strong className="text-slate-900">{formatDateVi(r.examDate)}</strong>
                        </span>
                        <span className="text-slate-400">•</span>
                        <span>
                          Trạng thái: <strong className="text-slate-900">{statusLabel(r.status)}</strong>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Đăng ký lúc: <strong className="text-slate-700">{formatTimeVi(r.registeredAt)}</strong>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {mailOk ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          <MailCheck className="h-4 w-4" />
                          Đã gửi email
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          <MailX className="h-4 w-4" />
                          Chưa gửi email
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">Email xác nhận</div>
                      <div className="mt-0.5 text-slate-600">
                        {r.confirmationSentAt ? formatTimeVi(r.confirmationSentAt) : "Chưa gửi"}
                      </div>
                      {!r.confirmationSentAt && r.emailError ? (
                        <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                          Lỗi: {r.emailError}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">Email nhắc thi (07:00)</div>
                      <div className="mt-0.5 text-slate-600">
                        {r.reminderSentAt ? formatTimeVi(r.reminderSentAt) : "Chưa gửi"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

