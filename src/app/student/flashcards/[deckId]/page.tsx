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
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import {
  buildBackFromMeta,
  parseCommaList,
  parseVocabMeta,
  serializeVocabMeta,
  VocabFlashcardMeta,
} from "@/lib/flashcard-vocab";

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

type SpeakSupport = "unknown" | "supported" | "unsupported";

const ipaCache = new Map<string, string>();

function normalizeLookupKey(input: string) {
  return input.trim().toLowerCase();
}

function pickLookupWord(front: string) {
  const cleaned = front.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  // Take first token; keep hyphenated words.
  const token = cleaned.split(" ")[0] ?? "";
  return token.replace(/[^a-zA-Z\-']/g, "").toLowerCase();
}

async function fetchIpa(word: string): Promise<string | null> {
  const key = normalizeLookupKey(word);
  if (!key) return null;
  if (ipaCache.has(key)) return ipaCache.get(key)!;

  // Free dictionary API (client-side, CORS-friendly).
  // Docs: https://dictionaryapi.dev/
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  const entry = Array.isArray(data) ? (data[0] as any) : null;
  if (!entry) return null;

  const direct = typeof entry.phonetic === "string" ? entry.phonetic : "";
  const fromList =
    Array.isArray(entry.phonetics)
      ? String(
          entry.phonetics.find((p: any) => typeof p?.text === "string" && p.text.trim())?.text ?? "",
        )
      : "";

  const ipa = (direct || fromList).trim();
  if (!ipa) return null;
  ipaCache.set(key, ipa);
  return ipa;
}

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
  const [meaningVi, setMeaningVi] = useState(initial?.back ?? "");
  const [meaningEn, setMeaningEn] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [synonyms, setSynonyms] = useState("");
  const [antonyms, setAntonyms] = useState("");
  const [exampleEn, setExampleEn] = useState("");
  const [exampleVi, setExampleVi] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [ipa, setIpa] = useState<string>("");
  const [ipaLoading, setIpaLoading] = useState(false);
  const [speakSupport, setSpeakSupport] = useState<SpeakSupport>("unknown");
  const [voicesReady, setVoicesReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!open) return;
    const meta = parseVocabMeta(initial?.note);
    setFront(initial?.front ?? "");
    setMeaningVi(meta?.meaningVi ?? initial?.back ?? "");
    setMeaningEn(meta?.meaningEn ?? "");
    setPartOfSpeech(meta?.partOfSpeech ?? "");
    setPronunciation(meta?.pronunciation ?? "");
    setSynonyms((meta?.synonyms ?? []).join(", "));
    setAntonyms((meta?.antonyms ?? []).join(", "));
    setExampleEn(meta?.exampleEn ?? "");
    setExampleVi(meta?.exampleVi ?? "");
    setNote(meta?.note ?? (meta ? "" : initial?.note ?? ""));
    setTags((initial?.tags ?? []).join(", "));
    setIpa("");
    setIpaLoading(false);
  }, [open, initial?.front, initial?.back, initial?.note, initial?.tags]);

  useEffect(() => {
    if (!open) return;
    const supported =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined";
    setSpeakSupport(supported ? "supported" : "unsupported");
    if (!supported) return;
    const synth = window.speechSynthesis;
    const markReady = () => setVoicesReady((synth.getVoices?.() ?? []).length > 0);
    markReady();
    synth.addEventListener?.("voiceschanged", markReady as any);
    return () => synth.removeEventListener?.("voiceschanged", markReady as any);
  }, [open]);

  const resolveEnglishVoice = useMemo(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices?.() ?? [];
    if (!voices.length) return null;
    const prefer = (predicate: (v: SpeechSynthesisVoice) => boolean) =>
      voices.find(predicate) ?? null;
    return (
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en")) ||
      voices[0] ||
      null
    );
  }, [voicesReady]); // recompute when voices list becomes ready

  const speakFront = () => {
    if (speakSupport !== "supported") return;
    const word = pickLookupWord(front) || front.trim();
    if (!word) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(word);
      if (resolveEnglishVoice) utter.voice = resolveEnglishVoice;
      utter.lang = resolveEnglishVoice?.lang || "en-US";
      utter.rate = 0.95;
      utter.pitch = 1;
      utter.volume = 1;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      synth.speak(utter);
    } catch {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const word = pickLookupWord(front);
    if (!word) {
      setIpa("");
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      setIpaLoading(true);
      try {
        const result = await fetchIpa(word);
        if (cancelled) return;
        setIpa(result ?? "");
      } catch {
        if (!cancelled) setIpa("");
      } finally {
        if (!cancelled) setIpaLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [front, open]);

  if (!open) return null;

  const parsedTags = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px]"
        onClick={onClose}
        aria-label="Đóng"
      />
      <div
        className="surface relative flex w-full max-w-2xl flex-col overflow-hidden shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {initial?.front || initial?.back ? "Chỉnh sửa thẻ" : "Tạo thẻ mới"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary rounded-xl px-3 py-2"
          >
            Đóng
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Mặt trước
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={5}
              className="input-modern resize-none"
              placeholder="VD: attend"
            />
            <div className="mt-2 flex items-center gap-2">
              {ipaLoading ? (
                <span className="chip text-[11px] font-bold">IPA…</span>
              ) : ipa ? (
                <span className="chip text-[11px] font-bold">
                  <span className="font-mono">{ipa}</span>
                </span>
              ) : null}

              <button
                type="button"
                onClick={speakFront}
                disabled={speakSupport !== "supported" || !voicesReady || !front.trim()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                aria-label="Nghe phát âm"
                title={speakSupport !== "supported" ? "Trình duyệt không hỗ trợ" : "Nghe"}
              >
                {speakSupport !== "supported" ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-blue-600" : ""}`} />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Nghĩa tiếng Việt
            </label>
            <textarea
              value={meaningVi}
              onChange={(e) => setMeaningVi(e.target.value)}
              rows={5}
              className="input-modern resize-none"
              placeholder="VD: hợp lệ, có giá trị"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Loại từ
            </label>
            <input
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value)}
              className="input-modern"
              placeholder="adjective / noun / verb..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Phiên âm
            </label>
            <input
              value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
              className="input-modern"
              placeholder="/ˈvælɪd/"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Nghĩa tiếng Anh
            </label>
            <textarea
              value={meaningEn}
              onChange={(e) => setMeaningEn(e.target.value)}
              rows={3}
              className="input-modern resize-none"
              placeholder="legitimate, having legal force..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Ví dụ
            </label>
            <textarea
              value={exampleEn}
              onChange={(e) => setExampleEn(e.target.value)}
              rows={2}
              className="input-modern resize-none"
              placeholder="The offer is valid until..."
            />
            <textarea
              value={exampleVi}
              onChange={(e) => setExampleVi(e.target.value)}
              rows={2}
              className="input-modern mt-2 resize-none"
              placeholder="Ưu đãi chỉ hợp lệ cho đến..."
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Từ đồng nghĩa
            </label>
            <input
              value={synonyms}
              onChange={(e) => setSynonyms(e.target.value)}
              className="input-modern"
              placeholder="legitimate, legal, genuine"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Từ trái nghĩa
            </label>
            <input
              value={antonyms}
              onChange={(e) => setAntonyms(e.target.value)}
              className="input-modern"
              placeholder="invalid, fake"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Ghi chú
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="input-modern resize-none"
            placeholder="Tuỳ chọn"
          />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Tags
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input-modern"
            placeholder="Tuỳ chọn"
          />
        </div>

        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200/80 px-5 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary rounded-xl px-4 py-2"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting || !front.trim() || !meaningVi.trim()}
            onClick={() => {
              const meta: VocabFlashcardMeta = {
                version: 1,
                expression: front.trim(),
                meaningVi: meaningVi.trim(),
                meaningEn: meaningEn.trim() || undefined,
                partOfSpeech: partOfSpeech.trim() || undefined,
                pronunciation: pronunciation.trim() || undefined,
                synonyms: parseCommaList(synonyms),
                antonyms: parseCommaList(antonyms),
                exampleEn: exampleEn.trim() || undefined,
                exampleVi: exampleVi.trim() || undefined,
                note: note.trim() || undefined,
              };
              onSubmit({
                front: front.trim(),
                back: buildBackFromMeta(meta) || meaningVi.trim(),
                note: serializeVocabMeta(meta),
                tags: parsedTags.length ? parsedTags : undefined,
              });
            }}
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

export default function FlashcardDeckPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = String((params as any)?.deckId ?? "");
  const { notify } = useToast();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ipaByCardId, setIpaByCardId] = useState<Record<string, string>>({});
  const [ipaLoadingIds, setIpaLoadingIds] = useState<Set<string>>(new Set());
  const [speakSupport, setSpeakSupport] = useState<SpeakSupport>("unknown");
  const [voicesReady, setVoicesReady] = useState(false);
  const [speakingCardId, setSpeakingCardId] = useState<string | null>(null);

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
      [
        c.front,
        c.back,
        c.note ?? "",
        parseVocabMeta(c.note)?.partOfSpeech ?? "",
        parseVocabMeta(c.note)?.pronunciation ?? "",
        (parseVocabMeta(c.note)?.synonyms ?? []).join(" "),
        (parseVocabMeta(c.note)?.antonyms ?? []).join(" "),
        parseVocabMeta(c.note)?.meaningEn ?? "",
        parseVocabMeta(c.note)?.exampleEn ?? "",
        parseVocabMeta(c.note)?.exampleVi ?? "",
      ].some((t) => String(t).toLowerCase().includes(kw)),
    );
  }, [cards, search]);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined";
    setSpeakSupport(supported ? "supported" : "unsupported");
    if (!supported) return;
    const synth = window.speechSynthesis;
    const markReady = () => setVoicesReady((synth.getVoices?.() ?? []).length > 0);
    markReady();
    synth.addEventListener?.("voiceschanged", markReady as any);
    return () => synth.removeEventListener?.("voiceschanged", markReady as any);
  }, []);

  const resolveEnglishVoice = useMemo(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices?.() ?? [];
    if (!voices.length) return null;
    const prefer = (predicate: (v: SpeechSynthesisVoice) => boolean) =>
      voices.find(predicate) ?? null;
    return (
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb") && /google|microsoft/i.test(v.name)) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-us")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en-gb")) ||
      prefer((v) => v.lang?.toLowerCase?.().startsWith("en")) ||
      voices[0] ||
      null
    );
  }, [voicesReady]);

  const speakWord = (card: Card) => {
    if (speakSupport !== "supported") return;
    const word = pickLookupWord(card.front) || card.front.trim();
    if (!word) return;
    try {
      const synth = window.speechSynthesis;
      if (speakingCardId === card.id) {
        synth.cancel();
        setSpeakingCardId(null);
        return;
      }
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(word);
      if (resolveEnglishVoice) utter.voice = resolveEnglishVoice;
      utter.lang = resolveEnglishVoice?.lang || "en-US";
      utter.rate = 0.95;
      utter.pitch = 1;
      utter.volume = 1;
      utter.onstart = () => setSpeakingCardId(card.id);
      utter.onend = () => setSpeakingCardId((prev) => (prev === card.id ? null : prev));
      utter.onerror = () => setSpeakingCardId(null);
      synth.speak(utter);
    } catch {
      setSpeakingCardId(null);
    }
  };

  useEffect(() => {
    // Lazy hydrate IPA for visible rows (cached).
    const visible = filtered.slice(0, 80);
    const toFetch = visible
      .map((c) => ({ id: c.id, word: pickLookupWord(c.front) }))
      .filter((x) => x.word && !ipaByCardId[x.id] && !ipaLoadingIds.has(x.id));
    if (!toFetch.length) return;

    let cancelled = false;
    const run = async () => {
      setIpaLoadingIds((prev) => {
        const next = new Set(prev);
        for (const id of toFetch.map((x) => x.id)) next.add(id);
        return next;
      });
      // Simple concurrency of 6
      const queue = [...toFetch];
      const workers = Array.from({ length: 6 }).map(async () => {
        while (queue.length) {
          const job = queue.shift();
          if (!job) break;
          try {
            const ipa = await fetchIpa(job.word);
            if (cancelled || !ipa) continue;
            setIpaByCardId((prev) => ({ ...prev, [job.id]: ipa }));
          } catch {
            // ignore
          } finally {
            if (!cancelled) {
              setIpaLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(job.id);
                return next;
              });
            }
          }
        }
      });
      await Promise.all(workers);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [filtered, ipaByCardId, ipaLoadingIds]);

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-10">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/student/flashcards")}
              className="btn-secondary h-10 w-10 rounded-2xl p-0"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-blue-400">
                  <Library className="h-5 w-5" />
                </span>
                <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                  {deck?.title ?? "Flashcards"}
                </h1>
              </div>
              {deck?.description ? (
                <p className="mt-1 line-clamp-1 text-sm text-muted">{deck.description}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/student/flashcards/${deckId}/study`} className="btn-primary rounded-2xl px-4 py-2.5">
              Học
              <ChevronRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setEditingCard(null);
                setCreating(true);
              }}
              className="btn-secondary rounded-2xl px-4 py-2.5"
            >
              <Plus className="h-4 w-4" />
              Thêm
            </button>
          </div>
        </div>
      </motion.div>

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 p-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-blue-400">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Thẻ</div>
              <div className="text-xs font-semibold text-muted">{filtered.length}</div>
            </div>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm…"
              className="input-modern w-full pl-10 pr-10"
            />
            {search.trim() ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {search.trim() ? "Không có kết quả" : "Chưa có thẻ"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {search.trim() ? "Thử từ khoá khác." : "Bấm “Thêm” để tạo thẻ đầu tiên."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: table-like */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[0.95fr,0.85fr,1.2fr,auto] gap-4 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-300">
                <div>Từ vựng</div>
                <div>Nghĩa chính</div>
                <div>Thông tin tra từ</div>
                <div className="text-right"> </div>
              </div>
              <div className="divide-y divide-slate-200/80 dark:divide-white/10">
                {filtered.map((c) => (
                  (() => {
                    const meta = parseVocabMeta(c.note);
                    const displayPronunciation = meta?.pronunciation || ipaByCardId[c.id] || "";
                    const showIpaLoading = !meta?.pronunciation && ipaLoadingIds.has(c.id);
                    return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[0.95fr,0.85fr,1.2fr,auto] gap-4 px-4 py-4 transition hover:bg-slate-50/70 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            {meta?.expression || c.front}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakWord(c)}
                          disabled={speakSupport !== "supported" || !voicesReady}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                          aria-label="Nghe phát âm"
                        >
                          {speakSupport !== "supported" ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume2 className={`h-4 w-4 ${speakingCardId === c.id ? "text-blue-600" : ""}`} />
                          )}
                        </button>
                      </div>
                      {meta?.partOfSpeech || displayPronunciation || showIpaLoading ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          {meta?.partOfSpeech ? <span className="chip text-[11px] font-bold">{meta.partOfSpeech}</span> : null}
                          {displayPronunciation ? <span className="font-mono">{displayPronunciation}</span> : null}
                          {showIpaLoading ? <span>IPA…</span> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {meta?.meaningVi || c.back}
                      </div>
                      {meta?.meaningEn ? <div className="mt-1 line-clamp-2 text-xs text-muted">{meta.meaningEn}</div> : null}
                    </div>
                    <div className="min-w-0">
                      {meta ? (
                        <div className="space-y-1.5 text-xs text-muted">
                          {meta.synonyms?.length ? (
                            <p className="line-clamp-1">
                              <span className="font-semibold">Đồng nghĩa:</span> {meta.synonyms.slice(0, 5).join(", ")}
                            </p>
                          ) : null}
                          {meta.antonyms?.length ? (
                            <p className="line-clamp-1">
                              <span className="font-semibold">Trái nghĩa:</span> {meta.antonyms.slice(0, 5).join(", ")}
                            </p>
                          ) : null}
                          {meta.exampleEn ? (
                            <p className="line-clamp-1 italic">{meta.exampleEn}</p>
                          ) : null}
                          {meta.note ? (
                            <p className="line-clamp-1">{meta.note}</p>
                          ) : null}
                        </div>
                      ) : (
                        <div>
                          {c.tags?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {c.tags.slice(0, 4).map((t) => (
                                <span key={t} className="chip text-[11px] font-bold">
                                  {t}
                                </span>
                              ))}
                              {c.tags.length > 4 ? (
                                <span className="chip text-[11px] font-bold">+{c.tags.length - 4}</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingCard(c)}
                        className="btn-secondary h-9 w-9 rounded-xl p-0"
                        aria-label="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCardId(c.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 transition hover:bg-rose-50 dark:border-white/10 dark:bg-white/5 dark:text-rose-200 dark:hover:bg-rose-500/10"
                        aria-label="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                    );
                  })()
                ))}
              </div>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden divide-y divide-slate-200/80 dark:divide-white/10">
              {filtered.map((c) => {
                const meta = parseVocabMeta(c.note);
                const displayPronunciation = meta?.pronunciation || ipaByCardId[c.id] || "";
                const showIpaLoading = !meta?.pronunciation && ipaLoadingIds.has(c.id);
                return (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            {meta?.expression || c.front}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakWord(c)}
                          disabled={speakSupport !== "supported" || !voicesReady}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                          aria-label="Nghe phát âm"
                        >
                          {speakSupport !== "supported" ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume2 className={`h-4 w-4 ${speakingCardId === c.id ? "text-blue-600" : ""}`} />
                          )}
                        </button>
                      </div>
                      <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{meta?.meaningVi || c.back}</div>
                      {meta?.meaningEn ? <div className="mt-1 text-xs text-muted">{meta.meaningEn}</div> : null}
                      {meta?.partOfSpeech || displayPronunciation || showIpaLoading ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {meta?.partOfSpeech ? <span className="chip text-[11px] font-bold">{meta.partOfSpeech}</span> : null}
                          {displayPronunciation ? <span className="text-xs font-mono text-muted">{displayPronunciation}</span> : null}
                          {showIpaLoading ? <span className="text-xs text-muted">IPA…</span> : null}
                        </div>
                      ) : null}
                      {meta?.synonyms?.length ? (
                        <div className="mt-2 text-xs text-muted line-clamp-1">
                          <span className="font-semibold">Đồng nghĩa:</span> {meta.synonyms.slice(0, 5).join(", ")}
                        </div>
                      ) : null}
                      {meta?.antonyms?.length ? (
                        <div className="mt-1 text-xs text-muted line-clamp-1">
                          <span className="font-semibold">Trái nghĩa:</span> {meta.antonyms.slice(0, 5).join(", ")}
                        </div>
                      ) : null}
                      {!meta && c.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.tags.slice(0, 4).map((t) => (
                            <span key={t} className="chip text-[11px] font-bold">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingCard(c)}
                        className="btn-secondary h-9 w-9 rounded-xl p-0"
                        aria-label="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCardId(c.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 transition hover:bg-rose-50 dark:border-white/10 dark:bg-white/5 dark:text-rose-200 dark:hover:bg-rose-500/10"
                        aria-label="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {meta?.exampleEn ? <div className="mt-2 text-xs italic text-muted line-clamp-1">{meta.exampleEn}</div> : null}
                  {meta?.note ? <div className="mt-1 text-xs text-muted line-clamp-1">{meta.note}</div> : null}
                  {!meta && c.note ? <div className="mt-2 text-xs text-muted">{c.note}</div> : null}
                </div>
                );
              })}
            </div>
          </>
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
            className="surface relative w-full max-w-md p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Xóa thẻ?</h3>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCardId(null)}
                className="btn-secondary rounded-xl px-4 py-2"
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

