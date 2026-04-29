"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  CircleCheckBig,
  FolderOpen,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  FilePenLine,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import { CreateSkillSetModal } from "@/app/admin/practice/_components/CreateSkillSetModal";
import { WorkflowStepper } from "@/components/admin/WorkflowStepper";

const SPEAKING_TYPES = [
  { id: "read_aloud", label: "Read aloud" },
  { id: "describe_picture", label: "Describe picture" },
  { id: "respond_to_questions", label: "Respond to questions" },
  { id: "respond_using_info", label: "Respond using info" },
  { id: "express_opinion", label: "Express opinion" },
  { id: "respond_to_question", label: "Respond to question" },
] as const;

const LEVELS = ["easy", "medium", "hard", "expert"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

function extractItems(raw: any): any[] {
  const data = raw?.data?.data ?? raw?.data ?? raw;
  return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
}

function statusBadgeClass(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "published") {
    return "border-emerald-300/30 bg-emerald-400/10 text-emerald-500";
  }
  if (normalized === "draft") {
    return "border-amber-300/30 bg-amber-400/10 text-amber-500";
  }
  if (normalized === "archived") {
    return "border-slate-300/30 bg-slate-400/10 text-slate-400";
  }
  return "border-slate-200 bg-[var(--admin-surface-soft)] text-[var(--admin-muted)] admin-dark:border-[var(--admin-border)]";
}

