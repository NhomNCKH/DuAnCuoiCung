import assert from "node:assert/strict";
import test from "node:test";
import type { FlashcardPreviewItem } from "./flashcard-ai";
import {
  buildPreviewItemPatch,
  buildFlashcardJsonChatPrompt,
  parseCommaList,
  stripPreviewItemForSave,
  toCommaList,
} from "./flashcard-generate";

test("parseCommaList trims values and removes blanks", () => {
  assert.deepEqual(parseCommaList(" toeic, meeting , , b1 "), [
    "toeic",
    "meeting",
    "b1",
  ]);
});

test("toCommaList joins values safely", () => {
  assert.equal(toCommaList(["toeic", "meeting", "b1"]), "toeic, meeting, b1");
  assert.equal(toCommaList([]), "");
  assert.equal(toCommaList(undefined), "");
});

test("buildFlashcardJsonChatPrompt includes strict JSON instructions and deck title", () => {
  const prompt = buildFlashcardJsonChatPrompt("Core 600");

  assert.match(prompt, /Core 600/);
  assert.match(prompt, /DUY NHẤT JSON hợp lệ/);
  assert.match(prompt, /"cards"/);
  assert.match(prompt, /JSON\.parse/);
});

test("stripPreviewItemForSave removes metadata.version and preserves the rest", () => {
  const item: FlashcardPreviewItem = {
    front: "attend",
    back: "tham dự",
    tags: ["toeic", "meeting"],
    metadata: {
      version: 1,
      expression: "attend",
      meaningVi: "tham dự",
      source: "ai_generated",
      contentType: "vocabulary",
    },
  };

  assert.deepEqual(stripPreviewItemForSave(item), {
    front: "attend",
    back: "tham dự",
    tags: ["toeic", "meeting"],
    metadata: {
      expression: "attend",
      meaningVi: "tham dự",
      source: "ai_generated",
      contentType: "vocabulary",
    },
  });
});

test("buildPreviewItemPatch keeps JSON preview untouched except metadata.tags sync", () => {
  const item: FlashcardPreviewItem = {
    front: "attend",
    back: "tham dự",
    tags: ["toeic"],
    metadata: {
      expression: "attend",
      meaningVi: "tham dự",
      tags: [],
    },
  };

  assert.deepEqual(buildPreviewItemPatch(item, { kind: "json" }), {
    ...item,
    metadata: {
      expression: "attend",
      meaningVi: "tham dự",
      tags: ["toeic"],
    },
  });
});

test("buildPreviewItemPatch keeps AI metadata aligned for en-vi", () => {
  const item: FlashcardPreviewItem = {
    front: "hold a meeting",
    back: "tổ chức cuộc họp",
    tags: ["toeic", "meeting"],
    metadata: {
      expression: "old",
      meaningVi: "old",
      meaningEn: "old",
      tags: [],
    },
  };

  assert.deepEqual(buildPreviewItemPatch(item, { kind: "ai", language: "en-vi" }), {
    ...item,
    metadata: {
      expression: "hold a meeting",
      meaningVi: "tổ chức cuộc họp",
      meaningEn: "old",
      tags: ["toeic", "meeting"],
    },
  });
});

test("buildPreviewItemPatch keeps AI metadata aligned for vi-en", () => {
  const item: FlashcardPreviewItem = {
    front: "tham dự",
    back: "attend",
    tags: ["toeic"],
    metadata: {
      expression: "old",
      meaningVi: "old",
      meaningEn: "old",
      tags: [],
    },
  };

  assert.deepEqual(buildPreviewItemPatch(item, { kind: "ai", language: "vi-en" }), {
    ...item,
    metadata: {
      expression: "attend",
      meaningVi: "tham dự",
      meaningEn: "attend",
      tags: ["toeic"],
    },
  });
});

test("buildPreviewItemPatch keeps AI metadata aligned for en-en", () => {
  const item: FlashcardPreviewItem = {
    front: "attend",
    back: "to be present at an event",
    tags: ["b1"],
    metadata: {
      expression: "old",
      meaningEn: "old",
      tags: [],
    },
  };

  assert.deepEqual(buildPreviewItemPatch(item, { kind: "ai", language: "en-en" }), {
    ...item,
    metadata: {
      expression: "attend",
      meaningEn: "to be present at an event",
      tags: ["b1"],
    },
  });
});

test("buildPreviewItemPatch leaves item without metadata unchanged", () => {
  const item: FlashcardPreviewItem = {
    front: "attend",
    back: "tham dự",
    tags: ["toeic"],
  };

  assert.equal(buildPreviewItemPatch(item, { kind: "ai", language: "en-vi" }), item);
});
