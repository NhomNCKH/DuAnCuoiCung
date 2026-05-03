export const FLASHCARD_PREVIEW_LANGUAGES = ["en-vi", "vi-en", "en-en"] as const;
export const FLASHCARD_CONTENT_TYPES = [
  "vocabulary",
  "phrase",
  "collocation",
  "sentence",
  "mixed",
] as const;
export const FLASHCARD_SOURCES = [
  "manual",
  "json_import",
  "ai_generated",
] as const;

export type FlashcardPreviewLanguage =
  (typeof FLASHCARD_PREVIEW_LANGUAGES)[number];
export type FlashcardContentType = (typeof FLASHCARD_CONTENT_TYPES)[number];
export type FlashcardSource = (typeof FLASHCARD_SOURCES)[number];

export type FlashcardPreviewMetadata = {
  version?: number;
  expression?: string;
  partOfSpeech?: string;
  pronunciation?: string;
  meaningVi?: string;
  meaningEn?: string;
  phrasalVerbs?: string[];
  synonyms?: string[];
  antonyms?: string[];
  exampleEn?: string;
  exampleVi?: string;
  note?: string;
  source?: FlashcardSource;
  level?: string;
  contentType?: FlashcardContentType;
  tags?: string[];
};

export type FlashcardPreviewItem = {
  front: string;
  back: string;
  tags?: string[];
  metadata?: FlashcardPreviewMetadata;
  note?: string;
};

export type FlashcardPreviewResponse = {
  title: string;
  items: FlashcardPreviewItem[];
  warnings: string[];
  source: FlashcardSource;
  model?: string;
  formatVersion?: string;
};

export type PreviewFlashcardsFromJsonPayload = {
  rawJson: string;
};

export type PreviewFlashcardsFromAiPayload = {
  topic: string;
  language: FlashcardPreviewLanguage;
  level?: string;
  cardCount: number;
  contentType: FlashcardContentType;
  requirements?: string;
};

export type BulkCreateFlashcardsPayload = {
  items: FlashcardPreviewItem[];
};
