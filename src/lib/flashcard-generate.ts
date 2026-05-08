import type {
  FlashcardPreviewItem,
  FlashcardPreviewLanguage,
} from "./flashcard-ai";

export const FLASHCARD_JSON_EXAMPLE = `{
  "title": "TOEIC Meetings",
  "cards": [
    {
      "front": "attend",
      "back": "tham dự",
      "partOfSpeech": "verb",
      "pronunciation": "/əˈtend/",
      "meaningEn": "to be present at an event",
      "exampleEn": "All managers must attend the weekly meeting.",
      "exampleVi": "Tất cả quản lý phải tham dự cuộc họp hằng tuần.",
      "tags": ["toeic", "meeting", "b1"]
    },
    {
      "front": "hold a meeting",
      "back": "tổ chức cuộc họp",
      "partOfSpeech": "phrase",
      "exampleEn": "We will hold a meeting at 9 a.m. tomorrow.",
      "exampleVi": "Chúng ta sẽ tổ chức cuộc họp lúc 9 giờ sáng mai."
    }
  ]
}`;

export const FLASHCARD_JSON_USAGE_STEPS = [
  "Mở ChatGPT và dán prompt mẫu.",
  "Thay chủ đề, số lượng, trình độ rồi yêu cầu chỉ trả JSON thuần.",
  "Sao chép kết quả, dán vào ô bên dưới và bấm Tạo preview.",
] as const;

export function buildFlashcardJsonChatPrompt(deckTitle?: string | null) {
  const normalizedDeckTitle = deckTitle?.trim();
  const targetDeck = normalizedDeckTitle
    ? `bộ flashcard "${normalizedDeckTitle}"`
    : "bộ flashcard của tôi";

  return `Tôi muốn tạo dữ liệu cho ${targetDeck}.

Hãy trả về DUY NHẤT JSON hợp lệ để tôi có thể copy trực tiếp vào hệ thống của tôi.
Không giải thích.
Không thêm markdown.
Không bọc trong \`\`\`json.

Format:
{
  "title": "[TEN_BO_FLASHCARD]",
  "cards": [
    {
      "front": "từ hoặc cụm từ tiếng Anh",
      "back": "nghĩa tiếng Việt",
      "partOfSpeech": "verb / noun / phrase",
      "pronunciation": "phiên âm IPA nếu có",
      "meaningEn": "giải nghĩa ngắn bằng tiếng Anh nếu có",
      "exampleEn": "câu ví dụ tiếng Anh",
      "exampleVi": "nghĩa tiếng Việt của câu ví dụ",
      "tags": ["toeic", "business", "b1"]
    }
  ]
}

Yêu cầu:
- Chủ đề: [DIEN_CHU_DE_O_DAY]
- Số lượng: [DIEN_SO_LUONG]
- Trình độ: [A2 / B1 / B2]
- Mặt trước là tiếng Anh, mặt sau là tiếng Việt.
- Nội dung ngắn gọn, không trùng lặp.

Hãy kiểm tra lại để JSON parse được bằng JSON.parse trước khi trả kết quả.`;
}

export type PreviewContext =
  | { kind: "ai"; language: FlashcardPreviewLanguage }
  | { kind: "json" }
  | null;

export function toCommaList(value?: string[] | null) {
  return (value ?? []).join(", ");
}

export function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildPreviewItemPatch(
  item: FlashcardPreviewItem,
  context: PreviewContext,
): FlashcardPreviewItem {
  if (!item.metadata) return item;

  const metadata = { ...item.metadata };
  if (context?.kind === "ai") {
    if (context.language === "en-vi") {
      metadata.expression = item.front.trim() || metadata.expression;
      metadata.meaningVi = item.back.trim() || metadata.meaningVi;
    } else if (context.language === "vi-en") {
      metadata.meaningVi = item.front.trim() || metadata.meaningVi;
      metadata.expression = item.back.trim() || metadata.expression;
      metadata.meaningEn = item.back.trim() || metadata.meaningEn;
    } else {
      metadata.expression = item.front.trim() || metadata.expression;
      metadata.meaningEn = item.back.trim() || metadata.meaningEn;
    }
  }

  metadata.tags = item.tags;
  return {
    ...item,
    metadata,
  };
}

export function stripPreviewItemForSave(
  item: FlashcardPreviewItem,
): FlashcardPreviewItem {
  const metadata = item.metadata
    ? (() => {
        const { version: _version, ...rest } = item.metadata;
        return rest;
      })()
    : undefined;

  return {
    ...item,
    metadata,
  };
}
