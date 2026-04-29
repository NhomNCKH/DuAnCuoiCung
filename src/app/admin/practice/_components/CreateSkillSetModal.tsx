"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";

type Skill = "speaking" | "writing";

const LEVELS = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "expert", label: "Expert" },
];

export function CreateSkillSetModal({
  open,
  onClose,
  skill,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  skill: Skill;
  onCreated: (setId: string) => void;
}) {
  const { notify } = useToast();
  const title = useMemo(() => (skill === "speaking" ? "Tạo bộ đề Speaking" : "Tạo bộ đề Writing"), [skill]);

  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [setTitle, setSetTitle] = useState("");
  const [level, setLevel] = useState("medium");
  const [timeLimitSec, setTimeLimitSec] = useState<string>("");

  async function create() {
    const payload: any = {
      code: code.trim() || undefined,
      title: setTitle.trim() || undefined,
      level,
      status: "draft",
      timeLimitSec: timeLimitSec ? Number(timeLimitSec) : undefined,
    };

    if (!payload.title) {
      notify({ variant: "warning", title: "Thiếu thông tin", message: "Nhập tiêu đề." });
      return;
    }

    setSaving(true);
    try {
      const res: any =
        skill === "speaking"
          ? await apiClient.admin.skillTasks.createSpeakingSet(payload)
          : await apiClient.admin.skillTasks.createWritingSet(payload);
      const created = res?.data ?? res;
      const id = created?.id;
      if (!id) throw new Error("Không nhận được id bộ đề.");
      notify({ variant: "success", title: "Đã tạo", message: "Tạo bộ đề thành công." });
      onClose();
      onCreated(String(id));
    } catch (e: any) {
      notify({ variant: "error", title: "Tạo thất bại", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 admin-dark:border-[var(--admin-border)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 admin-dark:text-[var(--admin-text)]">
              {title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 admin-dark:text-[var(--admin-muted)] admin-dark:hover:bg-slate-900/30"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600 admin-dark:text-[var(--admin-muted)]">Code</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: SPK-001"
                className="input-modern w-full"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600 admin-dark:text-[var(--admin-muted)]">Level</p>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-modern w-full">
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600 admin-dark:text-[var(--admin-muted)]">Tiêu đề</p>
            <input
              value={setTitle}
              onChange={(e) => setSetTitle(e.target.value)}
              placeholder="Nhập tiêu đề bộ đề"
              className="input-modern w-full"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600 admin-dark:text-[var(--admin-muted)]">
                Thời gian (giây)
              </p>
              <input
                value={timeLimitSec}
                onChange={(e) => setTimeLimitSec(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="Để trống = mặc định"
                className="input-modern w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 admin-dark:border-[var(--admin-border)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Huỷ
          </button>
          <button type="button" className="btn-primary" onClick={create} disabled={saving}>
            {saving ? "Đang tạo..." : "Tạo"}
          </button>
        </div>
      </div>
    </div>
  );
}

