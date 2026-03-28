// app/admin/exams/hooks/useExamValidation.ts
import { useState } from "react";
import { examApi } from "../api/examApi";
import { ExamTemplate } from "../types";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function useExamValidation() {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateExam = async (id: string) => {
    setValidating(true);
    try {
      const response = await examApi.validate(id);
      const data = (response as any)?.data ?? response;
      setValidationResult({
        isValid: data.isValid ?? data.valid ?? false,
        errors: data.errors || [],
        warnings: data.warnings || [],
      });
      return response;
    } catch (error) {
      console.error("Validation failed:", error);
      setValidationResult({
        isValid: false,
        errors: ["Không thể kiểm tra tính hợp lệ"],
        warnings: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const clearValidation = () => {
    setValidationResult(null);
  };

  return {
    validating,
    validationResult,
    validateExam,
    clearValidation,
  };
}