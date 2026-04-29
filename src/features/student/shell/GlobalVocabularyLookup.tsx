"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Languages, Loader2, Plus, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import {
  buildBackFromMeta,
  serializeVocabMeta,
  toVocabMetaFromLookup,
} from "@/lib/flashcard-vocab";

type VocabularyLookupResult = {
  expression?: string;
  partOfSpeech?: string;
  pronunciation?: string;
  meaningVi?: string;
  meaningEn?: string;
  phrasalVerbs?: string[];
  synonyms?: string[];
  antonyms?: string[];
  examples?: Array<{ en?: string; vi?: string }>;
  note?: string;
};

function extractApiData<T = any>(raw: any): T | null {
  const data = raw?.data?.data ?? raw?.data ?? raw;
  return (data as T) ?? null;
}

function getFloatingPosition(
  rect: DOMRect,
  options?: { width?: number; height?: number; gap?: number; padding?: number; safeTop?: number },
) {
  const width = options?.width ?? 360;
  const height = options?.height ?? 460;
  const gap = options?.gap ?? 10;
  const padding = options?.padding ?? 12;
  const safeTop = options?.safeTop ?? 74;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const left = Math.max(padding, Math.min(rect.left, viewportW - width - padding));
  const topBelow = rect.bottom + gap;
  const topAbove = rect.top - height - gap;
  const top =
    topBelow + height <= viewportH - padding
      ? topBelow
      : Math.max(safeTop, Math.min(topAbove, viewportH - height - padding));

  return { top, left };
}

