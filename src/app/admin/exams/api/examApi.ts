// app/admin/exams/api/examApi.ts
// Dùng apiClient thay vì raw fetch để tái sử dụng auth headers
import { apiClient } from '@/lib/api-client';

export interface ExamTemplate {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  type: string;
  sections: unknown[];
  rules: unknown[];
  totalQuestions: number;
  duration: number;
  difficulty: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  usageCount: number;
  avgScore: number;
  tags: string[];
}

export const examApi = {
  getAll: (params?: { status?: string; type?: string; search?: string }) =>
    apiClient.admin.examTemplate.list(params),

  getById: (id: string) =>
    apiClient.admin.examTemplate.get(id),

  create: (data: Partial<ExamTemplate>) =>
    apiClient.admin.examTemplate.create(data as Record<string, unknown>),

  update: (id: string, data: Partial<ExamTemplate>) =>
    apiClient.admin.examTemplate.update(id, data as Record<string, unknown>),

  delete: (id: string) =>
    apiClient.admin.examTemplate.delete(id),

  updateSections: (id: string, sections: unknown[]) =>
    apiClient.admin.examTemplate.replaceSections(id, sections),

  updateRules: (id: string, rules: unknown[]) =>
    apiClient.admin.examTemplate.replaceRules(id, rules),

  addItemsManual: (id: string, items: unknown[]) =>
    apiClient.admin.examTemplate.addManualItems(id, items),

  autoFillItems: (id: string) =>
    apiClient.admin.examTemplate.autoFillItems(id),

  reorderItems: (id: string, items: { itemId: string; order: number }[]) =>
    apiClient.admin.examTemplate.reorderItems(id, items),

  removeItem: (id: string, itemId: string) =>
    apiClient.admin.examTemplate.deleteItem(id, itemId),

  validate: (id: string) =>
    apiClient.admin.examTemplate.validate(id),

  preview: (id: string) =>
    apiClient.admin.examTemplate.preview(id),

  publish: (id: string) =>
    apiClient.admin.examTemplate.publish(id),

  archive: (id: string) =>
    apiClient.admin.examTemplate.archive(id),

  duplicate: (id: string) =>
    apiClient.admin.examTemplate.duplicate(id),
};
