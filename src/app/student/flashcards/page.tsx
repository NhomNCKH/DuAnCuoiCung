"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Library,
  Plus,
  Clock,
  ChevronRight,
  Loader2,
  Trash2,
  Pencil,
  BookMarked,
  GraduationCap,
  Search,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { learnerVisibleDescription } from "@/lib/learner-deck-description";
import { useToast } from "@/hooks/useToast";

type Deck = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

type SystemDeck = {
  id: string;
  title: string;
  cefrLevel: string;
  description?: string | null;
  itemCount?: number;
};

const CEFR_BADGE: Record<string, string> = {
  A1: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  A2: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  B1: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  B2: "bg-orange-500/15 text-orange-900 dark:text-orange-100",
  C1: "bg-violet-500/15 text-violet-900 dark:text-violet-100",
};

function unwrap(res: unknown): any {
  const r = res as any;
  return r?.data?.data ?? r?.data ?? r;
}

function DeckFormModal({
  open,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  initial?: Partial<Pick<Deck, "title" | "description">>;
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string }) => void;
  submitting?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
  }, [open, initial?.title, initial?.description]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px]"
        onClick={onClose}
        aria-label="Đóng"
      />
      <div
        className="surface relative w-full max-w-lg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {initial?.title ? "Chỉnh sửa bộ" : "Tạo bộ flashcard"}
            </h3>
          </div>
          
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Tên bộ</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Core 600"
              className="input-modern"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Tuỳ chọn"
              className="input-modern resize-none"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary rounded-xl px-4 py-2"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting || !title.trim()}
            onClick={() => onSubmit({ title: title.trim(), description: description.trim() || undefined })}
            className="btn-primary rounded-xl px-4 py-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  const { notify } = useToast();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [systemDecks, setSystemDecks] = useState<SystemDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"system" | "personal">("system");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingDeck, setSavingDeck] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalPersonal = decks.length;
  const totalSystem = systemDecks.length;

  const loadDecks = async () => {
    setLoading(true);
    try {
      const [fcRes, sysRes] = await Promise.all([
        apiClient.learner.flashcards.listDecks({ limit: 50, sort: "updatedAt", order: "DESC" }),
        apiClient.learner.vocabulary.listDecks({ limit: 50, sort: "sortOrder", order: "ASC" }),
      ]);
      const fcPayload = unwrap(fcRes);
      setDecks(fcPayload?.items ?? []);
      const sysPayload = unwrap(sysRes);
      setSystemDecks(sysPayload?.items ?? []);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được dữ liệu", message: e.message || "Vui lòng thử lại" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredSystemDecks = useMemo(() => {
    if (!normalizedSearch) return systemDecks;
    return systemDecks.filter((d) => {
      const hay = `${d.title} ${d.cefrLevel} ${d.description ?? ""}`.toLowerCase();
      return hay.includes(normalizedSearch);
    });
  }, [systemDecks, normalizedSearch]);

  const filteredDecks = useMemo(() => {
    if (!normalizedSearch) return decks;
    return decks.filter((d) => {
      const hay = `${d.title} ${d.description ?? ""}`.toLowerCase();
      return hay.includes(normalizedSearch);
    });
  }, [decks, normalizedSearch]);

  const createDeckCta = (
    <button
      type="button"
      onClick={() => {
        setEditingDeck(null);
        setCreating(true);
      }}
      className="btn-primary rounded-2xl px-5 py-2.5"
    >
      <Plus className="h-4 w-4" />
      Tạo bộ flashcard
    </button>
  );

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface mb-6 overflow-hidden p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-blue-400">
              <Library className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              Flashcards
            </h1>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <div className="relative w-full sm:w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bộ theo tên, CEFR…"
                className="input-modern pl-9"
              />
            </div>

            <div className="inline-flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setActiveTab("system")}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    activeTab === "system"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                  }`}
                >
                  Bộ CEFR
                  <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold text-inherit dark:bg-white/10">
                    {totalSystem}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("personal")}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    activeTab === "personal"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                  }`}
                >
                  Của bạn
                  <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold text-inherit dark:bg-white/10">
                    {totalPersonal}
                  </span>
                </button>
              </div>

              <div className="shrink-0">{createDeckCta}</div>
            </div>
          </div>
        </div>
      </motion.div>

      <section className="mt-10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {activeTab === "system" ? "Bộ từ hệ thống" : "Flashcard của bạn"}
            </h2>
          </div>

          {activeTab === "personal" ? (
            <Link href="/student/mock-test" className="btn-secondary rounded-2xl px-4 py-2.5">
              Gợi ý từ đề thi
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link href="/student/vocabulary" className="btn-secondary rounded-2xl px-4 py-2.5">
              Mở kho từ vựng
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="surface animate-pulse p-6">
                <div className="h-5 w-24 rounded bg-slate-200/70 dark:bg-white/10" />
                <div className="mt-4 h-5 w-3/4 rounded bg-slate-200/70 dark:bg-white/10" />
                <div className="mt-3 h-16 w-full rounded bg-slate-200/70 dark:bg-white/10" />
                <div className="mt-6 h-10 w-full rounded-2xl bg-slate-200/70 dark:bg-white/10" />
              </div>
            ))}
          </div>
        ) : activeTab === "system" ? (
          filteredSystemDecks.length === 0 ? (
            <div className="surface-soft py-14 text-center">
              <BookMarked className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {normalizedSearch ? "Không tìm thấy bộ từ phù hợp." : "Chưa có bộ từ được xuất bản."}
              </p>
              <p className="mt-1 text-sm text-muted">
                {normalizedSearch ? "Thử từ khoá khác hoặc xoá bộ lọc tìm kiếm." : "Admin sẽ cập nhật danh sách sau."}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredSystemDecks.map((d) => {
                const blurb = learnerVisibleDescription(d.description);
                return (
                  <li key={d.id} className="min-w-0">
                    <div className="surface flex h-full min-h-[260px] flex-col p-6 transition hover:shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            CEFR_BADGE[d.cefrLevel] ??
                            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {d.cefrLevel}
                        </span>
                        {typeof d.itemCount === "number" ? (
                          <span className="text-xs font-semibold tabular-nums text-muted">{d.itemCount} từ</span>
                        ) : null}
                      </div>
                      <h3 className="mt-4 text-base font-extrabold leading-snug text-slate-900 dark:text-slate-50">
                        {d.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                        {blurb ?? "Bộ từ theo khung CEFR, có ví dụ ngữ cảnh."}
                      </p>
                      <div className="mt-6">
                        <Link href={`/student/vocabulary/${d.id}`} className="btn-primary w-full rounded-2xl py-3">
                          Học bộ này
                          <ChevronRight className="h-4 w-4 opacity-90" />
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : filteredDecks.length === 0 ? (
          <div className="surface-soft py-14 text-center">
            <Library className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {normalizedSearch ? "Không tìm thấy bộ flashcard phù hợp." : "Chưa có bộ flashcard cá nhân."}
            </p>
            <p className="mt-1 text-sm text-muted">
              {normalizedSearch ? "Thử từ khoá khác hoặc xoá bộ lọc tìm kiếm." : "Tạo bộ mới để thêm thẻ và bắt đầu ôn."}
            </p>
            <div className="mt-5 flex justify-center">{createDeckCta}</div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDecks.map((d) => (
              <li key={d.id} className="min-w-0">
                <div className="surface flex h-full min-h-[220px] flex-col p-6 transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {d.title}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted">
                        {d.description?.trim() ? d.description : "Chưa có mô tả"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingDeck(d)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                        aria-label="Chỉnh sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(d.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-rose-600 transition hover:bg-rose-50 dark:border-white/10 dark:text-rose-300 dark:hover:bg-rose-500/10"
                        aria-label="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2">
                    <Link href={`/student/flashcards/${d.id}/study`} className="btn-primary w-full rounded-2xl py-3">
                      Học ngay
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/student/flashcards/${d.id}`}
                      className="btn-secondary w-full rounded-2xl py-2.5"
                    >
                      Quản lý thẻ
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DeckFormModal
        open={creating}
        onClose={() => setCreating(false)}
        submitting={savingDeck}
        onSubmit={async (data) => {
          setSavingDeck(true);
          try {
            await apiClient.learner.flashcards.createDeck(data);
            notify({ variant: "success", title: "Đã tạo bộ flashcard" });
            setCreating(false);
            await loadDecks();
          } catch (e: any) {
            notify({ variant: "error", title: "Tạo bộ thất bại", message: e.message || "Vui lòng thử lại" });
          } finally {
            setSavingDeck(false);
          }
        }}
      />

      <DeckFormModal
        open={Boolean(editingDeck)}
        initial={editingDeck ?? undefined}
        onClose={() => setEditingDeck(null)}
        submitting={savingDeck}
        onSubmit={async (data) => {
          if (!editingDeck) return;
          setSavingDeck(true);
          try {
            await apiClient.learner.flashcards.updateDeck(editingDeck.id, data);
            notify({ variant: "success", title: "Đã cập nhật bộ flashcard" });
            setEditingDeck(null);
            await loadDecks();
          } catch (e: any) {
            notify({ variant: "error", title: "Cập nhật thất bại", message: e.message || "Vui lòng thử lại" });
          } finally {
            setSavingDeck(false);
          }
        }}
      />

      {deletingId ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px]"
            onClick={() => setDeletingId(null)}
            aria-label="Đóng"
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-600/40 dark:bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Xóa bộ flashcard?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Bộ sẽ được đưa vào trạng thái đã xóa (ẩn). Bạn có thể khôi phục sau nếu cần.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingId;
                  setDeletingId(null);
                  try {
                    await apiClient.learner.flashcards.deleteDeck(id);
                    notify({ variant: "success", title: "Đã xóa bộ flashcard" });
                    await loadDecks();
                  } catch (e: any) {
                    notify({ variant: "error", title: "Xóa thất bại", message: e.message || "Vui lòng thử lại" });
                  }
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

