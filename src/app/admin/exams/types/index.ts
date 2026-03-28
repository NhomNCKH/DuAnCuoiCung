// app/admin/exams/types/index.ts
// Synced with BE ExamTemplate entity fields

export interface ExamTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: "draft" | "published" | "archived";
  mode: "practice" | "mock_test" | "official_exam";
  totalDurationSec: number;
  totalQuestions: number;
  instructions?: string;
  shuffleQuestionOrder?: boolean;
  shuffleOptionOrder?: boolean;
  createdAt: string;
  updatedAt: string;
  sections?: ExamSection[];
  rules?: ExamRule[];
  items?: ExamItem[];
}

export interface ExamSection {
  id?: string;
  part: string;
  sectionOrder: number;
  expectedGroupCount: number;
  expectedQuestionCount: number;
  durationSec?: number;
}

export interface ExamItem {
  id: string;
  questionGroupId: string;
  displayOrder: number;
  locked?: boolean;
  questionGroup?: { title: string; code: string; part: string };
  status?: string;
}

export interface ExamRule {
  id?: string;
  part: string;
  questionCount: number;
  groupCount?: number;
  levelDistribution?: Record<string, number>;
  requiredTagCodes?: string[];
}

export interface ExamStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  totalAttempts: number;
}

export type ExamStatus = "all" | "published" | "draft" | "archived";
export type ExamMode = "all" | "practice" | "mock_test" | "official_exam";
export type ViewMode = "grid" | "list";
