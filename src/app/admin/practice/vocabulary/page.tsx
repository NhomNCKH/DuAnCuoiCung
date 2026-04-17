"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookMarked,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Eye,
  EyeOff,
  ChevronRight,
  X,
  Settings2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import { AdminConfirmDialog, AdminPagination, AdminCard } from "@/components/admin";
import { SharedTable, SharedTableBody, SharedTableHead } from "@/components/ui/shared-table";

const CEFR_OPTIONS = ["A1", "A2", "B1", "B2", "C1"] as const;

type VocabDeck = {
  id: string;
  title: string;
  cefrLevel: string;
  description?: string | null;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
};

type Meta = { page: number; limit: number; total: number; totalPages: number };

function unwrapPayload(res: unknown): any {
  const r = res as any;
  return r?.data?.data ?? r?.data ?? r;
}

const CEFR_CLASS: Record<string, string> = {
  A1: "qg-level qg-level--easy",
  A2: "qg-level qg-level--medium",
  B1: "qg-level qg-level--hard",
  B2: "qg-level qg-level--expert",
  C1: "qg-status qg-status--published",
};

export default function AdminVocabularyListPage() {
  const { notify } = useToast();
  const [decks, setDecks] = useState<VocabDeck[]>([]);
  const [deckMeta, setDeckMeta] = useState<Meta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [deckLoading, setDeckLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [cefrFilter, setCefrFilter] = useState<string>("");
  const [pubFilter, setPubFilter] = useState<string>("");
  const [deckTick, setDeckTick] = useState(0);

  const [deckModal, setDeckModal] = useState<"create" | "edit" | null>(null);
  const [editingDeck, setEditingDeck] = useState<VocabDeck | null>(null);
  const [deckForm, setDeckForm] = useState({
    title: "",
    cefrLevel: "A1",
    description: "",
    published: false,
    sortOrder: 0,
  });
  const [savingDeck, setSavingDeck] = useState(false);
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    setDeckLoading(true);
    try {
      const res = await apiClient.admin.vocabulary.listDecks({
        page: deckMeta.page,
        limit: deckMeta.limit,
        keyword: keyword.trim() || undefined,
        cefrLevel: cefrFilter || undefined,
        published: pubFilter === "true" ? true : pubFilter === "false" ? false : undefined,
        sort: "sortOrder",
        order: "ASC",
      });
      const p = unwrapPayload(res);
      setDecks(p?.items ?? []);
      const m = p?.meta ?? {};
      setDeckMeta({
        page: Number(m.page ?? 1),
        limit: Number(m.limit ?? 20),
        total: Number(m.total ?? 0),
        totalPages: Number(m.totalPages ?? 1),
      });
    } catch (e: any) {
      notify({ variant: "error", title: "Lỗi tải bộ từ", message: e.message || "Thử lại" });
    } finally {
      setDeckLoading(false);
    }
  }, [deckMeta.page, deckMeta.limit, keyword, cefrFilter, pubFilter, notify, deckTick]);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  const openCreateDeck = () => {
    setEditingDeck(null);
    setDeckForm({
      title: "",
      cefrLevel: "A1",
      description: "",
      published: false,
      sortOrder: 0,
    });
    setDeckModal("create");
  };

  const openEditDeck = (d: VocabDeck) => {
    setEditingDeck(d);
    setDeckForm({
      title: d.title,
      cefrLevel: d.cefrLevel,
      description: d.description ?? "",
      published: d.published,
      sortOrder: d.sortOrder ?? 0,
    });
    setDeckModal("edit");
  };

  const submitDeck = async () => {
    if (!deckForm.title.trim()) {
      notify({ variant: "error", title: "Thiếu tên bộ", message: "Nhập tiêu đề bộ từ." });
      return;
    }
    setSavingDeck(true);
    try {
      if (deckModal === "create") {
        await apiClient.admin.vocabulary.createDeck({
          title: deckForm.title.trim(),
          cefrLevel: deckForm.cefrLevel,
          description: deckForm.description.trim() || undefined,
          published: deckForm.published,
          sortOrder: deckForm.sortOrder,
        });
        notify({ variant: "success", title: "Đã tạo bộ từ" });
      } else if (editingDeck) {
        await apiClient.admin.vocabulary.updateDeck(editingDeck.id, {
          title: deckForm.title.trim(),
          cefrLevel: deckForm.cefrLevel,
          description: deckForm.description.trim() || null,
          published: deckForm.published,
          sortOrder: deckForm.sortOrder,
        });
        notify({ variant: "success", title: "Đã cập nhật bộ" });
      }
      setDeckModal(null);
      await loadDecks();
    } catch (e: any) {
      notify({ variant: "error", title: "Lưu thất bại", message: e.message || "Thử lại" });
    } finally {
      setSavingDeck(false);
    }
  };

  const togglePublish = async (d: VocabDeck, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await apiClient.admin.vocabulary.updateDeck(d.id, { published: !d.published });
      notify({ variant: "success", title: d.published ? "Đã gỡ xuất bản" : "Đã xuất bản" });
      await loadDecks();
    } catch (err: any) {
      notify({ variant: "error", title: "Lỗi", message: err.message });
    }
  };

  const confirmDeleteDeck = async () => {
    if (!deleteDeckId) return;
    try {
      await apiClient.admin.vocabulary.deleteDeck(deleteDeckId);
      notify({ variant: "success", title: "Đã xóa bộ từ" });
      setDeleteDeckId(null);
      await loadDecks();
    } catch (e: any) {
      notify({ variant: "error", title: "Xóa thất bại", message: e.message });
    }
  };

  const applyFilters = () => {
    setDeckMeta((m) => ({ ...m, page: 1 }));
    setDeckTick((t) => t + 1);
  };

  return (
    <div className="admin-vocabulary-page w-full space-y-6">
      <AdminCard
        className="!border-0 shadow-none"
        title="Danh sách bộ từ"
        rightSlot={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <BookMarked className="h-3.5 w-3.5 text-blue-600 admin-dark:text-[var(--admin-accent)]" />
            {deckMeta.total} bộ
          </span>
        }
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="relative min-w-[200px] flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Tìm theo tiêu đề…"
              className="input-modern pl-10"
            />
          </div>
          <select
            value={cefrFilter}
            onChange={(e) => {
              setCefrFilter(e.target.value);
              setDeckMeta((m) => ({ ...m, page: 1 }));
              setDeckTick((t) => t + 1);
            }}
            className="input-modern w-full max-w-[200px]"
          >
            <option value="">Mọi cấp CEFR</option>
            {CEFR_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={pubFilter}
            onChange={(e) => {
              setPubFilter(e.target.value);
              setDeckMeta((m) => ({ ...m, page: 1 }));
              setDeckTick((t) => t + 1);
            }}
            className="input-modern w-full max-w-[220px]"
          >
            <option value="">Xuất bản: tất cả</option>
            <option value="true">Đã xuất bản</option>
            <option value="false">Chưa xuất bản</option>
          </select>
          <button type="button" onClick={applyFilters} className="btn-secondary shrink-0">
            Lọc
          </button>
          <button type="button" onClick={openCreateDeck} className="btn-primary shrink-0">
            <Plus className="h-4 w-4" />
            Tạo bộ
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl">
          {deckLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-9 w-9 animate-spin text-blue-600 admin-dark:text-[var(--admin-accent)]" />
            </div>
          ) : decks.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Settings2 className="mx-auto h-10 w-10 text-slate-300 admin-dark:text-[var(--admin-muted)]" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có bộ từ</p>
              <p className="mt-1 text-sm text-slate-500">Tạo bộ theo cấp độ CEFR hoặc chạy seed dữ liệu mẫu.</p>
              <button type="button" onClick={openCreateDeck} className="btn-primary mt-4">
                <Plus className="h-4 w-4" />
                Tạo bộ đầu tiên
              </button>
            </div>
          ) : (
            <SharedTable className="min-w-[860px]">
              <SharedTableHead>
                <tr>
                  <th className="min-w-[260px] max-w-md px-6 py-4 text-left align-middle text-xs font-bold uppercase tracking-wide text-slate-500">
                    Bộ từ
                  </th>
                  <th className="w-24 whitespace-nowrap px-4 py-4 text-center align-middle text-xs font-bold uppercase tracking-wide text-slate-500">
                    CEFR
                  </th>
                  <th className="w-28 whitespace-nowrap px-4 py-4 text-center align-middle text-xs font-bold uppercase tracking-wide text-slate-500">
                    Số từ
                  </th>
                  <th className="w-36 whitespace-nowrap px-4 py-4 text-center align-middle text-xs font-bold uppercase tracking-wide text-slate-500">
                    Trạng thái
                  </th>
                  <th className="min-w-[260px] px-6 py-4 text-right align-middle text-xs font-bold uppercase tracking-wide text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </SharedTableHead>
              <SharedTableBody>
                {decks.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/90 admin-dark:border-[var(--admin-border)] admin-dark:hover:bg-[#273355]/80"
                  >
                    <td className="max-w-0 px-6 py-5 align-top">
                      <Link
                        href={`/admin/practice/vocabulary/${d.id}`}
                        className="group block space-y-2"
                      >
                        <span className="inline-flex items-center gap-2 text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-blue-700 admin-dark:text-[var(--admin-text)] admin-dark:group-hover:text-[var(--admin-accent)]">
                          {d.title}
                          <ChevronRight className="h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-100" />
                        </span>
                        {d.description ? (
                          <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-500 admin-dark:text-[var(--admin-muted)]">
                            {d.description}
                          </p>
                        ) : null}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-5 align-middle text-center">
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2.5 py-1 text-xs font-bold ${CEFR_CLASS[d.cefrLevel] ?? "qg-level qg-level--medium"}`}
                      >
                        {d.cefrLevel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-5 align-middle text-center text-sm font-semibold tabular-nums text-slate-700 admin-dark:text-[var(--admin-text)]">
                      {d.itemCount ?? "—"}
                    </td>
                    <td className="px-4 py-5 align-middle text-center">
                      {d.published ? (
                        <span className="qg-status qg-status--published inline-flex min-w-[6rem] justify-center text-center text-xs font-medium px-2 py-1 rounded-full">
                          Xuất bản
                        </span>
                      ) : (
                        <span className="qg-status qg-status--draft inline-flex min-w-[6rem] justify-center text-center text-xs font-medium px-2 py-1 rounded-full">
                          Nháp
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <div className="flex flex-nowrap items-center justify-end gap-3">
                        <Link
                          href={`/admin/practice/vocabulary/${d.id}`}
                          className="btn-secondary shrink-0 whitespace-nowrap !py-2 !px-3.5 text-xs font-semibold"
                        >
                          Quản lý từ
                        </Link>
                        <div
                          className="inline-flex shrink-0 items-center rounded-xl border border-slate-200/80 bg-slate-50/80 p-0.5"
                          role="group"
                          aria-label="Thao tác nhanh"
                        >
                          <button
                            type="button"
                            onClick={(e) => togglePublish(d, e)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-800"
                            title={d.published ? "Gỡ xuất bản" : "Xuất bản"}
                          >
                            {d.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditDeck(d)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-800"
                            title="Sửa bộ"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteDeckId(d.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50"
                            title="Xóa bộ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </SharedTableBody>
            </SharedTable>
          )}
        </div>

        <div className="mt-4">
          <AdminPagination
            page={deckMeta.page}
            totalPages={deckMeta.totalPages}
            total={deckMeta.total}
            limit={deckMeta.limit}
            loading={deckLoading}
            onPageChange={(p) => setDeckMeta((m) => ({ ...m, page: p }))}
            itemLabel="bộ"
          />
        </div>
      </AdminCard>

      <AnimatePresence>
        {deckModal && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="surface w-full max-w-lg p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">{deckModal === "create" ? "Tạo bộ từ" : "Sửa bộ từ"}</h3>
                <button
                  type="button"
                  onClick={() => setDeckModal(null)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 admin-dark:hover:bg-[var(--admin-surface-2)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tiêu đề</label>
                  <input
                    value={deckForm.title}
                    onChange={(e) => setDeckForm((f) => ({ ...f, title: e.target.value }))}
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Cấp độ CEFR</label>
                  <select
                    value={deckForm.cefrLevel}
                    onChange={(e) => setDeckForm((f) => ({ ...f, cefrLevel: e.target.value }))}
                    className="input-modern"
                  >
                    {CEFR_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Mô tả</label>
                  <textarea
                    value={deckForm.description}
                    onChange={(e) => setDeckForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="input-modern resize-y"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deckForm.published}
                    onChange={(e) => setDeckForm((f) => ({ ...f, published: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Xuất bản cho học viên</span>
                </label>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min={0}
                    value={deckForm.sortOrder}
                    onChange={(e) => setDeckForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                    className="input-modern"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4 admin-dark:border-[var(--admin-border)]">
                <button type="button" onClick={() => setDeckModal(null)} className="btn-secondary">
                  Hủy
                </button>
                <button type="button" disabled={savingDeck} onClick={() => void submitDeck()} className="btn-primary">
                  {savingDeck ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AdminConfirmDialog
        open={!!deleteDeckId}
        title="Xóa bộ từ?"
        description="Bộ sẽ bị ẩn (soft delete). Học viên không còn thấy nếu đã xuất bản."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        danger
        onClose={() => setDeleteDeckId(null)}
        onConfirm={() => void confirmDeleteDeck()}
      />
    </div>
  );
}
