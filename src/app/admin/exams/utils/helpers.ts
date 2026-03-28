// app/admin/exams/utils/helpers.ts
import { ExamTemplate, ExamStats } from "../types";

export const calculateStats = (templates: ExamTemplate[]): ExamStats => {
  return {
    total: templates.length,
    published: templates.filter(t => t.status === "published").length,
    draft: templates.filter(t => t.status === "draft").length,
    archived: templates.filter(t => t.status === "archived").length,
    totalAttempts: 0,
  };
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return formatDate(dateString);
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case "easy": return "Dễ";
    case "medium": return "Trung bình";
    case "hard": return "Khó";
    default: return difficulty;
  }
};

export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case "easy": return "bg-green-100 text-green-700";
    case "medium": return "bg-yellow-100 text-yellow-700";
    case "hard": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
};