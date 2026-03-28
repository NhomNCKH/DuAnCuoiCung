// app/admin/exams/hooks/useExamActions.ts
import { useState } from "react";
import { examApi } from "../api/examApi";
import { ExamTemplate } from "../types";

export function useExamActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createExam = async (data: Partial<ExamTemplate>) => {
    setLoading(true);
    try {
      const response = await examApi.create(data);
      return response.data;
    } catch (err: any) {
      setError(err.message || "Không thể tạo đề thi");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateExam = async (id: string, data: Partial<ExamTemplate>) => {
    setLoading(true);
    try {
      const response = await examApi.update(id, data);
      return response.data;
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật đề thi");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteExam = async (id: string) => {
    setLoading(true);
    try {
      await examApi.delete(id);
    } catch (err: any) {
      setError(err.message || "Không thể xóa đề thi");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const publishExam = async (id: string) => {
    setLoading(true);
    try {
      const response = await examApi.publish(id);
      return response.data;
    } catch (err: any) {
      setError(err.message || "Không thể xuất bản đề thi");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const duplicateExam = async (id: string) => {
    setLoading(true);
    try {
      const response = await examApi.duplicate(id);
      return response.data;
    } catch (err: any) {
      setError(err.message || "Không thể nhân bản đề thi");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const archiveExam = async (id: string) => {
    setLoading(true);
    try {
      const response = await examApi.archive(id);
      return response.data;
    } catch (err: any) {
      setError(err.message || "Không thể lưu trữ đề thi");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createExam,
    updateExam,
    deleteExam,
    publishExam,
    duplicateExam,
    archiveExam,
  };
}