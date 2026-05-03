import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBackFromMeta,
  parseCommaList,
  parseVocabMeta,
  serializeVocabMeta,
  toList,
} from "./flashcard-vocab";

test("toList trims and filters empty values", () => {
  assert.deepEqual(toList([" toeic ", "", "meeting "]), ["toeic", "meeting"]);
  assert.deepEqual(toList(undefined), []);
});

test("parseCommaList trims and filters blank entries", () => {
  assert.deepEqual(parseCommaList(" toeic, meeting, , b1 "), [
    "toeic",
    "meeting",
    "b1",
  ]);
});

test("serializeVocabMeta and parseVocabMeta round-trip valid metadata", () => {
  const serialized = serializeVocabMeta({
    version: 1,
    expression: "attend",
    partOfSpeech: "verb",
    pronunciation: "/əˈtend/",
    meaningVi: "tham dự",
    meaningEn: "to be present at an event",
    synonyms: ["join"],
    antonyms: ["miss"],
    exampleEn: "She attended the meeting.",
    exampleVi: "Cô ấy tham dự cuộc họp.",
    source: "ai_generated",
    level: "B1",
    contentType: "vocabulary",
    tags: ["toeic", "meeting"],
  });

  const parsed = parseVocabMeta(serialized);

  assert.deepEqual(parsed, {
    version: 1,
    expression: "attend",
    partOfSpeech: "verb",
    pronunciation: "/əˈtend/",
    meaningVi: "tham dự",
    meaningEn: "to be present at an event",
    synonyms: ["join"],
    antonyms: ["miss"],
    exampleEn: "She attended the meeting.",
    exampleVi: "Cô ấy tham dự cuộc họp.",
    source: "ai_generated",
    level: "B1",
    contentType: "vocabulary",
    tags: ["toeic", "meeting"],
  });
});

test("parseVocabMeta returns null for invalid payloads", () => {
  assert.equal(parseVocabMeta("plain text note"), null);
  assert.equal(parseVocabMeta("__VOCAB_META_V1__not-json"), null);
  assert.equal(
    parseVocabMeta('__VOCAB_META_V1__{"version":2,"expression":"attend"}'),
    null,
  );
});

test("buildBackFromMeta prefers Vietnamese meaning then English meaning", () => {
  assert.equal(
    buildBackFromMeta({
      version: 1,
      expression: "attend",
      meaningVi: "tham dự",
      meaningEn: "to be present at an event",
    }),
    "tham dự",
  );

  assert.equal(
    buildBackFromMeta({
      version: 1,
      expression: "attend",
      meaningEn: "to be present at an event",
    }),
    "to be present at an event",
  );
});
