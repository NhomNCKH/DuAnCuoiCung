"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookMarked, BookOpen, Headphones, PenLine } from "lucide-react";

const PRACTICE_TABS = [
  {
    href: "/admin/practice/vocabulary",
    label: "Từ vựng",
    icon: BookMarked,
    /** Khớp cả /vocabulary và /vocabulary/[deckId] */
    isActive: (p: string) => p === "/admin/practice/vocabulary" || p.startsWith("/admin/practice/vocabulary/"),
  },
  {
    href: "/admin/practice/reading",
    label: "Luyện đọc",
    icon: BookOpen,
    isActive: (p: string) => p.startsWith("/admin/practice/reading"),
  },
  {
    href: "/admin/practice/writing",
    label: "Luyện viết",
    icon: PenLine,
    isActive: (p: string) => p.startsWith("/admin/practice/writing"),
  },
  {
    href: "/admin/practice/listening",
    label: "Luyện nghe",
    icon: Headphones,
    isActive: (p: string) => p.startsWith("/admin/practice/listening"),
  },
] as const;

/**
 * Thanh tab giống Cài đặt (Vai trò / Quyền hạn) — áp dụng cho toàn bộ Luyện tập.
 */
export default function AdminPracticeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <nav
        className="border-b border-slate-200 admin-dark:border-[var(--admin-border)]"
        aria-label="Luyện tập"
      >
        <div className="-mb-px flex flex-wrap items-end gap-1 sm:gap-2">
          {PRACTICE_TABS.map((tab) => {
            const active = tab.isActive(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex h-11 items-center gap-2 px-2.5 text-sm font-bold transition-colors sm:px-3 ${
                  active
                    ? "text-blue-600 admin-dark:text-[var(--admin-accent)]"
                    : "text-slate-400 hover:text-slate-600 admin-dark:text-[var(--admin-muted)] admin-dark:hover:text-[var(--admin-text)]"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {tab.label}
                {active ? (
                  <motion.span
                    layoutId="admin-practice-tab-underline"
                    className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-blue-600 admin-dark:bg-[var(--admin-accent)]"
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="pb-8 pt-5">{children}</div>
    </div>
  );
}
