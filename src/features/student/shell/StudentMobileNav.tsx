"use client";

import { useState } from "react";
import type { StudentNavItem } from "./config";
import { BookOpen, Headphones, PenTool, ChevronDown } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  router: { push: (href: string) => void };
  items: StudentNavItem[];
};

export function StudentMobileNav({ open, onClose, pathname, router, items }: Props) {
  const [practiceOpen, setPracticeOpen] = useState(false);
  const practiceActive =
    pathname === "/student/listening" ||
    pathname === "/student/reading" ||
    pathname === "/student/writing";

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed left-0 right-0 top-16 z-40 bg-white shadow-lg md:hidden">
        <nav className="p-4">
          {items.map((item) => {
            const isActive = item.href !== "#" && pathname === item.href;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.onClick) item.onClick();
                  else router.push(item.href);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}

          <div className="mt-2">
            <button
              type="button"
              onClick={() => setPracticeOpen((v: boolean) => !v)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 transition-all ${
                practiceActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <BookOpen className="h-5 w-5" />
                <span className="font-medium">Luyện tập</span>
              </span>
              <ChevronDown className={`h-4 w-4 transition ${practiceOpen ? "rotate-180" : ""}`} />
            </button>

            {practiceOpen ? (
              <div className="mt-1 space-y-1 rounded-lg bg-gray-50 p-2">
                <button
                  type="button"
                  onClick={() => {
                    router.push("/student/listening");
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    pathname === "/student/listening" ? "bg-white text-blue-700" : "text-slate-700 hover:bg-white"
                  }`}
                >
                  <Headphones className="h-4 w-4" />
                  Luyện Nghe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/student/reading");
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    pathname === "/student/reading" ? "bg-white text-blue-700" : "text-slate-700 hover:bg-white"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Luyện Đọc
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/student/writing");
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    pathname === "/student/writing" ? "bg-white text-blue-700" : "text-slate-700 hover:bg-white"
                  }`}
                >
                  <PenTool className="h-4 w-4" />
                  Luyện Viết
                </button>
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </>
  );
}
