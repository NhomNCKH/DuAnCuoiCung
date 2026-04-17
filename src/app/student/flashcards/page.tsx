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
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-600/40 dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {initial?.title ? "Chỉnh sửa bộ" : "Tạo bộ flashcard"}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Đặt tên rõ ràng để dễ ôn tập theo chủ đề.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
          >
            Đóng
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Tên bộ
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: TOEIC Core 600"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Mô tả (tuỳ chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="VD: Từ vựng hay gặp trong Part 5–7"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting || !title.trim()}
            onClick={() => onSubmit({ title: title.trim(), description: description.trim() || undefined })}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
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

  const stats = useMemo(() => {
    return [
      { label: "Flashcard của bạn", value: totalPersonal, icon: Library },
      { label: "Bộ từ CEFR", value: totalSystem, icon: BookMarked },
      { label: "SRS hôm nay", value: "—", icon: Clock },
    ];
  }, [totalPersonal, totalSystem]);

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pt-5 pb-8 sm:px-6 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/90 p-6 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-white/10 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-950/80 dark:ring-white/[0.06] sm:p-8"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                <Library className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.65rem]">
                  Flashcard &amp; từ vựng
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-justify text-slate-600 dark:text-slate-400">
                  Bộ từ CEFR do admin biên soạn (phiên âm, nghĩa, ví dụ) nằm bên dưới; flashcard cá nhân để bạn tự tạo thẻ và ôn theo lịch SRS.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingDeck(null);
              setCreating(true);
            }}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition hover:bg-amber-600 active:scale-[0.99] sm:w-auto sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Tạo bộ flashcard
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-slate-950/30 sm:px-5 sm:py-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-amber-600 dark:bg-white/10 dark:text-amber-300">
                <s.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <section className="mt-2">
        <header className="mb-5 flex flex-col gap-1 sm:mb-6">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            <GraduationCap className="h-5 w-5 text-amber-500" aria-hidden />
            Bộ từ hệ thống
          </h2>
          <p className="w-full text-sm leading-relaxed text-justify text-slate-600 dark:text-slate-400">
            Phiên âm IPA, loại từ, nghĩa tiếng Việt và câu ví dụ có ngữ cảnh — chọn đúng cấp độ CEFR để học từng bộ.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          </div>
        ) : systemDecks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200/90 bg-slate-50/50 py-14 text-center dark:border-white/10 dark:bg-slate-900/20">
            <BookMarked className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Chưa có bộ từ được xuất bản.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Admin sẽ cập nhật danh sách sau.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 xl:gap-6">
            {systemDecks.map((d) => {
              const blurb = learnerVisibleDescription(d.description);
              return (
                <li key={d.id} className="min-w-0">
                  <div className="flex h-full min-h-[280px] flex-col rounded-3xl border border-slate-200/90 bg-white p-6 text-left shadow-sm ring-1 ring-slate-900/[0.03] transition hover:border-amber-400/35 hover:shadow-md dark:border-white/10 dark:bg-slate-900/35 dark:ring-white/[0.04] dark:hover:border-amber-500/35">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${CEFR_BADGE[d.cefrLevel] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                      >
                        {d.cefrLevel}
                      </span>
                      {typeof d.itemCount === "number" ? (
                        <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                          {d.itemCount} từ
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-base font-bold leading-snug text-slate-900 dark:text-slate-50">{d.title}</h3>
                    <p className="mt-2 min-h-[3rem] flex-1 text-sm leading-relaxed text-justify text-slate-600 dark:text-slate-400">
                      {blurb ?? "Bộ từ theo khung CEFR, có ví dụ ngữ cảnh."}
                    </p>
                    <div className="mt-auto pt-6">
                      <Link
                        href={`/student/vocabulary/${d.id}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                      >
                        Học bộ này
                        <ChevronRight className="h-4 w-4 opacity-90" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <header>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              <Library className="h-5 w-5 text-amber-500" aria-hidden />
              Flashcard của bạn
            </h2>
            <p className="mt-1 w-full text-sm leading-relaxed text-justify text-slate-600 dark:text-slate-400">
              Thẻ gồm mặt trước và mặt sau; hệ thống nhắc ôn theo lịch SRS để nhớ lâu hơn.
            </p>
          </header>
          <Link
            href="/student/mock-test"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-amber-300/60 hover:bg-amber-50/80 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/10"
          >
            Gợi ý từ đề thi
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          </div>
        ) : decks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200/90 bg-slate-50/40 py-14 text-center dark:border-white/10 dark:bg-slate-900/20">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Chưa có bộ flashcard cá nhân.</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Tạo bộ mới để thêm thẻ và bắt đầu ôn.</p>
            <button
              type="button"
              onClick={() => {
                setEditingDeck(null);
                setCreating(true);
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              <Plus className="h-4 w-4" />
              Tạo bộ đầu tiên
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 xl:gap-6">
            {decks.map((d) => (
              <li key={d.id} className="min-w-0">
                <div className="flex h-full min-h-[220px] flex-col rounded-3xl border border-slate-200/90 bg-white p-6 text-left shadow-sm ring-1 ring-slate-900/[0.03] transition hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/35 dark:ring-white/[0.04] dark:hover:border-white/15">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{d.title}</p>
                      <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-justify text-slate-600 dark:text-slate-400">
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
                    <Link
                      href={`/student/flashcards/${d.id}/study`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
                    >
                      Học ngay
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/student/flashcards/${d.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
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

