"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Award, CalendarDays, FileText, Loader2, AlertCircle, User, X, UploadCloud } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SharedDropdown } from "@/components/ui/shared-dropdown";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getSignedMediaUrl } from "@/lib/media-url";

type SessionTemplate = {
  id: string;
  code: string;
  name: string;
  totalDurationSec: number;
  totalQuestions: number;
};

type SessionsResponse = {
  dates: Array<{
    date: string; // yyyy-mm-dd
    sessions: Array<{
      examDate: string; // ISO
      template: SessionTemplate;
    }>;
  }>;
};

type CertificateProfileForm = {
  fullName: string;
  identityNumber: string;
  birthday: string;
  phone: string;
  address: string;
  avatarUrl: string;
  avatarS3Key: string;
};

function formatDateViFromKey(key: string) {
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return `${d}/${m}/${y}`;
}

function formatDurationMin(sec: number) {
  const n = Math.round((sec ?? 0) / 60);
  return `${n} phút`;
}

function formatCurrencyVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

const OFFICIAL_EXAM_PENDING_PAYMENT_KEY = "official_exam_pending_payment";

export default function RegisterCertificateExamPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingExistingRegistration, setCheckingExistingRegistration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SessionsResponse | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalStep, setProfileModalStep] = useState<"profile" | "confirm">("profile");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileForm, setProfileForm] = useState<CertificateProfileForm>({
    fullName: "",
    identityNumber: "",
    birthday: "",
    phone: "",
    address: "",
    avatarUrl: "",
    avatarS3Key: "",
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const examFeeVnd = 10_000;

  useEffect(() => {
    setLoading(true);
    setError(null);

    apiClient.learner.officialExam
      .listSessions()
      .then((res) => {
        const data = (res as any)?.data ?? (res as any);
        setPayload(data as SessionsResponse);
        const first = (data?.dates?.[0]?.date as string | undefined) ?? "";
        setSelectedDateKey(first);
      })
      .catch((e: any) => setError(e?.message || "Không thể tải danh sách ngày thi."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setProfileForm((prev) => ({
      ...prev,
      fullName: (user?.name as string) || "",
      birthday: (user?.birthday as string) || "",
      phone: (user?.phone as string) || "",
      address: (user?.address as string) || "",
      avatarUrl: (user?.avatarUrl as string) || "",
      avatarS3Key: (user?.avatarS3Key as string) || "",
    }));
  }, [
    user?.address,
    user?.avatarS3Key,
    user?.avatarUrl,
    user?.birthday,
    user?.name,
    user?.phone,
  ]);

  useEffect(() => {
    let cancelled = false;

    const resolveAvatarPreview = async () => {
      const rawUrl = profileForm.avatarUrl?.trim() || "";
      const s3Key = profileForm.avatarS3Key?.trim() || "";

      if (s3Key) {
        const signedUrl = await getSignedMediaUrl(s3Key);
        if (!cancelled) {
          setAvatarPreviewUrl(signedUrl || rawUrl);
        }
        return;
      }

      if (!cancelled) {
        setAvatarPreviewUrl(rawUrl);
      }
    };

    void resolveAvatarPreview();
    return () => {
      cancelled = true;
    };
  }, [profileForm.avatarS3Key, profileForm.avatarUrl]);

  const dateOptions = useMemo(() => {
    return (payload?.dates ?? []).map((d) => ({
      value: d.date,
      label: `${formatDateViFromKey(d.date)} (${d.sessions.length} đề)`,
    }));
  }, [payload]);

  const selectedSessions = useMemo(() => {
    const dates = payload?.dates ?? [];
    return dates.find((d) => d.date === selectedDateKey)?.sessions ?? [];
  }, [payload, selectedDateKey]);

  const templateOptions = useMemo(() => {
    return selectedSessions.map((s) => {
      const t = s.template;
      return {
        value: t.id,
        label: `${t.code} — ${t.name} · ${formatDurationMin(t.totalDurationSec)} · ${t.totalQuestions} câu`,
      };
    });
  }, [selectedSessions]);

  const selectedTemplate = useMemo(() => {
    for (const s of selectedSessions) {
      if (s.template.id === selectedTemplateId) return s.template;
    }
    return null;
  }, [selectedSessions, selectedTemplateId]);

  const validateProfileForm = () => {
    if (!profileForm.fullName.trim()) return "Vui lòng nhập họ và tên.";
    if (!profileForm.identityNumber.trim()) return "Vui lòng nhập số định danh/CMND/CCCD.";
    if (!profileForm.birthday.trim()) return "Vui lòng chọn ngày sinh.";
    if (!profileForm.phone.trim()) return "Vui lòng nhập số điện thoại.";
    if (!profileForm.address.trim()) return "Vui lòng nhập địa chỉ liên hệ.";
    if (!profileForm.avatarUrl.trim()) return "Vui lòng tải ảnh chân dung.";
    return null;
  };

  const createPaymentLink = async () => {
    if (!selectedTemplateId) return;
    setSubmitting(true);
    setError(null);
    try {
      const profilePayload = {
        fullName: profileForm.fullName.trim(),
        identityNumber: profileForm.identityNumber.trim(),
        birthday: profileForm.birthday.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
        avatarUrl: profileForm.avatarUrl.trim(),
        avatarS3Key: profileForm.avatarS3Key.trim(),
      };
      const res = await apiClient.learner.officialExam.createPaymentLink({
        examTemplateId: selectedTemplateId,
        profile: profilePayload,
      });
      const data = (res as any)?.data ?? (res as any);
      const checkoutUrl = data?.checkoutUrl ? String(data.checkoutUrl) : "";
      const orderCode = Number(data?.orderCode || 0);

      if (data?.alreadyRegistered) {
        notify({
          variant: "info",
          title: "Bạn đã đăng ký đề thi này",
          message: "Hệ thống không tạo thanh toán mới cho đề đã đăng ký.",
          durationMs: 3500,
        });
        setProfileModalOpen(false);
        setProfileModalStep("profile");
        return;
      }

      if (!checkoutUrl) {
        throw new Error("Không nhận được link thanh toán từ PayOS.");
      }

      if (typeof window !== "undefined" && orderCode > 0) {
        window.sessionStorage.setItem(
          OFFICIAL_EXAM_PENDING_PAYMENT_KEY,
          JSON.stringify({
            orderCode,
            examTemplateId: selectedTemplateId,
            profile: profilePayload,
            savedAt: new Date().toISOString(),
          }),
        );
      }

      window.location.href = checkoutUrl;
    } catch (e: any) {
      setError(e?.message || "Tạo thanh toán thất bại. Vui lòng thử lại.");
      notify({
        variant: "error",
        title: "Không thể chuyển tới PayOS",
        message: e?.message || "Vui lòng thử lại.",
        durationMs: 4500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenConfirmModal = async () => {
    if (!selectedTemplateId) return;
    setCheckingExistingRegistration(true);
    setProfileError(null);
    try {
      const res = await apiClient.learner.officialExam.listRegistrations();
      const payload = (res as any)?.data ?? (res as any);
      const registrations = Array.isArray(payload?.items)
        ? payload.items
        : [];
      const existing = registrations.find(
        (item: any) =>
          item?.status === "registered" &&
          item?.template?.id === selectedTemplateId,
      );

      if (existing) {
        const dateLabel = selectedDateKey
          ? formatDateViFromKey(selectedDateKey)
          : null;
        notify({
          variant: "info",
          title: "Bạn đã đăng ký đề thi này",
          message: dateLabel
            ? `Suất thi ngày ${dateLabel} đã được đăng ký trước đó.`
            : "Bạn đã đăng ký suất thi này trước đó.",
          durationMs: 3500,
        });
        return;
      }

      setProfileModalStep("profile");
      setProfileModalOpen(true);
    } catch {
      // Nếu check fail thì vẫn cho mở modal để không chặn luồng đăng ký.
      setProfileModalStep("profile");
      setProfileModalOpen(true);
    } finally {
      setCheckingExistingRegistration(false);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    setProfileError(null);
    try {
      const uploaded = await apiClient.auth.uploadAvatar(file);
      const avatarUrl =
        (uploaded as any)?.data?.data?.avatarUrl ??
        (uploaded as any)?.data?.avatarUrl ??
        null;
      const avatarS3Key =
        (uploaded as any)?.data?.data?.s3Key ??
        (uploaded as any)?.data?.s3Key ??
        "";
      if (!avatarUrl) {
        throw new Error("Không nhận được đường dẫn ảnh sau khi upload.");
      }
      setProfileForm((prev) => ({
        ...prev,
        avatarUrl: String(avatarUrl),
        avatarS3Key: String(avatarS3Key || ""),
      }));
    } catch (e: any) {
      setProfileError(e?.message || "Upload ảnh thất bại. Vui lòng thử lại.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleContinueToConfirm = async () => {
    const validationError = validateProfileForm();
    if (validationError) {
      setProfileError(validationError);
      return;
    }

    setProfileSubmitting(true);
    setProfileError(null);
    try {
      await apiClient.auth.updateMe({
        name: profileForm.fullName.trim(),
        phone: profileForm.phone.trim(),
        birthday: profileForm.birthday.trim(),
        address: profileForm.address.trim(),
      });
      setProfileModalStep("confirm");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setProfileModalStep("profile");
    setProfileError(null);
  };

  return (
    <div className="w-full space-y-5">
      <div className="surface rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              Đăng ký thi chứng chỉ
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Chọn ngày thi đã được thiết lập trong đề thi chính thức. Email xác nhận sẽ được gửi ngay, và 07:00 sáng
              ngày thi hệ thống sẽ nhắc bạn.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="surface-soft rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="surface rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="surface-soft rounded-xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <User className="h-4 w-4 text-blue-600" />
              Thí sinh
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{user?.name || "—"}</p>
            <p className="mt-0.5 text-sm text-slate-600">{user?.email || "—"}</p>
          </div>

          <div className="surface-soft rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-700">Lưu ý</p>
            <p className="mt-2 text-sm text-yellow-700">
              Sau khi đăng ký, hệ thống gửi email xác nhận ngay. Đến đúng ngày thi, lúc <strong>07:00</strong> sáng sẽ
              gửi email nhắc thi.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Chọn ngày thi
            </p>
            {loading ? (
              <div className="surface-soft flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Đang tải…
              </div>
            ) : (
              <SharedDropdown
                value={selectedDateKey}
                options={dateOptions}
                onChange={(v) => {
                  setSelectedDateKey(v);
                  setSelectedTemplateId("");
                }}
                placeholder={(payload?.dates?.length ?? 0) === 0 ? "Chưa có ngày thi" : "Chọn ngày thi"}
                disabled={(payload?.dates?.length ?? 0) === 0}
              />
            )}
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-blue-600" />
              Chọn đề thi
            </p>
            <SharedDropdown
              value={selectedTemplateId}
              options={templateOptions}
              onChange={(v) => setSelectedTemplateId(v)}
              placeholder={selectedSessions.length === 0 ? "Chọn ngày thi trước" : "Chọn đề thi"}
              disabled={selectedSessions.length === 0}
            />
          </div>
        </div>

        {selectedTemplate && (
          <div className="surface-soft mt-4 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Đề đã chọn</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {selectedTemplate.name}{" "}
              <span className="font-mono text-xs font-bold text-slate-500">({selectedTemplate.code})</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDurationMin(selectedTemplate.totalDurationSec)} · {selectedTemplate.totalQuestions} câu
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSelectedTemplateId("")}
            disabled={submitting}
          >
            Bỏ chọn
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleOpenConfirmModal()}
            disabled={
              !selectedTemplateId ||
              submitting ||
              profileSubmitting ||
              checkingExistingRegistration
            }
          >
            {checkingExistingRegistration
              ? "Đang kiểm tra…"
              : submitting
                ? "Đang xử lý…"
                : "Xác nhận đăng ký"}
          </button>
        </div>
      </div>

      {profileModalOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() =>
            !profileSubmitting &&
            !avatarUploading &&
            !submitting &&
            closeProfileModal()
          }
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Hoàn thiện thông tin đăng ký thi chứng chỉ
                </h3>
                <div className="mt-3 px-1">
                  <div className="grid grid-cols-2">
                    {[
                      {
                        index: 1,
                        label: "Thông tin đăng ký",
                        active: profileModalStep === "profile",
                      },
                      {
                        index: 2,
                        label: "Xác nhận thông tin đăng ký",
                        active: profileModalStep === "confirm",
                      },
                    ].map((step, idx, arr) => {
                      const completed = profileModalStep === "confirm" && step.index < 2;
                      return (
                      <div key={step.index} className="relative flex flex-col items-center">
                        {idx < arr.length - 1 ? (
                          <span
                            className={`absolute left-1/2 top-[14px] h-[3px] w-full ${
                              profileModalStep === "confirm"
                                ? "bg-blue-500"
                                : "bg-slate-200"
                            }`}
                          />
                        ) : null}
                        <span
                          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                            completed
                              ? "border-blue-600 bg-blue-600 text-white"
                              : step.active
                                ? "border-blue-500 bg-white text-blue-600"
                              : "border-slate-300 bg-white text-slate-400"
                          }`}
                        >
                          {step.index}
                        </span>
                        <span
                          className={`mt-2 text-center text-[11px] leading-4 ${
                            completed
                              ? "font-extrabold text-blue-700"
                              : step.active
                                ? "font-bold text-blue-700"
                                : "font-semibold text-slate-500"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-1 text-slate-500 hover:text-slate-700"
                onClick={closeProfileModal}
                disabled={profileSubmitting || avatarUploading || submitting}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {profileModalStep === "profile" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ảnh chân dung</p>
                    <div className="flex h-[220px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {avatarPreviewUrl ? (
                        <img
                          src={avatarPreviewUrl}
                          alt="Avatar chứng chỉ"
                          className="h-full w-full object-cover"
                          onError={() => setAvatarPreviewUrl("")}
                        />
                      ) : (
                        <span className="text-xs text-slate-500">Chưa có ảnh</span>
                      )}
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleUploadAvatar(file);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary w-full text-sm"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading || profileSubmitting}
                    >
                      <UploadCloud className="h-4 w-4" />
                      {avatarUploading ? "Đang upload..." : "Tải ảnh lên"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Họ và tên</span>
                      <input
                        value={profileForm.fullName}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        placeholder="Nguyễn Văn A"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Số định danh</span>
                      <input
                        value={profileForm.identityNumber}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, identityNumber: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        placeholder="CCCD/CMND"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày sinh</span>
                      <input
                        type="date"
                        value={profileForm.birthday}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, birthday: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Số điện thoại</span>
                      <input
                        value={profileForm.phone}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        placeholder="09xxxxxxxx"
                      />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Địa chỉ liên hệ</span>
                      <input
                        value={profileForm.address}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, address: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">Xác nhận thông tin đăng ký</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Họ và tên</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{profileForm.fullName || "—"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Số định danh</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{profileForm.identityNumber || "—"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Ngày sinh</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{profileForm.birthday || "—"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Số điện thoại</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{profileForm.phone || "—"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:col-span-2">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Địa chỉ liên hệ</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{profileForm.address || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-bold text-blue-900">Lệ phí thi</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-blue-800">
                        {selectedTemplate ? `${selectedTemplate.code} - ${selectedTemplate.name}` : "Lệ phí đăng ký thi"}
                      </p>
                      <p className="text-lg font-extrabold text-blue-700">{formatCurrencyVnd(examFeeVnd)}</p>
                    </div>
                  </div>
                </div>
              )}

              {profileError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {profileError}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (profileModalStep === "confirm") {
                    setProfileModalStep("profile");
                    return;
                  }
                  closeProfileModal();
                }}
                disabled={profileSubmitting || avatarUploading || submitting}
              >
                {profileModalStep === "confirm" ? "Quay lại" : "Đóng"}
              </button>
              {profileModalStep === "profile" ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void handleContinueToConfirm()}
                  disabled={profileSubmitting || avatarUploading}
                >
                  {profileSubmitting ? "Đang xử lý…" : "Xác nhận thông tin"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void createPaymentLink()}
                  disabled={submitting || profileSubmitting}
                >
                  {submitting ? "Đang chuyển PayOS…" : "Thanh toán"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