export default function AdminPracticeSpeakingPage() {
  const { notify } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<"sets" | "bank">("sets");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  const [bankLoading, setBankLoading] = useState(false);
  const [bank, setBank] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openTaskModal, setOpenTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [setSearchKeyword, setSetSearchKeyword] = useState("");
  const [setStatusFilterValue, setSetStatusFilterValue] = useState("all");

  async function loadSets() {
    setLoading(true);
    try {
      const res: any = await apiClient.admin.skillTasks.listSpeakingSets({ page: 1, limit: 50 });
      setItems(extractItems(res));
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được dữ liệu", message: e?.message });
    } finally {
      setLoading(false);
    }
  }

  async function loadBank() {
    setBankLoading(true);
    try {
      const res: any = await apiClient.admin.skillTasks.listSpeaking({
        page: 1,
        limit: 100,
        keyword: keyword.trim() || undefined,
        level: levelFilter !== "all" ? levelFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setBank(extractItems(res));
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được ngân hàng", message: e?.message });
    } finally {
      setBankLoading(false);
    }
  }

  useEffect(() => {
    void loadSets();
    void loadBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeSet(id: string) {
    setSaving(true);
    try {
      await apiClient.admin.skillTasks.deleteSpeakingSet(id);
      notify({ variant: "success", title: "Đã xoá", message: "Xoá thành công." });
      await loadSets();
    } catch (e: any) {
      notify({ variant: "error", title: "Xoá thất bại", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }

  async function removeTask(id: string) {
    if (!window.confirm("Xóa task này?")) return;
    setSaving(true);
    try {
      await apiClient.admin.skillTasks.deleteSpeaking(id);
      notify({ variant: "success", title: "Đã xoá task", message: "Xoá thành công." });
      await loadBank();
    } catch (e: any) {
      notify({ variant: "error", title: "Xoá thất bại", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }

  const displayedBank = useMemo(() => {
    if (typeFilter === "all") return bank;
    return bank.filter((t) => String(t.taskType) === typeFilter);
  }, [bank, typeFilter]);

  const displayedSets = useMemo(() => {
    let next = [...items];
    if (setSearchKeyword.trim()) {
      const kw = setSearchKeyword.trim().toLowerCase();
      next = next.filter((it) => String(it.title ?? "").toLowerCase().includes(kw) || String(it.code ?? "").toLowerCase().includes(kw));
    }
    if (setStatusFilterValue !== "all") {
      next = next.filter((it) => String(it.status) === setStatusFilterValue);
    }
    return next;
  }, [items, setSearchKeyword, setStatusFilterValue]);

  const statsSource = tab === "sets" ? displayedSets : displayedBank;
  const totalCount = statsSource.length;
  const publishedCount = statsSource.filter((it) => String(it.status) === "published").length;
  const draftCount = statsSource.filter((it) => String(it.status) === "draft").length;
  const archivedCount = statsSource.filter((it) => String(it.status) === "archived").length;

  const activeStep =
    displayedBank.length === 0
      ? 1
      : displayedSets.length === 0
        ? 2
        : publishedCount === 0
          ? 3
          : 4;

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-[var(--admin-surface)] p-3 admin-dark:border-[var(--admin-border)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTab("sets")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === "sets"
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200 admin-dark:bg-yellow-400/20 admin-dark:text-yellow-300 admin-dark:ring-yellow-300/30"
                : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface-soft)] hover:text-[var(--admin-text)]"
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Bộ đề
          </button>
          <button
            onClick={() => setTab("bank")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === "bank"
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200 admin-dark:bg-yellow-400/20 admin-dark:text-yellow-300 admin-dark:ring-yellow-300/30"
                : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface-soft)] hover:text-[var(--admin-text)]"
            }`}
          >
            <CircleCheckBig className="h-4 w-4" />
            Câu hỏi
          </button>
          </div>
          <div className="min-w-0 xl:flex-1 xl:pl-3">
          <WorkflowStepper
            steps={[
              { n: 1, label: "Tạo task", desc: "Ngân hàng" },
              { n: 2, label: "Tạo đề", desc: "Container" },
              { n: 3, label: "Review", desc: "Kiểm tra" },
              { n: 4, label: "Xuất bản", desc: "Sử dụng" },
            ]}
            activeStep={activeStep}
            isStepCompleted={(step) => {
              if (step === 1) return displayedBank.length > 0;
              if (step === 2) return displayedSets.length > 0;
              if (step === 3) return displayedSets.length > 0;
              return publishedCount > 0;
            }}
            className="workflow-banner-questions"
          />
        </div>
      </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-[var(--admin-surface)] px-3 py-2.5 admin-dark:border-[var(--admin-border)]">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-md bg-sky-100 p-1.5 text-sky-600 admin-dark:bg-cyan-400/20 admin-dark:text-cyan-300">
              <Layers3 className="h-3.5 w-3.5" />
            </div>
            <p className="text-xl font-bold text-[var(--admin-text)]">{totalCount}</p>
          </div>
          <p className="mt-1 text-[11px] text-[var(--admin-muted)]">Tổng</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[var(--admin-surface)] px-3 py-2.5 admin-dark:border-[var(--admin-border)]">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-md bg-emerald-100 p-1.5 text-emerald-600 admin-dark:bg-emerald-400/20 admin-dark:text-emerald-300">
              <Send className="h-3.5 w-3.5" />
            </div>
            <p className="text-xl font-bold text-[var(--admin-text)]">{publishedCount}</p>
          </div>
          <p className="mt-1 text-[11px] text-[var(--admin-muted)]">Xuất bản</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[var(--admin-surface)] px-3 py-2.5 admin-dark:border-[var(--admin-border)]">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-md bg-amber-100 p-1.5 text-amber-600 admin-dark:bg-yellow-400/20 admin-dark:text-yellow-300">
              <FilePenLine className="h-3.5 w-3.5" />
            </div>
            <p className="text-xl font-bold text-[var(--admin-text)]">{draftCount}</p>
          </div>
          <p className="mt-1 text-[11px] text-[var(--admin-muted)]">Nháp</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[var(--admin-surface)] px-3 py-2.5 admin-dark:border-[var(--admin-border)]">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-md bg-slate-200 p-1.5 text-slate-600 admin-dark:bg-slate-400/20 admin-dark:text-slate-300">
              <Archive className="h-3.5 w-3.5" />
            </div>
            <p className="text-xl font-bold text-[var(--admin-text)]">{archivedCount}</p>
          </div>
          <p className="mt-1 text-[11px] text-[var(--admin-muted)]">Lưu trữ</p>
        </div>
      </div>

      {tab === "sets" ? (
        <>
        <div className="surface p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" />
              <input
                value={setSearchKeyword}
                onChange={(e) => setSetSearchKeyword(e.target.value)}
                placeholder="Tìm tiêu đề / code bộ đề"
                className="input-modern w-full pl-9"
              />
            </div>
            <select
              className="input-modern"
              value={setStatusFilterValue}
              onChange={(e) => setSetStatusFilterValue(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={loadSets} className="btn-secondary inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Tải lại
              </button>
              <button type="button" onClick={() => setOpenCreate(true)} className="btn-primary inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Tạo đề
              </button>
            </div>
          </div>
        </div>

        <div className="surface p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải...
            </div>
          ) : displayedSets.length === 0 ? (
            <p className="text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">Chưa có đề nào.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
              {displayedSets.map((it) => (
                <div
                  key={it.id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-[var(--admin-surface-soft)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md admin-dark:border-[var(--admin-border)]"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] text-[var(--admin-muted)]">{it.code}</p>
                        <p className="mt-1 truncate text-base font-bold text-[var(--admin-text)]">{it.title}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(it.status)}`}>
                        {it.status}
                      </span>
                    </div>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-[var(--admin-surface)] px-2.5 py-2 text-xs text-[var(--admin-muted)] admin-dark:border-[var(--admin-border)]">
                      <span className="font-semibold text-[var(--admin-text)]">{String(it.totalQuestions ?? 0)}</span> câu hỏi
                      <span className="mx-1.5 opacity-50">•</span>
                      <span className="font-semibold text-[var(--admin-text)]">
                        {Math.round((Number(it.timeLimitSec ?? 0) || 0) / 60)}
                      </span>{" "}
                      phút
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/practice/speaking/${it.id}`)}
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface)] admin-dark:border-[var(--admin-border)]"
                      >
                        Mở
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSet(it.id)}
                        disabled={saving}
                        className="flex-1 rounded-lg border border-red-300/30 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-400/10 disabled:opacity-60"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
      ) : (
        <>
        <div className="surface p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_170px_170px_auto]">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tiêu đề task"
              className="input-modern"
            />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-modern">
              <option value="all">Tất cả Part</option>
              {SPEAKING_TYPES.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.label}
                </option>
              ))}
            </select>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="input-modern">
              <option value="all">Tất cả level</option>
              {LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-modern w-full">
                <option value="all">Tất cả status</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <button type="button" onClick={loadBank} className="btn-secondary whitespace-nowrap inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Lọc
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setOpenTaskModal(true);
                }}
                className="btn-primary whitespace-nowrap inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Tạo task
              </button>
            </div>
          </div>
        </div>

        <div className="surface p-4">
          {bankLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải...
            </div>
          ) : displayedBank.length === 0 ? (
            <p className="text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">Ngân hàng trống.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
              {displayedBank.map((it) => (
                <div
                  key={it.id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-[var(--admin-surface-soft)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md admin-dark:border-[var(--admin-border)]"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] text-[var(--admin-muted)]">{it.code}</p>
                        <p className="mt-1 truncate text-base font-bold text-[var(--admin-text)]">{it.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--admin-muted)]">{it.prompt}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                          {it.taskType}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(it.status)}`}>
                          {it.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(it);
                          setOpenTaskModal(true);
                        }}
                        className="flex-1 rounded-lg border border-yellow-300/30 px-2.5 py-1.5 text-xs font-semibold text-yellow-400 hover:bg-yellow-400/10"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTask(it.id)}
                        disabled={saving}
                        className="flex-1 rounded-lg border border-red-300/30 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-400/10 disabled:opacity-60"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
      )}

      <CreateSkillSetModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        skill="speaking"
        onCreated={(id) => router.push(`/admin/practice/speaking/${id}`)}
      />
      <SpeakingTaskModal
        open={openTaskModal}
        task={editingTask}
        onClose={() => setOpenTaskModal(false)}
        onSaved={async () => {
          setOpenTaskModal(false);
          setEditingTask(null);
          await loadBank();
        }}
      />
    </motion.div>
  );
}

