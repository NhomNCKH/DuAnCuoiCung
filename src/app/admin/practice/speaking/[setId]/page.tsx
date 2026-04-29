"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import { WorkflowStepper } from "@/components/admin/WorkflowStepper";

type SpeakingSetDetail = any;

const PARTS = [
  { key: "read_aloud", label: "Read aloud" },
  { key: "describe_picture", label: "Describe a picture" },
  { key: "respond_to_questions", label: "Respond to questions" },
  { key: "respond_using_info", label: "Respond using info" },
  { key: "express_opinion", label: "Express an opinion" },
  { key: "respond_to_question", label: "Respond to question" },
] as const;

const REQUIRED: Record<string, number> = {
  read_aloud: 2,
  describe_picture: 1,
  respond_to_questions: 3,
  respond_using_info: 3,
  express_opinion: 1,
  respond_to_question: 1,
};

export default function AdminPracticeSpeakingSetDetailPage() {
  const { notify } = useToast();
  const router = useRouter();
  const params = useParams<{ setId: string }>();
  const setId = params?.setId ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setDetail, setSetDetail] = useState<SpeakingSetDetail | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bank, setBank] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [activePart, setActivePart] = useState<(typeof PARTS)[number]["key"]>("read_aloud");
  const [rowKeyword, setRowKeyword] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res: any = await apiClient.admin.skillTasks.getSpeakingSet(setId);
      setSetDetail(res?.data ?? res);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được bộ đề", message: e?.message });
    } finally {
      setLoading(false);
    }
  }

  async function loadBank() {
    setBankLoading(true);
    try {
      const res: any = await apiClient.admin.skillTasks.listSpeaking({ page: 1, limit: 100 });
      const data = res?.data?.data ?? res?.data ?? res;
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setBank(arr);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được ngân hàng task", message: e?.message });
    } finally {
      setBankLoading(false);
    }
  }

  useEffect(() => {
    if (!setId) return;
    void load();
    void loadBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  const itemsByPart = useMemo(() => {
    const items = setDetail?.items ?? [];
    const map: Record<string, any[]> = {};
    for (const p of PARTS) map[p.key] = [];
    for (const it of items) {
      const key = it.taskType ?? it.task?.taskType;
      if (!map[key]) map[key] = [];
      map[key].push(it);
    }
    return map;
  }, [setDetail]);

  const structure = useMemo(() => {
    const counts: Record<string, number> = {};
    const items = setDetail?.items ?? [];
    for (const it of items) {
      const t = it.taskType ?? it.task?.taskType;
      if (!t) continue;
      counts[t] = (counts[t] ?? 0) + 1;
    }
    const missing: Array<{ type: string; actual: number; required: number }> = [];
    for (const [type, required] of Object.entries(REQUIRED)) {
      const actual = counts[type] ?? 0;
      if (actual !== required) missing.push({ type, actual, required });
    }
    return { ok: missing.length === 0, missing };
  }, [setDetail]);

  const activeStep = useMemo(() => {
    const status = String(setDetail?.status ?? "");
    if (status === "published") return 4;
    if (!structure.ok) return 2;
    return 3;
  }, [setDetail, structure.ok]);

  async function publish() {
    if (!setId) return;
    setSaving(true);
    try {
      await apiClient.admin.skillTasks.updateSpeakingSet(setId, { status: "published" });
      notify({ variant: "success", title: "Đã xuất bản", message: "Bộ đề đã được xuất bản." });
      await load();
    } catch (e: any) {
      notify({ variant: "error", title: "Không xuất bản được", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }

  const bankOptions = useMemo(() => {
    const filtered = bank.filter((t) => t.taskType === activePart);
    return filtered.map((t) => ({
      id: t.id,
      label: `${t.title} (${t.code})`,
    }));
  }, [bank, activePart]);

  const partSummary = useMemo(
    () =>
      PARTS.map((p) => ({
        ...p,
        actual: (itemsByPart[p.key] ?? []).length,
        required: REQUIRED[p.key] ?? 0,
      })),
    [itemsByPart]
  );

  const activeItems = useMemo(() => itemsByPart[activePart] ?? [], [itemsByPart, activePart]);
  const filteredActiveItems = useMemo(() => {
    if (!rowKeyword.trim()) return activeItems;
    const kw = rowKeyword.trim().toLowerCase();
    return activeItems.filter((it) => {
      const code = String(it?.task?.code ?? "").toLowerCase();
      const title = String(it?.task?.title ?? "").toLowerCase();
      return code.includes(kw) || title.includes(kw);
    });
  }, [activeItems, rowKeyword]);

  async function addSelected() {
    if (!selectedTaskId) return;
    setSaving(true);
    try {
      await apiClient.admin.skillTasks.addSpeakingSetItems(setId, { taskIds: [selectedTaskId] });
      notify({ variant: "success", title: "Đã thêm", message: "Đã thêm task vào bộ đề." });
      setSelectedTaskId("");
      await load();
    } catch (e: any) {
      notify({ variant: "error", title: "Thêm thất bại", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(itemId: string) {
    setSaving(true);
    try {
      await apiClient.admin.skillTasks.removeSpeakingSetItem(setId, itemId);
      notify({ variant: "success", title: "Đã xoá", message: "Đã xoá khỏi bộ đề." });
      await load();
    } catch (e: any) {
      notify({ variant: "error", title: "Xoá thất bại", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
      <section className="surface p-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push("/admin/practice/speaking")} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="truncate text-lg font-semibold text-slate-900 admin-dark:text-[var(--admin-text)]">
            {setDetail?.title ?? "Bộ đề TOEIC Speaking"}
          </h2>
        </div>

        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1">
            <WorkflowStepper
              steps={[
                { n: 1, label: "Tạo đề", desc: "Thông tin" },
                { n: 2, label: "Thêm phần", desc: "Ngân hàng" },
                { n: 3, label: "Review", desc: "Kiểm tra" },
                { n: 4, label: "Xuất bản", desc: "Sử dụng" },
              ]}
              activeStep={activeStep}
              isStepCompleted={(step) => {
                if (step === 1) return true;
                if (step === 2) return structure.ok;
                if (step === 3) return structure.ok;
                if (step === 4) return String(setDetail?.status ?? "") === "published";
                return false;
              }}
            />
          </div>
          <button
            type="button"
            onClick={publish}
            disabled={saving || !structure.ok || String(setDetail?.status ?? "") === "published"}
            className="btn-primary xl:shrink-0"
            title={!structure.ok ? "Chưa đủ cấu trúc" : undefined}
          >
            {String(setDetail?.status ?? "") === "published" ? "Đã xuất bản" : saving ? "Đang xử lý..." : "Xuất bản"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="surface p-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 admin-dark:text-[var(--admin-muted)]">
            Danh sách Part
          </p>
          <div className="mt-2 space-y-2">
            {partSummary.map((p) => {
              const ok = p.actual === p.required;
              const active = activePart === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setActivePart(p.key);
                    setSelectedTaskId("");
                  }}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? "border-yellow-300/40 bg-yellow-400/10"
                    : "border-[var(--admin-border)] bg-[var(--admin-surface-soft)] hover:brightness-95"
                  }`}
                >
                  <span className="truncate text-sm font-medium text-slate-800 admin-dark:text-[var(--admin-text)]">{p.label}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
                    {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                    {p.actual}/{p.required}
                  </span>
                </button>
              );
            })}
          </div>
          {!structure.ok ? (
            <div className="mt-3 rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              Thiếu/sai: {structure.missing.map((m) => `${m.type.replaceAll("_", " ")} ${m.actual}/${m.required}`).join(" · ")}
            </div>
          ) : null}
        </aside>

        <div className="space-y-3">
          <div className="surface p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" />
                <input
                  value={rowKeyword}
                  onChange={(e) => setRowKeyword(e.target.value)}
                  placeholder="Tìm trong danh sách đã thêm (code/title)"
                  className="input-modern w-full pl-9"
                />
              </div>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="input-modern w-full"
                disabled={bankLoading || saving}
              >
                <option value="">{bankLoading ? "Đang tải..." : `Chọn task cho ${partSummary.find((p) => p.key === activePart)?.label ?? "Part"}`}</option>
                {bankOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  void load();
                  void loadBank();
                }}
                className="btn-secondary inline-flex items-center justify-center px-3"
                aria-label="Làm mới"
                title="Làm mới"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button type="button" onClick={addSelected} disabled={!selectedTaskId || saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Thêm
              </button>
            </div>
          </div>

          <div className="surface p-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải...
              </div>
            ) : filteredActiveItems.length === 0 ? (
              <p className="text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">Chưa có task nào trong phần này.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 admin-dark:border-[var(--admin-border)]">
                <div className="grid grid-cols-[220px,1fr,110px] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 admin-dark:bg-slate-900/30 admin-dark:text-[var(--admin-muted)]">
                  <div>Code</div>
                  <div>Title</div>
                  <div className="text-right">Thao tác</div>
                </div>
                {filteredActiveItems.map((it) => (
                  <div
                    key={it.id}
                    className="grid grid-cols-[220px,1fr,110px] items-center border-t border-slate-200 px-3 py-2 text-sm admin-dark:border-[var(--admin-border)]"
                  >
                    <div className="truncate font-mono text-xs text-slate-700 admin-dark:text-[var(--admin-text)]">{it.task?.code ?? "—"}</div>
                    <div className="min-w-0 truncate font-medium text-slate-900 admin-dark:text-[var(--admin-text)]">{it.task?.title ?? "—"}</div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="rounded-lg p-1.5 text-red-300 hover:bg-red-500/10"
                        aria-label="Xoá"
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

