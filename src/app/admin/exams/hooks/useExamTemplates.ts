import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { ExamTemplate } from "../types";

export type { ExamTemplate };

export function useExamTemplates() {
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    totalAttempts: 0,
  });

  const fetchTemplates = useCallback(async (params?: Record<string, string>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.admin.examTemplate.list(params);

      let templatesData: ExamTemplate[] = [];
      if (Array.isArray(response.data)) {
        templatesData = response.data as ExamTemplate[];
      } else if (response.data && Array.isArray((response.data as any).items)) {
        templatesData = (response.data as any).items as ExamTemplate[];
      } else if (response.data && Array.isArray((response.data as any).data)) {
        templatesData = (response.data as any).data as ExamTemplate[];
      }

      setTemplates(templatesData);
      setStats({
        total: templatesData.length,
        published: templatesData.filter(t => t.status === "published").length,
        draft: templatesData.filter(t => t.status === "draft").length,
        archived: templatesData.filter(t => t.status === "archived").length,
        totalAttempts: 0,
      });
    } catch (err) {
      console.error("Fetch templates error:", err);
      setError("Có lỗi xảy ra khi tải dữ liệu");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, stats, refresh: fetchTemplates };
}
