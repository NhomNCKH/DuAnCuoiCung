"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ClipboardList, Eye, Loader2, MailCheck, MailX, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import { getSignedMediaUrl } from "@/lib/media-url";
import { useSearchParams } from "next/navigation";

type RegistrationItem = {
  id: string;
  status: string;
  examDate: string;
  registeredAt: string;
  confirmationSentAt: string | null;
  reminderSentAt: string | null;
  emailError?: string | null;
  registrationProfile?: {
    fullName?: string;
    identityNumber?: string;
    birthday?: string;
    phone?: string;
    address?: string;
    avatarUrl?: string;
    avatarS3Key?: string;
  } | null;
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

const OFFICIAL_EXAM_PENDING_PAYMENT_KEY = "official_exam_pending_payment";

type PendingPayment = {
  orderCode: number;
  examTemplateId: string;
  profile?: {
    fullName?: string;
    identityNumber?: string;
    birthday?: string;
    phone?: string;
    address?: string;
    avatarUrl?: string;
    avatarS3Key?: string;
  };
  savedAt?: string;
};

export default function OfficialExamRegistrationHistoryPage() {
  const { notify } = useToast();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RegistrationItem[]>([]);
  const [activeProfile, setActiveProfile] = useState<RegistrationItem | null>(null);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string>("");
  const paymentHandledRef = useRef(false);

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.learner.officialExam.listRegistrations();
      const data = (res as any)?.data ?? (res as any);
      setItems(((data?.items ?? []) as RegistrationItem[]) || []);
    } catch (e: any) {
      const msg = e?.message || "Không thể tải lịch sử đăng ký.";
      setError(msg);
      notify({ variant: "error", title: "Tải dữ liệu thất bại", message: msg });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  const sorted = useMemo(() => {
    // BE đã DESC theo registeredAt; vẫn sort lại cho chắc
    return [...items].sort((a, b) => +new Date(b.registeredAt) - +new Date(a.registeredAt));
  }, [items]);

  useEffect(() => {
    if (paymentHandledRef.current) return;
    paymentHandledRef.current = true;

    const finalizePaymentIfNeeded = async () => {
      const status = String(searchParams.get("status") || "").toUpperCase();
      const cancel = String(searchParams.get("cancel") || "").toLowerCase() === "true";
      const orderCode = Number(searchParams.get("orderCode") || 0);

      if (cancel) {
        notify({
          variant: "warning",
          title: "Bạn đã hủy thanh toán",
          message: "Đăng ký chưa được ghi nhận.",
        });
        return;
      }

      if (status !== "PAID") return;

      if (typeof window === "undefined") {
        notify({
          variant: "success",
          title: "Thanh toán thành công",
          message: "Vui lòng kiểm tra lịch sử đăng ký.",
        });
        return;
      }

      const raw = window.sessionStorage.getItem(OFFICIAL_EXAM_PENDING_PAYMENT_KEY);
      if (!raw) {
        notify({
          variant: "success",
          title: "Thanh toán thành công",
          message: "Không thấy phiên thanh toán tạm, vui lòng kiểm tra lịch sử đăng ký.",
        });
        return;
      }

      let pending: PendingPayment | null = null;
      try {
        pending = JSON.parse(raw) as PendingPayment;
      } catch {
        pending = null;
      }

      if (!pending?.examTemplateId) {
        notify({
          variant: "error",
          title: "Không thể chốt đăng ký",
          message: "Dữ liệu thanh toán tạm không hợp lệ.",
        });
        return;
      }

      if (pending.orderCode && orderCode && pending.orderCode !== orderCode) {
        notify({
          variant: "warning",
          title: "Mã đơn không khớp",
          message: "Hệ thống không tự động chốt đăng ký để đảm bảo an toàn dữ liệu.",
        });
        return;
      }

      try {
        const res = await apiClient.learner.officialExam.register({
          examTemplateId: pending.examTemplateId,
          profile: pending.profile,
        });
        const payload = (res as any)?.data ?? (res as any);
        notify({
          variant: "success",
          title: "Thanh toán thành công",
          message: payload?.alreadyRegistered
            ? "Bạn đã có đăng ký trước đó cho đề thi này."
            : "Đăng ký thi đã được ghi nhận.",
        });
        window.sessionStorage.removeItem(OFFICIAL_EXAM_PENDING_PAYMENT_KEY);
        await loadRegistrations();
      } catch (e: any) {
        notify({
          variant: "error",
          title: "Thanh toán thành công nhưng chốt đăng ký lỗi",
          message:
            e?.message ||
            "Vui lòng thử đăng ký lại hoặc liên hệ quản trị viên để hỗ trợ.",
        });
      }
    };

    void finalizePaymentIfNeeded();
  }, [loadRegistrations, notify, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const resolveAvatar = async () => {
      if (!activeProfile?.registrationProfile) {
        setResolvedAvatarUrl("");
        return;
      }

      const profile = activeProfile.registrationProfile;
      const s3Key = profile.avatarS3Key?.trim() || "";
      const rawUrl = profile.avatarUrl?.trim() || "";

      if (s3Key) {
        const signed = await getSignedMediaUrl(s3Key);
        if (!cancelled) {
          setResolvedAvatarUrl(signed || rawUrl);
        }
        return;
      }

      if (!cancelled) {
        setResolvedAvatarUrl(rawUrl);
      }
    };

    void resolveAvatar();
    return () => {
      cancelled = true;
    };
  }, [activeProfile]);

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
                      <button
                        type="button"
                        onClick={() => setActiveProfile(r)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Thông tin đăng ký
                      </button>
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

      {activeProfile ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => setActiveProfile(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-extrabold text-slate-900">Thông tin đăng ký</h3>
              <button
                type="button"
                onClick={() => setActiveProfile(null)}
                className="rounded-full border border-slate-200 p-1 text-slate-500 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="h-24 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {resolvedAvatarUrl ? (
                    <img
                      src={resolvedAvatarUrl}
                      alt="Ảnh hồ sơ"
                      className="h-full w-full object-cover"
                      onError={() => setResolvedAvatarUrl("")}
                    />
                  ) : (
                    <span className="text-[11px] text-slate-500">Không có ảnh</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {activeProfile.registrationProfile?.fullName || "Chưa cập nhật"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Đề thi: {activeProfile.template?.name ?? "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Số định danh</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {activeProfile.registrationProfile?.identityNumber || "Chưa cập nhật"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Ngày sinh</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {activeProfile.registrationProfile?.birthday || "Chưa cập nhật"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Số điện thoại</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {activeProfile.registrationProfile?.phone || "Chưa cập nhật"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Ngày thi</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDateVi(activeProfile.examDate)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Địa chỉ</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {activeProfile.registrationProfile?.address || "Chưa cập nhật"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

