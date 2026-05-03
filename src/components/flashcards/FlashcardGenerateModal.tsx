"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Braces,
  Check,
  Copy,
  FileJson2,
  Info,
  Languages,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  FLASHCARD_CONTENT_TYPES,
  FLASHCARD_PREVIEW_LANGUAGES,
  type FlashcardContentType,
  type FlashcardPreviewItem,
  type FlashcardPreviewLanguage,
  type FlashcardPreviewResponse,
} from "@/lib/flashcard-ai";
import {
  FLASHCARD_JSON_EXAMPLE,
  FLASHCARD_JSON_USAGE_STEPS,
  buildFlashcardJsonChatPrompt,
  buildPreviewItemPatch,
  parseCommaList,
  stripPreviewItemForSave,
  toCommaList,
  type PreviewContext,
} from "@/lib/flashcard-generate";
import { useToast } from "@/hooks/useToast";

const AI_TOPIC_PRESETS = [
  "TOEIC meetings",
  "business email",
  "airport travel",
  "customer service",
  "office communication",
  "job interview",
] as const;

const LANGUAGE_LABELS: Record<FlashcardPreviewLanguage, string> = {
  "en-vi": "Anh -> Việt",
  "vi-en": "Việt -> Anh",
  "en-en": "Anh -> Anh",
};

const CONTENT_TYPE_LABELS: Record<FlashcardContentType, string> = {
  vocabulary: "Từ đơn",
  phrase: "Cụm từ",
  collocation: "Collocation",
  sentence: "Câu mẫu",
  mixed: "Hỗn hợp",
};

