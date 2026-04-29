"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BookMarked, Loader2, Search, Volume2, VolumeX, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { learnerVisibleDescription } from "@/lib/learner-deck-description";
import { useToast } from "@/hooks/useToast";

type Deck = {
  id: string;
  title: string;
  cefrLevel: string;
  description?: string | null;
  itemCount?: number;
};

type Item = {
  id: string;
  word: string;
  wordType: string;
  meaning: string;
  pronunciation?: string | null;
  exampleSentence: string;
};

type Meta = { page: number; limit: number; total: number; totalPages: number };

function unwrap(res: unknown): any {
  const r = res as any;
  return r?.data?.data ?? r?.data ?? r;
}

function wordTypeBadgeClass(wordTypeRaw: string) {
  const t = (wordTypeRaw || "").trim().toLowerCase();

  // Normalize common variants
  const normalized = t
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .replace("adj", "adjective")
    .replace("adv", "adverb")
    .replace("prep", "preposition")
    .replace("conj", "conjunction");

  const base =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold leading-none";

  // Use distinct palettes for "status-like" feel; ensure readable in both modes.
  switch (normalized) {
    case "noun":
      return `${base} border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200`;
    case "verb":
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200`;
    case "adjective":
      return `${base} border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200`;
    case "adverb":
      return `${base} border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200`;
    case "preposition":
      return `${base} border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200`;
    case "conjunction":
      return `${base} border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200`;
    case "pronoun":
      return `${base} border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-400/30 dark:bg-pink-500/10 dark:text-pink-200`;
    case "determiner":
    case "article":
      return `${base} border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-400/30 dark:bg-teal-500/10 dark:text-teal-200`;
    case "interjection":
      return `${base} border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200`;
    case "expression":
    case "collocation":
      return `${base} border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-400/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200`;
    case "phrasal verb":
      return `${base} border-lime-200 bg-lime-50 text-lime-900 dark:border-lime-400/30 dark:bg-lime-500/10 dark:text-lime-200`;
    case "modal verb":
      return `${base} border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200`;
    case "phrase":
    case "idiom":
      return `${base} border-slate-200 bg-slate-50 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200`;
    default:
      // Deterministic palette for unknown types (so every status has its own color)
      // and remains consistent across renders.
      const palettes = [
        "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200",
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
        "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200",
        "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200",
        "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200",
        "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200",
        "border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-400/30 dark:bg-pink-500/10 dark:text-pink-200",
        "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-400/30 dark:bg-teal-500/10 dark:text-teal-200",
        "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200",
        "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-400/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200",
        "border-lime-200 bg-lime-50 text-lime-900 dark:border-lime-400/30 dark:bg-lime-500/10 dark:text-lime-200",
        "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200",
      ] as const;

      let hash = 0;
      for (let i = 0; i < normalized.length; i += 1) {
        hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
      }
      const idx = palettes.length ? hash % palettes.length : 0;
      return `${base} ${palettes[idx]}`;
  }
}

type SpeakSupport = "unknown" | "supported" | "unsupported";

export default function StudentVocabularyDeckPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const { notify } = useToast();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [speakSupport, setSpeakSupport] = useState<SpeakSupport>("unknown");
  const [voicesReady, setVoicesReady] = useState(false);
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);

  const loadDeck = useCallback(async () => {
    if (!id) return;
    setLoadingDeck(true);
    try {
      const res = await apiClient.learner.vocabulary.getDeck(id);
      const d = unwrap(res);
      setDeck(d);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được bộ từ", message: e.message || "Thử lại" });
      setDeck(null);
    } finally {
      setLoadingDeck(false);
    }
  }, [id, notify]);

  const loadItems = useCallback(async () => {
    if (!id) return;
    setLoadingItems(true);
    try {
      const res = await apiClient.learner.vocabulary.listItems(id, {
        page: meta.page,
        limit: meta.limit,
        keyword: debouncedKeyword.trim() || undefined,
        sort: "sortOrder",
        order: "ASC",
      });
      const p = unwrap(res);
      setItems(p?.items ?? []);
      const m = p?.meta ?? {};
      setMeta({
        page: Number(m.page ?? 1),
        limit: Number(m.limit ?? 30),
        total: Number(m.total ?? 0),
        totalPages: Number(m.totalPages ?? 1),
      });
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được danh sách từ", message: e.message });
    } finally {
      setLoadingItems(false);
    }
  }, [id, meta.page, meta.limit, debouncedKeyword, notify]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  useEffect(() => {
    // Web Speech API support detection (client-only).
    const supported =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined";
    setSpeakSupport(supported ? "supported" : "unsupported");

    if (!supported) return;

    const synth = window.speechSynthesis;
    const markReady = () => {
      // Some browsers load voices async; calling getVoices triggers load.
      const v = synth.getVoices();
      setVoicesReady(v.length > 0);
    };

    markReady();
    synth.addEventListener?.("voiceschanged", markReady as any);
    return () => synth.removeEventListener?.("voiceschanged", markReady as any);
  }, []);

  useEffect(() => {
    // If user navigates away or list changes, stop speaking.
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setMeta((m) => ({ ...m, page: 1 }));
    }, 350);
    return () => clearTimeout(handle);
  }, [keyword]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const deckBlurb = useMemo(() => learnerVisibleDescription(deck?.description), [deck?.description]);

  const resolveEnglishVoice = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices?.() ?? [];
    if (!voices.length) return null;

    const prefer = (predicate: (v: SpeechSynthesisVoice) => boolean) =>
      voices.find(predicate) ?? null;

    // Prefer Google/Microsoft English voices if present, then any en-* voice.
    return (
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en")) ||
      voices[0] ||
      null
    );
  }, []);

  const speakWord = useCallback(
    (item: Item) => {
      if (speakSupport !== "supported") {
        notify({
          variant: "error",
          title: "Thiết bị không hỗ trợ phát âm",
          message: "Trình duyệt hiện tại không hỗ trợ Web Speech API. Hãy thử Chrome/Edge.",
        });
        return;
      }

      const synth = window.speechSynthesis;
      try {
        // Toggle: if clicking the same item while speaking, stop.
        if (speakingItemId === item.id) {
          synth.cancel();
          setSpeakingItemId(null);
          return;
        }

        synth.cancel();

        const utter = new SpeechSynthesisUtterance(item.word);
        const voice = resolveEnglishVoice();
        if (voice) utter.voice = voice;
        utter.lang = voice?.lang || "en-US";
        utter.rate = 0.95;
        utter.pitch = 1;
        utter.volume = 1;

        utter.onend = () => setSpeakingItemId((prev) => (prev === item.id ? null : prev));
        utter.onerror = () => {
          setSpeakingItemId(null);
          notify({
            variant: "error",
            title: "Không phát được phát âm",
            message: "Vui lòng thử lại hoặc đổi trình duyệt/thiết bị.",
          });
        };

        setSpeakingItemId(item.id);
        synth.speak(utter);
      } catch {
        setSpeakingItemId(null);
        notify({
          variant: "error",
          title: "Không phát được phát âm",
          message: "Vui lòng thử lại hoặc đổi trình duyệt/thiết bị.",
        });
      }
    },
    [notify, resolveEnglishVoice, speakSupport, speakingItemId],
  );

  if (!id) {
    return null;
  }

  return (
    <div className="px-4 pt-0 pb-6 sm:px-6 lg:px-10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Link href="/student/flashcards" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400">
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>

        {deck ? (
          <Link href={`/student/vocabulary/${id}/practice`} className="btn-primary rounded-2xl px-4 py-2.5">
            Luyện tập
          </Link>
        ) : null}
      </div>

      {loadingDeck ? (
        <div className="surface flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : !deck ? (
        <div className="surface p-6">
          <p className="text-sm text-muted">Không tìm thấy bộ từ hoặc chưa được xuất bản.</p>
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="surface mb-4 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-blue-400">
                    <BookMarked className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                        {deck.title}
                      </h1>
                      <span className="chip">{deck.cefrLevel}</span>
                      {typeof deck.itemCount === "number" ? (
                        <span className="chip">{deck.itemCount} mục</span>
                      ) : null}
                    </div>
                    {deckBlurb ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted">{deckBlurb}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-[380px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tìm từ, loại từ, nghĩa…"
                    className="input-modern pl-9 pr-10"
                  />
                  {keyword.trim() ? (
                    <button
                      type="button"
                      onClick={() => setKeyword("")}
                      className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                      aria-label="Xóa tìm kiếm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted">
                  {debouncedKeyword.trim()
                    ? `Đang lọc theo: “${debouncedKeyword.trim()}”`
                    : ""}
                </p>
              </div>
            </div>
          </motion.div>

          {loadingItems ? (
            <div className="surface flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="surface-soft py-14 text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {debouncedKeyword.trim() ? "Không có từ phù hợp bộ lọc." : "Bộ từ hiện chưa có dữ liệu."}
              </p>
              <p className="mt-1 text-sm text-muted">
                {debouncedKeyword.trim() ? "Thử từ khoá khác hoặc xoá tìm kiếm." : "Vui lòng quay lại sau."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((it) => (
                <motion.article key={it.id} layout className="surface p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{it.word}</h2>
                        <span className={wordTypeBadgeClass(it.wordType)}>{it.wordType}</span>
                        <span className="inline-flex items-center gap-2">
                          {it.pronunciation ? (
                            <span className="text-sm font-semibold text-muted">
                              <span className="font-mono">{it.pronunciation}</span>
                            </span>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => speakWord(it)}
                            disabled={speakSupport === "unsupported" || (!voicesReady && speakSupport === "supported")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            aria-label={`Phát âm: ${it.word}`}
                            title={
                              speakSupport === "unsupported"
                                ? "Trình duyệt không hỗ trợ phát âm"
                                : !voicesReady
                                  ? "Đang tải giọng đọc…"
                                  : speakingItemId === it.id
                                    ? "Dừng"
                                    : "Nghe phát âm"
                            }
                          >
                            {speakSupport === "unsupported" ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className={`h-4 w-4 ${speakingItemId === it.id ? "text-blue-600" : ""}`} />
                            )}
                          </button>
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{it.meaning}</p>
                    </div>

                    <div className="sm:max-w-[55%]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">Ví dụ</p>
                        <p className="mt-1 leading-relaxed">{it.exampleSentence}</p>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {meta.totalPages > 1 ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Trang <span className="font-semibold text-slate-900 dark:text-slate-100">{meta.page}</span> /{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">{meta.totalPages}</span>
                {meta.total ? (
                  <>
                    {" "}
                    · <span className="font-semibold text-slate-900 dark:text-slate-100">{meta.total}</span> mục
                  </>
                ) : null}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.page <= 1}
                  onClick={() => setMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))}
                  className="btn-secondary rounded-2xl px-4 py-2 disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setMeta((m) => ({ ...m, page: Math.min(m.totalPages, m.page + 1) }))}
                  className="btn-secondary rounded-2xl px-4 py-2 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