function SpeakingTaskModal({
  open,
  task,
  onClose,
  onSaved,
}: {
  open: boolean;
  task: any | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    title: "",
    taskType: "read_aloud",
    level: "medium",
    status: "draft",
    prompt: "",
    targetSeconds: "",
    timeLimitSec: "",
    tipsText: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      code: task?.code ?? "",
      title: task?.title ?? "",
      taskType: task?.taskType ?? "read_aloud",
      level: task?.level ?? "medium",
      status: task?.status ?? "draft",
      prompt: task?.prompt ?? "",
      targetSeconds: task?.targetSeconds ? String(task.targetSeconds) : "",
      timeLimitSec: task?.timeLimitSec ? String(task.timeLimitSec) : "",
      tipsText: Array.isArray(task?.tips) ? task.tips.join("\n") : "",
    });
  }, [open, task]);

  async function submit() {
    if (!form.code.trim() || !form.title.trim() || !form.prompt.trim()) {
      notify({ variant: "warning", title: "Thiếu thông tin", message: "Nhập đủ code, tiêu đề, đề bài." });
      return;
    }
    const tips = form.tipsText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const payload: any = {
      code: form.code.trim(),
      title: form.title.trim(),
      taskType: form.taskType,
      level: form.level,
      status: form.status,
      prompt: form.prompt.trim(),
      targetSeconds: form.targetSeconds ? Number(form.targetSeconds) : undefined,
      timeLimitSec: form.timeLimitSec ? Number(form.timeLimitSec) : undefined,
      tips: tips.length ? tips : undefined,
    };

    setSaving(true);
    try {
      if (task?.id) {
        await apiClient.admin.skillTasks.updateSpeaking(task.id, payload);
        notify({ variant: "success", title: "Đã cập nhật", message: "Task đã được cập nhật." });
      } else {
        await apiClient.admin.skillTasks.createSpeaking(payload);
        notify({ variant: "success", title: "Đã tạo", message: "Task đã được tạo." });
      }
      await onSaved();
    } catch (e: any) {
      notify({ variant: "error", title: "Lưu thất bại", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-6">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Đóng" />
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 admin-dark:text-[var(--admin-text)]">
            {task?.id ? "Sửa task Speaking" : "Tạo task Speaking"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="input-modern" placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <select className="input-modern" value={form.taskType} onChange={(e) => setForm((p) => ({ ...p, taskType: e.target.value }))}>
            {SPEAKING_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input className="input-modern md:col-span-2" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <textarea className="input-modern md:col-span-2 min-h-[96px]" placeholder="Đề bài (prompt)" value={form.prompt} onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))} />
          <select className="input-modern" value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}>
            {LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </select>
          <select className="input-modern" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <input className="input-modern" inputMode="numeric" placeholder="Target seconds" value={form.targetSeconds} onChange={(e) => setForm((p) => ({ ...p, targetSeconds: e.target.value.replace(/[^\d]/g, "") }))} />
          <input className="input-modern" inputMode="numeric" placeholder="Time limit (sec)" value={form.timeLimitSec} onChange={(e) => setForm((p) => ({ ...p, timeLimitSec: e.target.value.replace(/[^\d]/g, "") }))} />
          <textarea className="input-modern md:col-span-2 min-h-[72px]" placeholder="Tips (mỗi dòng một tip)" value={form.tipsText} onChange={(e) => setForm((p) => ({ ...p, tipsText: e.target.value }))} />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Huỷ
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