type FlashcardGenerateModalProps = {
  open: boolean;
  deckId: string;
  deckTitle?: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

function unwrapPayload<T>(response: unknown): T {
  const responseData = (response as { data?: unknown })?.data;

  if (
    responseData &&
    typeof responseData === "object" &&
    "data" in responseData
  ) {
    return (responseData as { data?: T }).data as T;
  }

  return (responseData as T) ?? (response as T);
}

export default function FlashcardGenerateModal({
  open,
  deckId,
  deckTitle,
  onClose,
  onSaved,
}: FlashcardGenerateModalProps) {
  const { notify } = useToast();
  const [mode, setMode] = useState<"ai" | "json">("ai");
  const [step, setStep] = useState<"input" | "preview">("input");
  const [showJsonGuide, setShowJsonGuide] = useState(false);
  const [aiTopic, setAiTopic] = useState("TOEIC meetings");
  const [aiLanguage, setAiLanguage] = useState<FlashcardPreviewLanguage>("en-vi");
  const [aiLevel, setAiLevel] = useState("B1");
  const [aiCardCount, setAiCardCount] = useState(12);
  const [aiContentType, setAiContentType] =
    useState<FlashcardContentType>("mixed");
  const [aiRequirements, setAiRequirements] = useState(
    "Ưu tiên ngữ cảnh công việc, có ví dụ ngắn, tránh từ quá học thuật.",
  );
  const [rawJson, setRawJson] = useState(FLASHCARD_JSON_EXAMPLE);
  const [preview, setPreview] = useState<FlashcardPreviewResponse | null>(null);
  const [previewContext, setPreviewContext] = useState<PreviewContext>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("ai");
    setStep("input");
    setShowJsonGuide(false);
    setPreview(null);
    setPreviewContext(null);
    setAiTopic("TOEIC meetings");
    setAiLanguage("en-vi");
    setAiLevel("B1");
    setAiCardCount(12);
    setAiContentType("mixed");
    setAiRequirements(
      "Ưu tiên ngữ cảnh công việc, có ví dụ ngắn, tránh từ quá học thuật.",
    );
    setRawJson(FLASHCARD_JSON_EXAMPLE);
  }, [open]);

  const previewCount = preview?.items.length ?? 0;
  const canGenerateAi = aiTopic.trim().length > 0;
  const canGenerateJson = rawJson.trim().length > 0;

  const helperTitle = useMemo(() => {
    return mode === "ai"
      ? "Điền form, hệ thống tự sinh prompt và tạo preview."
      : "Lấy JSON từ ChatGPT rồi dán vào đây.";
  }, [mode]);

  const jsonPromptTemplate = useMemo(
    () => buildFlashcardJsonChatPrompt(deckTitle),
    [deckTitle],
  );

  const closeModal = () => {
    if (loadingPreview || saving) return;
    onClose();
  };

  const changeMode = (nextMode: "ai" | "json") => {
    if (loadingPreview || saving || mode === nextMode) return;
    setMode(nextMode);
    setStep("input");
    setPreview(null);
    setPreviewContext(null);
  };

  const regenerate = async () => {
    if (mode === "ai" && !canGenerateAi) return;
    if (mode === "json" && !canGenerateJson) return;

    setLoadingPreview(true);
    try {
      if (mode === "ai") {
        const response = await apiClient.learner.flashcards.previewFromAi({
          topic: aiTopic.trim(),
          language: aiLanguage,
          level: aiLevel.trim() || undefined,
          cardCount: aiCardCount,
          contentType: aiContentType,
          requirements: aiRequirements.trim() || undefined,
        });
        const payload = unwrapPayload<FlashcardPreviewResponse>(response);
        setPreview({
          ...payload,
          items: payload.items.map(stripPreviewItemForSave),
        });
        setPreviewContext({ kind: "ai", language: aiLanguage });
      } else {
        const response = await apiClient.learner.flashcards.previewFromJson({
          rawJson,
        });
        const payload = unwrapPayload<FlashcardPreviewResponse>(response);
        setPreview({
          ...payload,
          items: payload.items.map(stripPreviewItemForSave),
        });
        setPreviewContext({ kind: "json" });
      }

      setStep("preview");
    } catch (error) {
      const e = error as { message?: string };
      notify({
        variant: "error",
        title: "Không tạo được preview",
        message: e.message || "Vui lòng kiểm tra lại dữ liệu đầu vào.",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const updatePreviewItem = (
    index: number,
    updater: (current: FlashcardPreviewItem) => FlashcardPreviewItem,
  ) => {
    setPreview((current) => {
      if (!current) return current;
      const items = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return buildPreviewItemPatch(updater(item), previewContext);
      });
      return {
        ...current,
        items,
      };
    });
  };

  const removePreviewItem = (index: number) => {
    setPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const copyJsonPrompt = async () => {
    try {
      await navigator.clipboard.writeText(jsonPromptTemplate);
      notify({
        variant: "success",
        title: "Đã sao chép prompt",
      });
    } catch {
      notify({
        variant: "error",
        title: "Không sao chép được",
        message: "Hãy thử copy thủ công trong khung prompt.",
      });
    }
  };

  const savePreview = async () => {
    if (!preview?.items.length) {
      notify({
        variant: "error",
        title: "Chưa có thẻ để lưu",
        message: "Hãy tạo preview hợp lệ trước khi lưu.",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.learner.flashcards.bulkCreateCards(
        deckId,
        {
          items: preview.items.map(stripPreviewItemForSave),
        },
      );
      const payload = unwrapPayload<{ inserted?: number }>(response);
      notify({
        variant: "success",
        title: "Đã lưu flashcard",
        message: `Đã thêm ${payload.inserted ?? preview.items.length} thẻ vào bộ ${
          deckTitle?.trim() || "hiện tại"
        }.`,
      });
      await onSaved();
      onClose();
    } catch (error) {
      const e = error as { message?: string };
      notify({
        variant: "error",
        title: "Lưu flashcard thất bại",
        message:
          e.message ||
          "Backend từ chối dữ liệu sau bước xác nhận. Hãy kiểm tra lại preview.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={closeModal}
        aria-label="Đóng"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="surface relative flex w-full max-w-6xl flex-col overflow-hidden shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-white/10 dark:text-amber-300">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    Tạo thẻ học
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {deckTitle?.trim()
                      ? `Lưu vào bộ: ${deckTitle}`
                      : "Lưu trực tiếp vào bộ flashcard hiện tại sau khi xác nhận."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {step === "preview" ? (
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="btn-secondary rounded-xl px-3 py-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Sửa đầu vào
                </button>
              ) : null}
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary rounded-xl px-3 py-2"
              >
                <X className="h-4 w-4" />
                Đóng
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => changeMode("ai")}
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                mode === "ai"
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Sinh bằng AI
            </button>
            <button
              type="button"
              onClick={() => changeMode("json")}
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                mode === "json"
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              }`}
            >
              <Braces className="h-4 w-4" />
              Nhập JSON
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {step === "input" ? (
            <div
              className={
                mode === "ai"
                  ? "grid gap-5 lg:grid-cols-[1.2fr,0.8fr]"
                  : "grid gap-5"
              }
            >
              <section className="space-y-4">
                {mode === "ai" ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {helperTitle}
                          </p>
                        
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Chủ đề
                      </label>
                      <input
                        value={aiTopic}
                        onChange={(event) => setAiTopic(event.target.value)}
                        className="input-modern"
                        placeholder="VD: TOEIC meetings, airport travel, business email"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {AI_TOPIC_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAiTopic(preset)}
                            className="chip border border-slate-200/80 text-[11px] font-bold transition hover:border-blue-200 hover:text-blue-700 dark:border-white/10 dark:hover:text-blue-200"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Ngôn ngữ
                        </label>
                        <select
                          value={aiLanguage}
                          onChange={(event) =>
                            setAiLanguage(
                              event.target.value as FlashcardPreviewLanguage,
                            )
                          }
                          className="input-modern"
                        >
                          {FLASHCARD_PREVIEW_LANGUAGES.map((language) => (
                            <option key={language} value={language}>
                              {LANGUAGE_LABELS[language]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Cấp độ
                        </label>
                        <input
                          value={aiLevel}
                          onChange={(event) => setAiLevel(event.target.value)}
                          className="input-modern"
                          placeholder="A2, B1, B2..."
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Số lượng
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={aiCardCount}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value) || 1;
                            setAiCardCount(
                              Math.max(1, Math.min(50, nextValue)),
                            );
                          }}
                          className="input-modern"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Loại nội dung
                        </label>
                        <select
                          value={aiContentType}
                          onChange={(event) =>
                            setAiContentType(
                              event.target.value as FlashcardContentType,
                            )
                          }
                          className="input-modern"
                        >
                          {FLASHCARD_CONTENT_TYPES.map((contentType) => (
                            <option key={contentType} value={contentType}>
                              {CONTENT_TYPE_LABELS[contentType]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Yêu cầu chi tiết
                      </label>
                      <textarea
                        value={aiRequirements}
                        onChange={(event) =>
                          setAiRequirements(event.target.value)
                        }
                        rows={5}
                        className="input-modern resize-none"
                        placeholder="VD: ưu tiên ngữ cảnh công việc, có ví dụ ngắn, có phiên âm, tránh từ quá học thuật..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                            <FileJson2 className="h-5 w-5" />
                          </span>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {helperTitle}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowJsonGuide((current) => !current)}
                          className="btn-secondary rounded-xl px-3 py-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {showJsonGuide ? "Ẩn hướng dẫn" : "Hiện hướng dẫn"}
                        </button>
                      </div>

                      {showJsonGuide ? (
                        <div className="mt-4 space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                          <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                            {FLASHCARD_JSON_USAGE_STEPS.map((stepText, index) => (
                              <li key={`${stepText}-${index}`} className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                                  {index + 1}
                                </span>
                                <span>{stepText}</span>
                              </li>
                            ))}
                          </ol>

                          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                            ChatGPT phải trả về JSON thuần, không giải thích, không bọc trong <code>```json</code>.
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Prompt mẫu
                              </p>
                              <button
                                type="button"
                                onClick={() => void copyJsonPrompt()}
                                className="btn-secondary rounded-xl px-3 py-2"
                              >
                                <Copy className="h-4 w-4" />
                                Sao chép prompt
                              </button>
                            </div>
                            <textarea
                              readOnly
                              value={jsonPromptTemplate}
                              rows={12}
                              spellCheck={false}
                              className="input-modern resize-none font-mono text-xs leading-6"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Dữ liệu JSON
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Nhận `cards`, `items` hoặc mảng `[]`.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setRawJson(FLASHCARD_JSON_EXAMPLE)}
                          className="btn-secondary rounded-xl px-3 py-2"
                        >
                          Dùng mẫu
                        </button>
                        <button
                          type="button"
                          onClick={() => setRawJson("")}
                          className="btn-secondary rounded-xl px-3 py-2"
                        >
                          Xóa trắng
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Dữ liệu JSON
                      </label>
                      <textarea
                        value={rawJson}
                        onChange={(event) => setRawJson(event.target.value)}
                        rows={20}
                        className="input-modern resize-none font-mono text-xs leading-6"
                        placeholder="Dán JSON flashcards vào đây..."
                      />
                      <p className="mt-2 text-xs text-muted">
                        Tối đa 100 thẻ cho mỗi lần preview.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {mode === "ai" ? (
                <aside className="space-y-4">
                  <div className="surface-soft rounded-3xl border border-slate-200/80 p-5 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Cách dùng nhanh
                      </h4>
                    </div>
                    <ol className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      <li>1. Chọn chủ đề, ngôn ngữ, số lượng.</li>
                      <li>2. Tạo preview.</li>
                      <li>3. Sửa thẻ chưa ổn.</li>
                      <li>4. Lưu vào deck hiện tại.</li>
                    </ol>
                  </div>

                  <div className="surface-soft rounded-3xl border border-slate-200/80 p-5 dark:border-white/10">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      Gợi ý
                    </h4>
                    <div className="mt-3 space-y-2 text-sm text-muted">
                      <p>Anh -&gt; Việt: học từ mới theo kiểu flashcard quen thuộc.</p>
                      <p>Việt -&gt; Anh: phù hợp để luyện recall.</p>
                      <p>Anh -&gt; Anh: hợp với người học từ B1 trở lên.</p>
                    </div>
                  </div>
                </aside>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {preview?.title || "Preview flashcards"}
                    </h4>
                    <span className="chip text-[11px] font-bold">
                      {previewCount} thẻ
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Bạn có thể chỉnh sửa trực tiếp từng thẻ trước khi lưu vào bộ
                    hiện tại.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={regenerate}
                    disabled={loadingPreview || saving}
                    className="btn-secondary rounded-xl px-3 py-2 disabled:opacity-50"
                  >
                    {loadingPreview ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Tạo lại preview
                  </button>
                  <button
                    type="button"
                    onClick={savePreview}
                    disabled={saving || loadingPreview || previewCount === 0}
                    className="btn-primary rounded-xl px-4 py-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Lưu {previewCount} thẻ
                  </button>
                </div>
              </div>

              {preview?.warnings?.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                  <div className="font-semibold">Cảnh báo từ bước preview</div>
                  <ul className="mt-2 space-y-1">
                    {preview.warnings.map((warning, index) => (
                      <li key={`${warning}-${index}`}>- {warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-4">
                {preview?.items.map((item, index) => (
                  <article
                    key={`${item.front}-${item.back}-${index}`}
                    className="rounded-3xl border border-slate-200/80 p-4 dark:border-white/10"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip text-[11px] font-bold">
                          #{index + 1}
                        </span>
                        {item.metadata?.contentType ? (
                          <span className="chip text-[11px] font-bold">
                            {
                              CONTENT_TYPE_LABELS[
                                item.metadata.contentType as FlashcardContentType
                              ]
                            }
                          </span>
                        ) : null}
                        {item.metadata?.level ? (
                          <span className="chip text-[11px] font-bold">
                            {item.metadata.level}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePreviewItem(index)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 transition hover:bg-rose-50 dark:border-white/10 dark:bg-white/5 dark:text-rose-200 dark:hover:bg-rose-500/10"
                        aria-label="Xóa thẻ khỏi preview"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Mặt trước
                        </label>
                        <textarea
                          value={item.front}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              front: event.target.value,
                            }))
                          }
                          rows={4}
                          className="input-modern resize-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Mặt sau
                        </label>
                        <textarea
                          value={item.back}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              back: event.target.value,
                            }))
                          }
                          rows={4}
                          className="input-modern resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Loại từ
                        </label>
                        <input
                          value={item.metadata?.partOfSpeech ?? ""}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              metadata: {
                                ...(current.metadata ?? {}),
                                partOfSpeech: event.target.value,
                              },
                            }))
                          }
                          className="input-modern"
                          placeholder="verb / noun / phrase..."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Phiên âm
                        </label>
                        <input
                          value={item.metadata?.pronunciation ?? ""}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              metadata: {
                                ...(current.metadata ?? {}),
                                pronunciation: event.target.value,
                              },
                            }))
                          }
                          className="input-modern"
                          placeholder="/əˈtend/"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Giải nghĩa phụ (EN)
                        </label>
                        <input
                          value={item.metadata?.meaningEn ?? ""}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              metadata: {
                                ...(current.metadata ?? {}),
                                meaningEn: event.target.value,
                              },
                            }))
                          }
                          className="input-modern"
                          placeholder="to be present at an event"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Ví dụ tiếng Anh
                        </label>
                        <textarea
                          value={item.metadata?.exampleEn ?? ""}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              metadata: {
                                ...(current.metadata ?? {}),
                                exampleEn: event.target.value,
                              },
                            }))
                          }
                          rows={3}
                          className="input-modern resize-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Ví dụ tiếng Việt
                        </label>
                        <textarea
                          value={item.metadata?.exampleVi ?? ""}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              metadata: {
                                ...(current.metadata ?? {}),
                                exampleVi: event.target.value,
                              },
                            }))
                          }
                          rows={3}
                          className="input-modern resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Từ đồng nghĩa
                        </label>
                        <input
                          value={toCommaList(item.metadata?.synonyms)}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              metadata: {
                                ...(current.metadata ?? {}),
                                synonyms: parseCommaList(event.target.value),
                              },
                            }))
                          }
                          className="input-modern"
                          placeholder="join, participate in"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Từ trái nghĩa
                        </label>
                        <input
                          value={toCommaList(item.metadata?.antonyms)}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              metadata: {
                                ...(current.metadata ?? {}),
                                antonyms: parseCommaList(event.target.value),
                              },
                            }))
                          }
                          className="input-modern"
                          placeholder="miss, skip"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Tags
                        </label>
                        <input
                          value={toCommaList(item.tags)}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              tags: parseCommaList(event.target.value),
                            }))
                          }
                          className="input-modern"
                          placeholder="toeic, meeting, b1"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Ghi chú
                        </label>
                        <input
                          value={item.metadata?.note ?? item.note ?? ""}
                          onChange={(event) =>
                            updatePreviewItem(index, (current) => ({
                              ...current,
                              note: event.target.value,
                              metadata: current.metadata
                                ? {
                                    ...current.metadata,
                                    note: event.target.value,
                                  }
                                : undefined,
                            }))
                          }
                          className="input-modern"
                          placeholder="Tuỳ chọn"
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        {step === "input" ? (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200/80 px-5 py-4 dark:border-white/10">
            <button
              type="button"
              onClick={closeModal}
              className="btn-secondary rounded-xl px-4 py-2"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={
                loadingPreview ||
                (mode === "ai" ? !canGenerateAi : !canGenerateJson)
              }
              onClick={regenerate}
              className="btn-primary rounded-xl px-4 py-2 disabled:opacity-50"
            >
              {loadingPreview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "ai" ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <Braces className="h-4 w-4" />
              )}
              Tạo preview
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
