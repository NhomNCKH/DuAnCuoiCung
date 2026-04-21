"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  X,
  CalendarDays,
  GraduationCap,
  User,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SharedDropdown } from "@/components/ui/shared-dropdown";
import { Button } from "@/components/ui/Button";

type UserLite = { name?: string; email?: string } | null | undefined;

type Props = {
  open: boolean;
  onClose: () => void;
  user: UserLite;
  isSubmitting: boolean;
  onConfirm: (examTemplateId: string) => void | Promise<void>;
};

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
  // key: yyyy-mm-dd
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return `${d}/${m}/${y}`;
}

function formatDurationMin(sec: number) {
  const n = Math.round((sec ?? 0) / 60);
  return `${n} phút`;
}

export function ExamRegistrationModal({
  open,
  onClose,
  user,
  isSubmitting,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SessionsResponse | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);
    setPayload(null);
    setSelectedDateKey("");
    setSelectedTemplateId("");

    apiClient.learner.officialExam
      .listSessions()
      .then((res) => {
        const data = (res as any)?.data ?? (res as any);
        setPayload(data as SessionsResponse);
        const first = (data?.dates?.[0]?.date as string | undefined) ?? "";
        setSelectedDateKey(first);
      })
      .catch((e: any) => {
        setError(e?.message || "Không thể tải danh sách ngày thi.");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const selectedSessions = useMemo(() => {
    const dates = payload?.dates ?? [];
    return dates.find((d) => d.date === selectedDateKey)?.sessions ?? [];
  }, [payload, selectedDateKey]);

  const selectedTemplate = useMemo(() => {
    const sessions = selectedSessions;
    for (const s of sessions) {
      if (s.template.id === selectedTemplateId) return s;
    }
    return null;
  }, [selectedSessions, selectedTemplateId]);

  const dateOptions = useMemo(() => {
    return (payload?.dates ?? []).map((d) => ({
      value: d.date,
      label: `${formatDateViFromKey(d.date)} (${d.sessions.length} đề)`,
    }));
  }, [payload]);

  const templateOptions = useMemo(() => {
    return selectedSessions.map((s) => {
      const t = s.template;
      return {
        value: t.id,
        label: `${t.code} — ${t.name} · ${formatDurationMin(t.totalDurationSec)} · ${t.totalQuestions} câu`,
      };
    });
  }, [selectedSessions]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3, damping: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                  <Award className="h-6 w-6" />
                  Đăng ký thi chứng chỉ
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-white/90">
                Chọn ngày thi đã được thiết lập trong đề thi chính thức.
              </p>
            </div>

            <div className="p-6">
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">
                    Chọn ngày thi → Chọn đề → Xác nhận
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Email xác nhận gửi ngay. 07:00 sáng ngày thi hệ thống sẽ nhắc bạn.
                  </p>
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
                <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <User className="h-4 w-4 text-blue-600" />
                  Thông tin thí sinh
                </h5>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Họ và tên
                    </p>
                    <p className="mt-1 truncate font-semibold text-slate-900">{user?.name || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Email
                    </p>
                    <p className="mt-1 truncate font-semibold text-slate-900">{user?.email || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  Chọn ngày thi
                </div>

                {loading && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    Đang tải danh sách ngày thi…
                  </div>
                )}

                {!loading && error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                {!loading && !error && (payload?.dates?.length ?? 0) === 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    Hiện chưa có ngày thi nào được mở.
                  </div>
                )}

                {!loading && !error && (payload?.dates?.length ?? 0) > 0 && (
                  <SharedDropdown
                    value={selectedDateKey}
                    options={dateOptions}
                    onChange={(v) => {
                      setSelectedDateKey(v);
                      setSelectedTemplateId("");
                    }}
                    placeholder="Chọn ngày thi"
                  />
                )}
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Chọn đề thi trong ngày
                </div>

                <SharedDropdown
                  value={selectedTemplateId}
                  options={templateOptions}
                  onChange={(v) => setSelectedTemplateId(v)}
                  placeholder={
                    selectedSessions.length === 0
                      ? "Chọn ngày thi trước"
                      : "Chọn đề thi"
                  }
                  disabled={selectedSessions.length === 0}
                />

                {selectedTemplate && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-700">
                      Bạn đang chọn:
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedTemplate.template.name}{" "}
                      <span className="font-mono text-xs font-bold text-slate-500">
                        ({selectedTemplate.template.code})
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="mb-1 text-sm font-semibold text-amber-800">
                      Lưu ý quan trọng
                    </p>
                    <p className="text-xs text-amber-700">
                      Sau khi đăng ký, hệ thống sẽ gửi email xác nhận ngay. Đến đúng ngày thi, lúc <strong>07:00</strong> sáng hệ thống sẽ gửi email nhắc thi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isSubmitting}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                loading={isSubmitting}
                disabled={!selectedTemplateId || isSubmitting}
                onClick={() => {
                  if (!selectedTemplateId) return;
                  void onConfirm(selectedTemplateId);
                }}
              >
                Xác nhận đăng ký
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