export default function GlobalVocabularyLookup() {
  const pathname = usePathname() ?? "";
  const { notify } = useToast();
  const [expression, setExpression] = useState("");
  const [triggerPos, setTriggerPos] = useState<{ top: number; left: number } | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deckChoices, setDeckChoices] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<VocabularyLookupResult | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Keep mock-test detail page on its own flow to avoid duplicate overlays.
  const enabled = !pathname.startsWith("/student/mock-test/");

  const lookupNow = useCallback(async () => {
    if (!expression.trim()) return;
    setLoading(true);
    setError("");
    try {
      const selected = window.getSelection?.()?.toString?.()?.trim?.() ?? expression.trim();
      const anchorEl = window.getSelection?.()?.anchorNode?.parentElement;
      const context = String(anchorEl?.closest("main")?.textContent ?? anchorEl?.textContent ?? "")
        .replace(/\s+/g, " ")
        .slice(0, 1200);
      const res: any = await apiClient.learner.ai.lookupVocabulary({
        expression: selected,
        context,
        language: "vi",
      });
      const payload = extractApiData<any>(res);
      setResult(payload?.result ?? null);
    } catch (e: any) {
      setError(e?.message || "Không thể tra từ lúc này.");
    } finally {
      setLoading(false);
    }
  }, [expression]);

  const saveToFlashcard = useCallback(async () => {
    const picked = (result?.expression || expression).trim();
    if (!picked) return;
    const meta = toVocabMetaFromLookup(result ?? null, picked);
    const back = buildBackFromMeta(meta);
    if (!back) return;

    setSaving(true);
    try {
      const deckRes = await apiClient.learner.flashcards.listDecks({
        limit: 50,
        sort: "updatedAt",
        order: "DESC",
      });
      const deckPayload = extractApiData<any>(deckRes);
      const deckItems = (deckPayload?.items ?? deckPayload?.data?.items ?? []) as Array<{
        id: string;
        title: string;
      }>;
      let deck: { id: string; title: string } | null = null;

      if (!deckItems.length) {
        const createdRes = await apiClient.learner.flashcards.createDeck({
          title: "Từ vựng đã lưu",
          description: "Bộ từ vựng lưu nhanh khi đọc nội dung toàn site",
        });
        deck = extractApiData<any>(createdRes);
      } else if (deckItems.length === 1) {
        deck = deckItems[0];
      } else {
        const safeSelectedId = deckItems.some((d) => d.id === selectedDeckId)
          ? selectedDeckId
          : deckItems[0].id;
        if (!selectedDeckId) {
          setDeckChoices(deckItems.map((d) => ({ id: d.id, title: d.title })));
          setSelectedDeckId(safeSelectedId);
          notify({
            variant: "warning",
            title: "Chọn bộ flashcard",
            message: "Bạn có nhiều bộ. Hãy chọn bộ muốn thêm từ.",
          });
          return;
        }
        deck = deckItems.find((d) => d.id === safeSelectedId) ?? deckItems[0];
      }
      if (!deck?.id) throw new Error("Không xác định được bộ flashcard để lưu.");

      await apiClient.learner.flashcards.createCard(deck.id, {
        front: picked,
        back,
        note: serializeVocabMeta(meta),
        tags: ["global-lookup", "vocab"],
      });
      notify({
        variant: "success",
        title: "Đã thêm vào flashcard",
        message: `"${picked}" đã được lưu vào "${deck.title}".`,
      });
      setDeckChoices([]);
      setSelectedDeckId("");
    } catch (e: any) {
      notify({ variant: "error", title: "Lưu flashcard thất bại", message: e?.message || "Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }, [expression, notify, result, selectedDeckId]);

  useEffect(() => {
    if (!enabled) return;
    const onMouseUp = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
      const sel = window.getSelection?.();
      const text = sel?.toString?.().trim?.() ?? "";
      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
      if (!text || text.length < 2 || text.length > 80 || wordCount > 8) return;

      const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect?.();
      if (!rect) return;

      setExpression(text);
      setResult(null);
      setError("");
      setDeckChoices([]);
      setSelectedDeckId("");
      setOpen(false);
      setPopupPos(getFloatingPosition(rect, { safeTop: 74 }));
      setTriggerPos({
        top: Math.min(window.innerHeight - 54, Math.max(8, rect.bottom + 6)),
        left: Math.min(window.innerWidth - 54, Math.max(8, rect.right - 18)),
      });
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [enabled]);

  useEffect(() => {
    if (!open && !triggerPos) return;
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (popupRef.current && target && !popupRef.current.contains(target)) {
        setOpen(false);
        setTriggerPos(null);
        setDeckChoices([]);
        setSelectedDeckId("");
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [open, triggerPos]);

  useEffect(() => {
    if (!open || !popupPos || !expression.trim()) return;
    const selection = window.getSelection?.();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect?.();
    if (!rect) return;

    const onViewportChange = () => {
      const nextRect = range?.getBoundingClientRect?.() ?? rect;
      const pos = getFloatingPosition(nextRect, {
        width: popupRef.current?.offsetWidth || 360,
        height: popupRef.current?.offsetHeight || 460,
        safeTop: 74,
      });
      setPopupPos(pos);
    };
    onViewportChange();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, popupPos, expression, loading, error, result]);

  if (!enabled) return null;

  return (
    <>
      {triggerPos && !open ? (
        <button
          type="button"
          className="fixed z-[120] inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-xl dark:border-slate-600/40 dark:bg-slate-900 dark:text-slate-200"
          style={{ top: triggerPos.top, left: triggerPos.left }}
          onClick={() => {
            setOpen(true);
            setTriggerPos(null);
            void lookupNow();
          }}
        >
          <Languages className="h-4 w-4 text-blue-500" />
          Tra từ
        </button>
      ) : null}

      {open && popupPos ? (
        <div
          ref={popupRef}
          className="fixed z-[140] w-[360px] max-h-[70vh] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600/40 dark:bg-slate-900"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500 dark:text-slate-300">Từ được chọn</p>
              <p className="truncate text-2xl font-bold text-slate-900 dark:text-slate-100">
                {result?.expression || expression}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDeckChoices([]);
                setSelectedDeckId("");
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-600/40 dark:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI đang phân tích từ vựng...
            </div>
          ) : error ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </p>
          ) : (
            <div className="mt-3 max-h-[42vh] space-y-2.5 overflow-y-auto pr-1">
              {result?.meaningVi ? <p className="text-base font-semibold text-amber-500 dark:text-amber-300">{result.meaningVi}</p> : null}
              {Array.isArray(result?.synonyms) && result.synonyms.length ? <p className="text-sm text-slate-700 dark:text-slate-200">Đồng nghĩa: {result.synonyms.slice(0, 6).join(", ")}</p> : null}
              {Array.isArray(result?.antonyms) && result.antonyms.length ? <p className="text-sm text-slate-700 dark:text-slate-200">Trái nghĩa: {result.antonyms.slice(0, 6).join(", ")}</p> : null}
              {Array.isArray(result?.examples) && result.examples.length ? <p className="text-sm italic text-slate-700 dark:text-slate-200">{result.examples[0]?.en}</p> : null}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            {deckChoices.length > 1 ? (
              <div className="w-full">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Thêm vào bộ
                </label>
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="input-modern w-full"
                >
                  {deckChoices.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void saveToFlashcard()}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              flashcard
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

