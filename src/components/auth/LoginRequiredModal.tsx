"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Lock, X } from "lucide-react";
import { buildAuthRoute } from "@/lib/auth/routing";

type Props = {
  open: boolean;
  onClose: () => void;
  /** where user wanted to go */
  redirectTo?: string | null;
  title?: string;
  description?: string;
};

export function LoginRequiredModal({
  open,
  onClose,
  redirectTo,
  title = "Bạn cần đăng nhập",
  description = "Tính năng này yêu cầu đăng nhập để đảm bảo dữ liệu cá nhân và tiến độ học tập được lưu lại.",
}: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/55"
          />

          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_25px_60px_-12px_rgba(15,23,42,0.35)]"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{title}</h3>
                  <p className="mt-0.5 text-sm text-slate-600">{description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildAuthRoute({ mode: "login", redirect: redirectTo ?? null })}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  onClick={onClose}
                >
                  Đăng nhập
                </Link>
                <Link
                  href={buildAuthRoute({ mode: "register", redirect: redirectTo ?? null })}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={onClose}
                >
                  Đăng ký
                </Link>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Để sau
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

