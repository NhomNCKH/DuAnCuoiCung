import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  PenTool,
  ClipboardCheck,
  FileText,
  Award,
} from "lucide-react";

export type StudentNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  onClick?: () => void;
};

/** Cấu hình menu student — tách khỏi layout để dễ bảo trì. */
export function createStudentNavItems(onRegisterExam: () => void): StudentNavItem[] {
  return [
    { icon: LayoutDashboard, label: "Tổng quan", href: "/student/dashboard" },
    { icon: BookOpen, label: "Luyện đọc", href: "/student/reading" },
    { icon: PenTool, label: "Luyện viết", href: "/student/writing" },
    { icon: FileText, label: "Kiểm tra nhanh", href: "/student/mock-test" },
    { icon: ClipboardCheck, label: "Thi thử", href: "/student/practicetest" },
    {
      icon: Award,
      label: "Đăng ký thi chứng chỉ",
      href: "#",
      onClick: onRegisterExam,
    },
  ];
}
