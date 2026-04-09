import type {
  LearnerAttemptSessionAsset,
  LearnerAttemptResultData,
  LearnerAttemptSessionData,
} from "@/types/learner-exam";

export interface MockExamSharedAsset {
  id: string;
  kind: string;
  storageKey?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  durationSec?: number | null;
  sortOrder?: number;
  contentText?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface MockExamQuestion {
  id: string;
  displayNumber: number;
  questionNumber?: number;
  content: string;
  options?: { key: string; text: string }[];
  part?: string;
  stem?: string | null;
  transcript?: string | null;
  assets: MockExamSharedAsset[];
  sectionId: string;
  sectionOrder: number;
  sectionInstructions?: string | null;
  groupId: string;
  groupCode?: string;
  groupTitle?: string;
  groupDisplayOrder: number;
}

export interface MockExamQuestionGroup {
  id: string;
  title?: string;
  code?: string;
  part?: string;
  displayOrder: number;
  questions: MockExamQuestion[];
  passage?: string;
  transcript?: string | null;
  assets: MockExamSharedAsset[];
}

export interface MockExamSection {
  id: string;
  name: string;
  part?: string;
  sectionOrder: number;
  instructions?: string | null;
  questionGroups: MockExamQuestionGroup[];
}

export interface MockExamAttemptView {
  id: string;
  examTemplateId: string;
  templateCode?: string;
  templateName?: string;
  status: string;
  startedAt: string;
  instructions?: string | null;
  totalDurationSec?: number;
  sections?: MockExamSection[];
  savedAnswers?: Record<string, string>;
}

export interface MockExamResultView {
  attemptId: string;
  totalScore?: number;
  listeningScore?: number;
  readingScore?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  accuracy?: number;
  timeTakenSec?: number;
}

function sortByNumber<T>(
  values: T[] | undefined,
  getValue: (value: T) => number | null | undefined,
): T[] {
  return [...(values ?? [])].sort(
    (left, right) => (getValue(left) ?? 0) - (getValue(right) ?? 0),
  );
}

function normalizeAssets(
  assets: LearnerAttemptSessionAsset[] | undefined,
): MockExamSharedAsset[] {
  return sortByNumber(assets, (asset) => asset.sortOrder).map((asset) => ({
    id: asset.id,
    kind: asset.kind,
    storageKey: asset.storageKey ?? null,
    publicUrl: asset.publicUrl ?? null,
    mimeType: asset.mimeType ?? null,
    durationSec: asset.durationSec ?? null,
    sortOrder: asset.sortOrder,
    contentText: asset.contentText ?? null,
    metadata: asset.metadata ?? null,
  }));
}

export function mapAttemptSessionToMockExam(raw: LearnerAttemptSessionData): {
  attemptData: MockExamAttemptView;
  questions: MockExamQuestion[];
  savedAnswers: Record<string, string>;
} {
  const questions: MockExamQuestion[] = [];
  let displayNumber = 1;

  const sections = sortByNumber(
    raw.template.sections,
    (section) => section.sectionOrder,
  ).map((section) => ({
    id: section.id,
    name: section.part || "Section",
    part: section.part,
    sectionOrder: section.sectionOrder,
    instructions: section.instructions ?? null,
    questionGroups: sortByNumber(section.items, (item) => item.displayOrder).map(
      (item) => {
        const group = item.questionGroup;
        const assets = normalizeAssets(group?.assets);
        const passage =
          group?.stem ??
          assets.find((asset) => asset.kind === "passage")?.contentText ??
          null;
        const transcript =
          assets.find((asset) => asset.kind === "transcript")?.contentText ?? null;
        const mappedQuestions = sortByNumber(
          group?.questions,
          (question) => question.questionNo,
        ).map((question) => {
          const mappedQuestion: MockExamQuestion = {
            id: question.id,
            displayNumber: displayNumber++,
            questionNumber: question.questionNo,
            content: question.prompt ?? "",
            part: group?.part || section.part,
            stem: passage,
            transcript,
            assets,
            sectionId: section.id,
            sectionOrder: section.sectionOrder,
            sectionInstructions: section.instructions ?? null,
            groupId: group?.id ?? item.id,
            groupCode: group?.code,
            groupTitle: group?.title,
            groupDisplayOrder: item.displayOrder,
            options: sortByNumber(question.options, (option) => option.sortOrder).map(
              (option) => ({
                key: option.optionKey ?? "",
                text: option.content ?? "",
              }),
            ),
          };

          questions.push(mappedQuestion);
          return mappedQuestion;
        });

        return {
          id: group?.id ?? item.id,
          title: group?.title,
          code: group?.code,
          part: group?.part || section.part,
          displayOrder: item.displayOrder,
          passage: passage ?? undefined,
          transcript,
          assets,
          questions: mappedQuestions,
        };
      },
    ),
  }));

  const savedAnswers = Object.fromEntries(
    (raw.savedAnswers ?? [])
      .filter((item) => !!item.selectedOptionKey)
      .map((item) => [item.questionId, item.selectedOptionKey as string]),
  );

  return {
    attemptData: {
      id: raw.attempt.id,
      examTemplateId: raw.attempt.examTemplateId,
      templateCode: raw.template.template?.code,
      templateName: raw.template.template?.name,
      status: raw.attempt.status,
      startedAt: raw.attempt.startedAt,
      instructions: raw.template.template?.instructions,
      totalDurationSec: raw.template.template?.totalDurationSec,
      sections,
      savedAnswers,
    },
    questions,
    savedAnswers,
  };
}

export function mapAttemptResultToMockExam(
  raw: LearnerAttemptResultData,
): MockExamResultView {
  const totalQuestions = raw.attempt.totalQuestions ?? 0;
  const correctAnswers = raw.attempt.correctCount ?? 0;
  const accuracy =
    totalQuestions > 0
      ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2))
      : 0;

  return {
    attemptId: raw.attempt.id,
    totalScore: raw.attempt.totalScore,
    listeningScore: raw.attempt.listeningScaledScore,
    readingScore: raw.attempt.readingScaledScore,
    totalQuestions,
    correctAnswers,
    accuracy,
    timeTakenSec: raw.attempt.durationSec ?? undefined,
  };
}
