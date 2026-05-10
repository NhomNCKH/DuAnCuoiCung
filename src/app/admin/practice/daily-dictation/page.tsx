"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { AdminCard, AdminEmptyState } from "@/components/admin";
import { apiClient } from "@/lib/api-client";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

type DailyDictationItem = {
  id: string;
  title: string;
  youtubeId?: string;
  source: "youtube" | "internal";
  level: string;
  topics: string[];
  durationSec: number;
  practiceCount: number;
  thumbnailUrl?: string;
  status?: "draft" | "published" | "archived";
};

function unwrapList(payload: any): { items: DailyDictationItem[]; total: number; page: number; limit: number } {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  const items = (data?.items ?? data?.data ?? []) as DailyDictationItem[];
  const total = Number(data?.total ?? items.length ?? 0) || 0;
  const page = Number(data?.page ?? 1) || 1;
  const limit = Number(data?.limit ?? 20) || 20;
  return { items, total, page, limit };
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function statusBadge(status?: DailyDictationItem["status"]) {
  if (!status) return { label: "Draft", className: "bg-slate-900/55 text-white" };
  if (status === "published") return { label: "Published", className: "bg-emerald-500/90 text-white" };
  if (status === "archived") return { label: "Archived", className: "bg-slate-900/55 text-white" };
  return { label: "Draft", className: "bg-amber-500/90 text-white" };
}

export default function AdminDailyDictationPage() {
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState<"" | "published" | "draft" | "archived">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DailyDictationItem[]>([]);
  const [total, setTotal] = useState(0);

  const [importUrl, setImportUrl] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importLevel, setImportLevel] = useState("A1");
  const [importing, setImporting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DailyDictationItem | null>(null);

  async function fetchList(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.admin.dailyDictation.list({
        page: nextPage,
        limit: 12,
        keyword: keyword.trim() || undefined,
        level: level || undefined,
        status: status || undefined,
      });
      const unwrapped = unwrapList(res);
      setItems(unwrapped.items);
      setTotal(unwrapped.total);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được dữ liệu DailyDictation.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    void fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, level, status]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = useMemo(() => items.slice(), [items]);

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-[260px] flex-1">
            <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">YouTube URL</p>
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="Dán link YouTube có English captions..."
              className="input-modern w-full"
            />
          </div>
          <div className="min-w-[240px]">
            <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">Tiêu đề (tuỳ chọn)</p>
            <input
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              placeholder="Tự động nếu để trống"
              className="input-modern w-full"
            />
          </div>
          <div className="min-w-[140px]">
            <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">Level</p>
            <select value={importLevel} onChange={(e) => setImportLevel(e.target.value)} className="input-modern w-full">
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              disabled={importing || !importUrl.trim()}
              onClick={async () => {
                if (!importUrl.trim()) return;
                setImporting(true);
                setError(null);
                try {
                  await apiClient.admin.dailyDictation.importYoutube({
                    youtubeUrl: importUrl.trim(),
                    title: importTitle.trim() || undefined,
                    level: importLevel,
                    topics: [],
                  });
                  setImportUrl("");
                  setImportTitle("");
                  await fetchList(1);
                } catch (e: any) {
                  setError(e?.message ?? "Import thất bại.");
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Import
            </button>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 admin-dark:text-[var(--admin-muted)]" />
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên bài / hội thoại..."
              className="input-modern w-full pl-9"
            />
          </div>

          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(1);
            }}
            className="input-modern w-full min-w-[180px] lg:w-[180px]"
          >
            <option value="">Tất cả level</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              setPage(1);
            }}
            className="input-modern w-full min-w-[220px] lg:w-[220px]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="published">Published</option>
            <option value="draft">Chưa publish</option>
            <option value="archived">Archived</option>
          </select>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3"
              onClick={() => {
                setKeyword("");
                setLevel("");
                setStatus("");
                setPage(1);
                void fetchList(1);
              }}
              aria-label="Xóa bộ lọc"
              title="Xóa bộ lọc"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </AdminCard>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải...
        </div>
      ) : pageItems.length === 0 ? (
        <AdminEmptyState
          icon={FileText}
          title="Chưa có nội dung DailyDictation"
          description="Hãy import video có captions để tạo bài luyện nghe-chép chính tả."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                (document?.querySelector("input[placeholder='Dán link YouTube có English captions...']") as HTMLInputElement | null)?.focus?.()
              }
            >
              Import YouTube
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((it) => {
            const badge = statusBadge(it.status);
            const topics = (it.topics ?? []).filter(Boolean).slice(0, 3);
            const hasTopics = topics.length > 0;
            const sourceLabel = it.source === "internal" ? "Nội bộ" : it.youtubeId ? "YouTube" : "Nội bộ";
            const practiceCount = Number(it.practiceCount ?? 0) || 0;
            return (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]"
              >
                <div className="relative aspect-[16/9] w-full bg-slate-100 admin-dark:bg-[#1b2542]">
                  {it.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 to-transparent" />

                  <div className="absolute left-2 top-2 inline-flex items-center gap-2">
                    <span className="rounded-full bg-black/60 px-2 py-1 text-[11px] font-bold tracking-wide text-white">
                      {sourceLabel}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-extrabold tracking-wide shadow-sm ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="absolute right-2 top-2 inline-flex items-center gap-2">
                    <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-extrabold text-slate-900">
                      {it.level}
                    </span>
                  </div>

                  <div className="absolute left-2 bottom-2 inline-flex items-center gap-2">
                    <span className="rounded-full bg-black/60 px-2 py-1 text-[11px] font-bold text-white">
                      {formatDuration(it.durationSec)}
                    </span>
                    <span className="rounded-full bg-black/60 px-2 py-1 text-[11px] font-bold text-white">
                      {practiceCount} lượt luyện
                    </span>
                  </div>
                  <button
                    type="button"
                    className="absolute right-2 bottom-2 grid h-9 w-9 place-items-center rounded-xl border border-white/30 bg-black/35 text-white shadow-sm transition hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/40 group-hover:opacity-100 lg:opacity-0"
                    onClick={() => {
                      setDeleteTarget(it);
                      setConfirmDeleteOpen(true);
                    }}
                    aria-label="Xóa"
                    title="Xóa"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Link href={`/admin/practice/daily-dictation/${it.id}`} className="block p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">
                      {it.title}
                    </p>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500 admin-dark:text-[color:var(--admin-muted)]" />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {hasTopics ? (
                      topics.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 admin-dark:border-[var(--admin-border)] admin-dark:bg-[#15213b] admin-dark:text-[var(--admin-muted)]"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">Chưa gắn chủ đề</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">
                    <span className="font-semibold">{it.youtubeId ? `ID: ${it.youtubeId}` : `ID: ${it.id.slice(0, 8)}…`}</span>
                    <span className="font-semibold">Xem chi tiết</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <AdminConfirmDialog
        open={confirmDeleteOpen}
        title="Xóa nội dung DailyDictation?"
        description={deleteTarget ? `Bạn chắc chắn muốn xóa “${deleteTarget.title}”?` : "Bạn chắc chắn muốn xóa nội dung này?"}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        loading={deleting}
        danger
        onClose={() => (deleting ? null : setConfirmDeleteOpen(false))}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          setError(null);
          try {
            await apiClient.admin.dailyDictation.delete(deleteTarget.id);
            setConfirmDeleteOpen(false);
            setDeleteTarget(null);
            await fetchList(1);
          } catch (e: any) {
            setError(e?.message ?? "Xóa thất bại.");
          } finally {
            setDeleting(false);
          }
        }}
      />

      <div className="flex items-center justify-between gap-3 pt-2 text-sm text-slate-500 admin-dark:text-[var(--admin-muted)]">
        <span>
          Hiển thị {(pageItems.length === 0 ? 0 : (safePage - 1) * pageSize + 1)}-
          {(safePage - 1) * pageSize + pageItems.length} / {total}
        </span>
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
          <button
            type="button"
            className="btn-secondary h-9 w-9 px-0"
            onClick={() => {
              const next = Math.max(1, safePage - 1);
              setPage(next);
              void fetchList(next);
            }}
            disabled={safePage <= 1}
            aria-label="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-bold text-slate-700 admin-dark:text-[var(--admin-text)]">{safePage}</span>
          <button
            type="button"
            className="btn-secondary h-9 w-9 px-0"
            onClick={() => {
              const next = Math.min(totalPages, safePage + 1);
              setPage(next);
              void fetchList(next);
            }}
            disabled={safePage >= totalPages}
            aria-label="Trang sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
