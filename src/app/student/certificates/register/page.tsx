"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, CalendarDays, FileText, Loader2, AlertCircle, User } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SharedDropdown } from "@/components/ui/shared-dropdown";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

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

function formatDateViFromKey(key: string) {
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return `${d}/${m}/${y}`;
}

function formatDurationMin(sec: number) {
  const n = Math.round((sec ?? 0) / 60);
  return `${n} phút`;
}

export default function RegisterCertificateExamPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SessionsResponse | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

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

  const handleRegister = async () => {
    if (!selectedTemplateId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.learner.officialExam.register({
        examTemplateId: selectedTemplateId,
      });
      const data = (res as any)?.data ?? (res as any);
      const examDateIso = data?.examDate ? String(data.examDate) : null;
      const dateLabel = selectedDateKey ? formatDateViFromKey(selectedDateKey) : "";
      const emailSent = Boolean(data?.emailSent);

      if (data?.alreadyRegistered) {
        notify({
          variant: "info",
          title: "Bạn đã đăng ký trước đó",
          message: dateLabel ? `Suất thi ngày ${dateLabel} đã được đăng ký.` : undefined,
          durationMs: 3500,
        });
        return;
      }

      if (emailSent) {
        notify({
          variant: "success",
          title: "Đăng ký thành công",
          message: dateLabel
            ? `Bạn đã chọn ngày thi ${dateLabel}. Email xác nhận đã được gửi.`
            : "Email xác nhận đã được gửi.",
          durationMs: 4000,
        });
      } else {
        notify({
          variant: "warning",
          title: "Đăng ký thành công (chưa gửi được email)",
          message:
            (data?.emailError ? String(data.emailError) : null) ??
            (examDateIso
              ? "Hệ thống chưa gửi được email xác nhận do lỗi SMTP. Bạn vẫn đã đăng ký thành công."
              : "Bạn vẫn đã đăng ký thành công, nhưng email xác nhận chưa gửi được."),
          durationMs: 6000,
        });
      }
    } catch (e: any) {
      setError(e?.message || "Đăng ký thất bại. Vui lòng thử lại.");
      notify({
        variant: "error",
        title: "Đăng ký thất bại",
        message: e?.message || "Vui lòng thử lại.",
        durationMs: 4500,
      });
    } finally {
      setSubmitting(false);
    }
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
            onClick={handleRegister}
            disabled={!selectedTemplateId || submitting}
          >
            {submitting ? "Đang xử lý…" : "Xác nhận đăng ký"}
          </button>
        </div>
      </div>

    </div>
  );
}

