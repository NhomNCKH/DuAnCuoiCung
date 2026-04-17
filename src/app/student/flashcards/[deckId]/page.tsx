"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,  
  Library,
  Plus,
  Loader2,
  Search,
  Trash2,
  Pencil,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";

type Deck = { id: string; title: string; description?: string | null };
type Card = {
  id: string;
  front: string;
  back: string;
  note?: string | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
};

function CardModal({
  open,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  initial?: Partial<Pick<Card, "front" | "back" | "note" | "tags">>;
  onClose: () => void;
  onSubmit: (data: { front: string; back: string; note?: string; tags?: string[] }) => void;
  submitting?: boolean;
}) {
  const [front, setFront] = useState(initial?.front ?? "");
  const [back, setBack] = useState(initial?.back ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));

  useEffect(() => {
    if (!open) return;
    setFront(initial?.front ?? "");
    setBack(initial?.back ?? "");
    setNote(initial?.note ?? "");
    setTags((initial?.tags ?? []).join(", "));
  }, [open, initial?.front, initial?.back, initial?.note, initial?.tags]);

  if (!open) return null;

  const parsedTags = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px]"
        onClick={onClose}
        aria-label="Đóng"
      />
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-600/40 dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {initial?.front || initial?.back ? "Chỉnh sửa thẻ" : "Tạo thẻ mới"}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Mẹo: viết nghĩa ngắn gọn, thêm ví dụ ở ghi chú để nhớ lâu.
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

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Mặt trước
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
              placeholder="VD: attend"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Mặt sau
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
              placeholder="VD: tham dự"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
            placeholder="VD: attend a meeting"
          />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Tags (phân tách bằng dấu phẩy)
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
            placeholder="toeic, business"
          />
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
            disabled={submitting || !front.trim() || !back.trim()}
            onClick={() =>
              onSubmit({
                front: front.trim(),
                back: back.trim(),
                note: note.trim() || undefined,
                tags: parsedTags.length ? parsedTags : undefined,
              })
            }
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

export default function FlashcardDeckPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = String((params as any)?.deckId ?? "");
  const { notify } = useToast();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [creating, setCreating] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const deckRes = await apiClient.learner.flashcards.getDeck(deckId);
      const deckPayload = (deckRes as any)?.data?.data ?? (deckRes as any)?.data ?? deckRes;
      setDeck(deckPayload);

      const res = await apiClient.learner.flashcards.listCards(deckId, {
        limit: 100,
        keyword: search || undefined,
      });
      const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
      const items = payload?.items ?? payload?.data?.items ?? [];
      setCards(items);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được bộ flashcard", message: e.message || "Vui lòng thử lại" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!deckId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return cards;
    return cards.filter((c) =>
      [c.front, c.back, c.note ?? ""].some((t) => String(t).toLowerCase().includes(kw)),
    );
  }, [cards, search]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/student/flashcards")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Library className="h-7 w-7 text-amber-500" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-slate-100">
                {deck?.title ?? "Bộ flashcard"}
              </h1>
              <p className="mt-1 line-clamp-1 text-sm text-slate-600 dark:text-slate-300">
                {deck?.description || "Quản lý thẻ và ôn tập theo lịch nhắc lại."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/student/flashcards/${deckId}/study`}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              Học ngay
              <ChevronRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setEditingCard(null);
                setCreating(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-amber-50 hover:text-amber-900 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
            >
              <Plus className="h-4 w-4" />
              Thêm thẻ
            </button>
          </div>
        </div>
      </motion.div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/40 dark:bg-transparent">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-600/40">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Danh sách thẻ</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{filtered.length} thẻ</p>
            </div>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mặt trước/mặt sau/ghi chú..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Chưa có thẻ nào.</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Bấm “Thêm thẻ” để bắt đầu.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-600/40">
            {filtered.map((c) => (
              <div key={c.id} className="p-4 transition hover:bg-slate-50 dark:hover:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.front}</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{c.back}</p>
                    {c.note ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{c.note}</p>
                    ) : null}
                    {c.tags && c.tags.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.tags.slice(0, 6).map((t) => (
                          <span
                            key={t}
                            className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingCard(c)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                      aria-label="Sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCardId(c.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 shadow-sm transition hover:bg-rose-50 dark:border-slate-600/40 dark:bg-transparent dark:text-rose-200 dark:hover:bg-rose-500/10"
                      aria-label="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CardModal
        open={creating}
        onClose={() => setCreating(false)}
        submitting={savingCard}
        onSubmit={async (data) => {
          setSavingCard(true);
          try {
            await apiClient.learner.flashcards.createCard(deckId, data);
            notify({ variant: "success", title: "Đã tạo thẻ" });
            setCreating(false);
            await load();
          } catch (e: any) {
            notify({ variant: "error", title: "Tạo thẻ thất bại", message: e.message || "Vui lòng thử lại" });
          } finally {
            setSavingCard(false);
          }
        }}
      />

      <CardModal
        open={Boolean(editingCard)}
        initial={editingCard ?? undefined}
        onClose={() => setEditingCard(null)}
        submitting={savingCard}
        onSubmit={async (data) => {
          if (!editingCard) return;
          setSavingCard(true);
          try {
            await apiClient.learner.flashcards.updateCard(editingCard.id, data);
            notify({ variant: "success", title: "Đã cập nhật thẻ" });
            setEditingCard(null);
            await load();
          } catch (e: any) {
            notify({ variant: "error", title: "Cập nhật thất bại", message: e.message || "Vui lòng thử lại" });
          } finally {
            setSavingCard(false);
          }
        }}
      />

      {deletingCardId ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px]"
            onClick={() => setDeletingCardId(null)}
            aria-label="Đóng"
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-600/40 dark:bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Xóa thẻ?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Thẻ sẽ bị ẩn khỏi bộ và không xuất hiện trong phiên ôn tập.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCardId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingCardId;
                  setDeletingCardId(null);
                  try {
                    await apiClient.learner.flashcards.deleteCard(id);
                    notify({ variant: "success", title: "Đã xóa thẻ" });
                    await load();
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

