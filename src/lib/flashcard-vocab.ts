export type VocabFlashcardMeta = {
  version: 1;
  expression: string;
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
};

const META_PREFIX = "__VOCAB_META_V1__";

export function toList(value?: string[] | null): string[] {
  return (value ?? []).map((x) => String(x).trim()).filter(Boolean);
}

export function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function toVocabMetaFromLookup(
  lookup: {
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
  } | null,
  expression: string,
): VocabFlashcardMeta {
  return {
    version: 1,
    expression: String(lookup?.expression || expression).trim(),
    partOfSpeech: String(lookup?.partOfSpeech || "").trim() || undefined,
    pronunciation: String(lookup?.pronunciation || "").trim() || undefined,
    meaningVi: String(lookup?.meaningVi || "").trim() || undefined,
    meaningEn: String(lookup?.meaningEn || "").trim() || undefined,
    phrasalVerbs: toList(lookup?.phrasalVerbs),
    synonyms: toList(lookup?.synonyms),
    antonyms: toList(lookup?.antonyms),
    exampleEn: String(lookup?.examples?.[0]?.en || "").trim() || undefined,
    exampleVi: String(lookup?.examples?.[0]?.vi || "").trim() || undefined,
    note: String(lookup?.note || "").trim() || undefined,
  };
}

export function serializeVocabMeta(meta: VocabFlashcardMeta): string {
  return `${META_PREFIX}${JSON.stringify(meta)}`;
}

export function parseVocabMeta(note?: string | null): VocabFlashcardMeta | null {
  const raw = String(note ?? "");
  if (!raw.startsWith(META_PREFIX)) return null;
  const payload = raw.slice(META_PREFIX.length).trim();
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as VocabFlashcardMeta;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildBackFromMeta(meta: VocabFlashcardMeta): string {
  if (meta.meaningVi) return meta.meaningVi;
  if (meta.meaningEn) return meta.meaningEn;
  return "";
}

