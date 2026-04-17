"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookMarked,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Eye,
  EyeOff,
  X,
  FileJson2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import { AdminConfirmDialog, AdminPagination, AdminPageHeader, AdminCard } from "@/components/admin";

const CEFR_OPTIONS = ["A1", "A2", "B1", "B2", "C1"] as const;

type VocabDeck = {
  id: string;
  title: string;
  cefrLevel: string;
  description?: string | null;
  published: boolean;
  sortOrder: number;
  itemCount?: number;
};

type VocabItem = {
  id: string;
  word: string;
  wordType: string;
  meaning: string;
  pronunciation?: string | null;
  exampleSentence: string;
  sortOrder: number;
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

export default function AdminVocabularyDeckDetailPage() {
  const params = useParams();
  const deckId = String(params?.deckId ?? "");
  const { notify } = useToast();

  const [deck, setDeck] = useState<VocabDeck | null>(null);
  const [deckState, setDeckState] = useState<"loading" | "ok" | "missing">("loading");
  const [items, setItems] = useState<VocabItem[]>([]);
  const [itemMeta, setItemMeta] = useState<Meta>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [itemLoading, setItemLoading] = useState(true);
  const [itemKeyword, setItemKeyword] = useState("");
  const [itemTick, setItemTick] = useState(0);

  const [itemModal, setItemModal] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<VocabItem | null>(null);
  const [itemForm, setItemForm] = useState({
    word: "",
    wordType: "noun",
    meaning: "",
    pronunciation: "",
    exampleSentence: "",
  });
  const [savingItem, setSavingItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const [deckModal, setDeckModal] = useState(false);
  const [deckForm, setDeckForm] = useState({
    title: "",
    cefrLevel: "A1",
    description: "",
    published: false,
    sortOrder: 0,
  });
  const [savingDeck, setSavingDeck] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadDeck = useCallback(async () => {
    if (!deckId) return;
    setDeckState("loading");
    try {
      const res = await apiClient.admin.vocabulary.getDeck(deckId);
      const d = unwrapPayload(res);
      setDeck(d);
      setDeckForm({
        title: d.title,
        cefrLevel: d.cefrLevel,
        description: d.description ?? "",
        published: d.published,
        sortOrder: d.sortOrder ?? 0,
      });
      setDeckState("ok");
    } catch {
      setDeck(null);
      setDeckState("missing");
    }
  }, [deckId]);

  const loadItems = useCallback(async () => {
    if (!deckId) return;
    setItemLoading(true);
    try {
      const res = await apiClient.admin.vocabulary.listItems(deckId, {
        page: itemMeta.page,
        limit: itemMeta.limit,
        keyword: itemKeyword.trim() || undefined,
        sort: "sortOrder",
        order: "ASC",
      });
      const p = unwrapPayload(res);
      setItems(p?.items ?? []);
      const m = p?.meta ?? {};
      setItemMeta({
        page: Number(m.page ?? 1),
        limit: Number(m.limit ?? 15),
        total: Number(m.total ?? 0),
        totalPages: Number(m.totalPages ?? 1),
      });
    } catch (e: any) {
      notify({ variant: "error", title: "Lỗi tải từ", message: e.message || "Thử lại" });
    } finally {
      setItemLoading(false);
    }
  }, [deckId, itemMeta.page, itemMeta.limit, itemKeyword, notify, itemTick]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm({ word: "", wordType: "noun", meaning: "", pronunciation: "", exampleSentence: "" });
    setItemModal("create");
  };

  const openEditItem = (it: VocabItem) => {
    setEditingItem(it);
    setItemForm({
      word: it.word,
      wordType: it.wordType,
      meaning: it.meaning,
      pronunciation: it.pronunciation ?? "",
      exampleSentence: it.exampleSentence,
    });
    setItemModal("edit");
  };

  const submitItem = async () => {
    if (!deckId) return;
    if (!itemForm.word.trim() || !itemForm.meaning.trim() || !itemForm.exampleSentence.trim()) {
      notify({ variant: "error", title: "Thiếu dữ liệu", message: "Điền từ, nghĩa và ví dụ." });
      return;
    }
    setSavingItem(true);
    try {
      if (itemModal === "create") {
        await apiClient.admin.vocabulary.createItem(deckId, {
          word: itemForm.word.trim(),
          wordType: itemForm.wordType.trim(),
          meaning: itemForm.meaning.trim(),
          pronunciation: itemForm.pronunciation.trim() || undefined,
          exampleSentence: itemForm.exampleSentence.trim(),
        });
        notify({ variant: "success", title: "Đã thêm từ" });
      } else if (editingItem) {
        await apiClient.admin.vocabulary.updateItem(deckId, editingItem.id, {
          word: itemForm.word.trim(),
          wordType: itemForm.wordType.trim(),
          meaning: itemForm.meaning.trim(),
          pronunciation: itemForm.pronunciation.trim() || null,
          exampleSentence: itemForm.exampleSentence.trim(),
        });
        notify({ variant: "success", title: "Đã cập nhật từ" });
      }
      setItemModal(null);
      setItemTick((t) => t + 1);
      await loadDeck();
    } catch (e: any) {
      notify({ variant: "error", title: "Lưu thất bại", message: e.message });
    } finally {
      setSavingItem(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteItemId || !deckId) return;
    try {
      await apiClient.admin.vocabulary.deleteItem(deckId, deleteItemId);
      notify({ variant: "success", title: "Đã xóa từ" });
      setDeleteItemId(null);
      setItemTick((t) => t + 1);
      await loadDeck();
    } catch (e: any) {
      notify({ variant: "error", title: "Xóa thất bại", message: e.message });
    }
  };

  const submitBulk = async () => {
    if (!deckId) return;
    let parsed: {
      word: string;
      wordType: string;
      meaning: string;
      pronunciation?: string | null;
      exampleSentence: string;
    }[];
    try {
      const data = JSON.parse(bulkJson);
      if (!Array.isArray(data)) throw new Error("JSON phải là mảng");
      parsed = data.map((row: any, i: number) => {
        if (!row.word || !row.wordType || !row.meaning || !row.exampleSentence) {
          throw new Error(`Dòng ${i + 1}: thiếu word | wordType | meaning | exampleSentence`);
        }
        return {
          word: String(row.word),
          wordType: String(row.wordType),
          meaning: String(row.meaning),
          pronunciation:
            row.pronunciation != null && String(row.pronunciation).trim() !== ""
              ? String(row.pronunciation).trim()
              : undefined,
          exampleSentence: String(row.exampleSentence),
        };
      });
    } catch (e: any) {
      notify({ variant: "error", title: "JSON không hợp lệ", message: e.message });
      return;
    }
    setBulkLoading(true);
    try {
      await apiClient.admin.vocabulary.bulkItems(deckId, { items: parsed });
      notify({ variant: "success", title: `Đã nhập ${parsed.length} từ` });
      setBulkJson("");
      setBulkOpen(false);
      setItemTick((t) => t + 1);
      await loadDeck();
    } catch (e: any) {
      notify({ variant: "error", title: "Bulk thất bại", message: e.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const submitDeck = async () => {
    if (!deckId || !deckForm.title.trim()) return;
    setSavingDeck(true);
    try {
      await apiClient.admin.vocabulary.updateDeck(deckId, {
        title: deckForm.title.trim(),
        cefrLevel: deckForm.cefrLevel,
        description: deckForm.description.trim() || null,
        published: deckForm.published,
        sortOrder: deckForm.sortOrder,
      });
      notify({ variant: "success", title: "Đã cập nhật bộ" });
      setDeckModal(false);
      await loadDeck();
    } catch (e: any) {
      notify({ variant: "error", title: "Lưu thất bại", message: e.message });
    } finally {
      setSavingDeck(false);
    }
  };

  const togglePublish = async () => {
    if (!deck || !deckId) return;
    try {
      await apiClient.admin.vocabulary.updateDeck(deckId, { published: !deck.published });
      notify({ variant: "success", title: deck.published ? "Đã gỡ xuất bản" : "Đã xuất bản" });
      await loadDeck();
    } catch (e: any) {
      notify({ variant: "error", title: "Lỗi", message: e.message });
    }
  };

  if (!deckId) {
    return null;
  }

  if (deckState === "missing") {
    return (
      <div className="w-full space-y-4 py-4">
        <Link href="/admin/practice/vocabulary" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 admin-dark:text-[var(--admin-accent)]">
          <ArrowLeft className="h-4 w-4" />
          Về danh sách bộ
        </Link>
        <div className="surface p-8 text-center">
          <p className="font-semibold text-slate-800">Không tìm thấy bộ từ.</p>
          <p className="mt-1 text-sm text-slate-500">Kiểm tra đường dẫn hoặc quay lại danh sách.</p>
        </div>
      </div>
    );
  }

  if (deckState === "loading" || !deck) {
    return (
      <div className="w-full space-y-6 py-4">
        <Link
          href="/admin/practice/vocabulary"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 admin-dark:text-[var(--admin-accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách bộ từ
        </Link>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 admin-dark:text-[var(--admin-accent)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Link
        href="/admin/practice/vocabulary"
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:underline admin-dark:text-[var(--admin-accent)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Danh sách bộ từ
      </Link>

      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <AdminPageHeader
            title={deck.title}
            subtitle={
              <span className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${CEFR_CLASS[deck.cefrLevel] ?? ""}`}>
                  {deck.cefrLevel}
                </span>
                {deck.published ? (
                  <span className="qg-status qg-status--published inline-flex min-w-[7rem] justify-center text-center text-xs font-medium px-2 py-1 rounded-full">
                    Đã xuất bản
                  </span>
                ) : (
                  <span className="qg-status qg-status--draft inline-flex min-w-[7rem] justify-center text-center text-xs font-medium px-2 py-1 rounded-full">
                    Nháp
                  </span>
                )}
                {typeof deck.itemCount === "number" ? (
                  <span className="text-muted text-sm">· {deck.itemCount} mục từ</span>
                ) : null}
              </span>
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void togglePublish()} className="btn-secondary !text-sm">
                  {deck.published ? (
                    <>
                      <EyeOff className="h-4 w-4" /> Gỡ xuất bản
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" /> Xuất bản
                    </>
                  )}
                </button>
                <button type="button" onClick={() => setDeckModal(true)} className="btn-secondary !text-sm">
                  Sửa bộ
                </button>
                <button type="button" onClick={openCreateItem} className="btn-primary !text-sm">
                  <Plus className="h-4 w-4" />
                  Thêm từ
                </button>
                <button
                  type="button"
                  onClick={() => setBulkOpen((v) => !v)}
                  className={`btn-secondary !text-sm ${bulkOpen ? "ring-2 ring-blue-300 admin-dark:ring-[var(--admin-accent)]/40" : ""}`}
                >
                  <FileJson2 className="h-4 w-4" />
                  Nhập JSON
                </button>
              </div>
            }
          />
      </motion.div>

      {bulkOpen && (
        <AdminCard title="Nhập hàng loạt (JSON)" rightSlot={<span className="text-xs text-slate-500">Tối đa 500 mục / lần</span>}>
          <p className="text-sm text-slate-600">
            Mảng object: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs admin-dark:bg-[var(--admin-surface-2)]">word</code>,{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs admin-dark:bg-[var(--admin-surface-2)]">wordType</code>,{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs admin-dark:bg-[var(--admin-surface-2)]">meaning</code>,{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs admin-dark:bg-[var(--admin-surface-2)]">pronunciation</code> (IPA, tuỳ chọn),{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs admin-dark:bg-[var(--admin-surface-2)]">exampleSentence</code>
          </p>
          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            rows={8}
            className="input-modern mt-3 font-mono text-xs leading-relaxed"
            placeholder='[{"word":"water","wordType":"noun","meaning":"nước uống","pronunciation":"/ˈwɔːtər/","exampleSentence":"Please drink some water."}]'
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setBulkOpen(false)} className="btn-secondary">
              Đóng
            </button>
            <button type="button" disabled={bulkLoading} onClick={() => void submitBulk()} className="btn-primary">
              {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Nhập"}
            </button>
          </div>
        </AdminCard>
      )}

      <AdminCard
        title="Danh sách từ trong bộ"
        rightSlot={
          <div className="flex max-w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={itemKeyword}
                onChange={(e) => setItemKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setItemMeta((m) => ({ ...m, page: 1 }));
                    setItemTick((t) => t + 1);
                  }
                }}
                placeholder="Tìm từ, phiên âm, nghĩa, ví dụ…"
                className="input-modern pl-10"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setItemMeta((m) => ({ ...m, page: 1 }));
                setItemTick((t) => t + 1);
              }}
              className="btn-secondary shrink-0"
            >
              Lọc
            </button>
          </div>
        }
      >
        {itemLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-blue-600 admin-dark:text-[var(--admin-accent)]" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center admin-dark:border-[var(--admin-border)]">
            <BookMarked className="mx-auto h-10 w-10 text-slate-300 admin-dark:text-[var(--admin-muted)]" />
            <p className="mt-3 text-sm font-semibold">Chưa có từ trong bộ</p>
            <p className="mt-1 text-sm text-slate-500">Thêm từ thủ công hoặc dùng nhập JSON.</p>
            <button type="button" onClick={openCreateItem} className="btn-primary mt-4">
              <Plus className="h-4 w-4" />
              Thêm từ đầu tiên
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((it) => (
              <li
                key={it.id}
                className="surface border-slate-200/90 p-5 shadow-sm transition hover:shadow-md admin-dark:border-[var(--admin-border)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-bold tracking-tight text-slate-900">{it.word}</span>
                      <span className="chip border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface-2)]">
                        {it.wordType}
                      </span>
                    </div>
                    {it.pronunciation ? (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Phiên âm (IPA)</p>
                        <p className="mt-1 font-mono text-sm text-slate-700 admin-dark:text-[var(--admin-muted)]">
                          {it.pronunciation}
                        </p>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nghĩa</p>
                      <p className="mt-1 text-[15px] leading-relaxed text-slate-800">{it.meaning}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ví dụ có ngữ cảnh</p>
                      <blockquote className="mt-2 border-l-4 border-blue-500/80 pl-4 text-[15px] italic leading-relaxed text-slate-600 admin-dark:border-[var(--admin-accent)] admin-dark:text-[var(--admin-muted)]">
                        {it.exampleSentence}
                      </blockquote>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 lg:flex-col lg:items-stretch">
                    <button
                      type="button"
                      onClick={() => openEditItem(it)}
                      className="btn-secondary inline-flex items-center justify-center gap-2 !py-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteItemId(it.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 admin-dark:border-rose-500/30 admin-dark:bg-transparent admin-dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <AdminPagination
            page={itemMeta.page}
            totalPages={itemMeta.totalPages}
            total={itemMeta.total}
            limit={itemMeta.limit}
            loading={itemLoading}
            onPageChange={(p) => setItemMeta((m) => ({ ...m, page: p }))}
            itemLabel="từ"
          />
        </div>
      </AdminCard>

      <AnimatePresence>
        {itemModal && deckId && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="surface max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{itemModal === "create" ? "Thêm từ" : "Sửa từ"}</h3>
                <button
                  type="button"
                  onClick={() => setItemModal(null)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 admin-dark:hover:bg-[var(--admin-surface-2)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Từ (tiếng Anh)</label>
                  <input
                    value={itemForm.word}
                    onChange={(e) => setItemForm((f) => ({ ...f, word: e.target.value }))}
                    className="input-modern"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Loại từ</label>
                  <input
                    value={itemForm.wordType}
                    onChange={(e) => setItemForm((f) => ({ ...f, wordType: e.target.value }))}
                    placeholder="noun, verb, adjective…"
                    className="input-modern"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Phiên âm (IPA)</label>
                  <input
                    value={itemForm.pronunciation}
                    onChange={(e) => setItemForm((f) => ({ ...f, pronunciation: e.target.value }))}
                    placeholder="Ví dụ: /ˈwɔːtər/"
                    className="input-modern font-mono text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Nghĩa (ưu tiên tiếng Việt)</label>
                  <textarea
                    value={itemForm.meaning}
                    onChange={(e) => setItemForm((f) => ({ ...f, meaning: e.target.value }))}
                    rows={3}
                    className="input-modern resize-y"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ví dụ (câu có ngữ cảnh)</label>
                  <textarea
                    value={itemForm.exampleSentence}
                    onChange={(e) => setItemForm((f) => ({ ...f, exampleSentence: e.target.value }))}
                    rows={4}
                    className="input-modern resize-y"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4 admin-dark:border-[var(--admin-border)]">
                <button type="button" onClick={() => setItemModal(null)} className="btn-secondary">
                  Hủy
                </button>
                <button type="button" disabled={savingItem} onClick={() => void submitItem()} className="btn-primary">
                  {savingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deckModal && deck && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="surface w-full max-w-lg p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Sửa thông tin bộ</h3>
                <button
                  type="button"
                  onClick={() => setDeckModal(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 admin-dark:hover:bg-[var(--admin-surface-2)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tiêu đề</label>
                  <input
                    value={deckForm.title}
                    onChange={(e) => setDeckForm((f) => ({ ...f, title: e.target.value }))}
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">CEFR</label>
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
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Mô tả</label>
                  <textarea
                    value={deckForm.description}
                    onChange={(e) => setDeckForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="input-modern resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deckForm.published}
                    onChange={(e) => setDeckForm((f) => ({ ...f, published: e.target.checked }))}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-medium">Xuất bản cho học viên</span>
                </label>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Thứ tự</label>
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
                <button type="button" onClick={() => setDeckModal(false)} className="btn-secondary">
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
        open={!!deleteItemId}
        title="Xóa từ này?"
        description="Mục từ vựng sẽ bị ẩn khỏi bộ."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        danger
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => void confirmDeleteItem()}
      />
    </div>
  );
}
