"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info, X } from "lucide-react";

export type ConfirmDialogVariant = "default" | "warning" | "danger";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  /** Khi true, nút xác nhận hiển thị trạng thái chờ */
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

const variantStyles: Record<
  ConfirmDialogVariant,
  { accent: string; iconBg: string; confirm: string; confirmHover: string }
> = {
  default: {
    accent: "bg-blue-600",
    iconBg: "bg-blue-100 text-blue-700",
    confirm: "bg-blue-600 text-white",
    confirmHover: "hover:bg-blue-700",
  },
  warning: {
    accent: "bg-amber-500",
    iconBg: "bg-amber-100 text-amber-800",
    confirm: "bg-amber-600 text-white",
    confirmHover: "hover:bg-amber-700",
  },
  danger: {
    accent: "bg-red-600",
    iconBg: "bg-red-100 text-red-700",
    confirm: "bg-red-600 text-white",
    confirmHover: "hover:bg-red-700",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const v = variantStyles[variant];
  const showSpinner = loading || busy;
  const Icon = variant === "default" ? Info : AlertTriangle;

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  const handleConfirm = useCallback(async () => {
    try {
      setBusy(true);
      await onConfirm();
      onOpenChange(false);
    } catch {
      setBusy(false);
    }
  }, [onConfirm, onOpenChange]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const tree = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="confirm-overlay"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label="Đóng"
            onClick={() => !showSpinner && onOpenChange(false)}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="relative flex w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-1.5 shrink-0 self-stretch ${v.accent}`} aria-hidden />

            <div className="min-w-0 flex-1 p-5">
              <div className="flex gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${v.iconBg}`}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2
                    id="confirm-dialog-title"
                    className="text-lg font-extrabold leading-snug tracking-tight text-slate-900"
                  >
                    {title}
                  </h2>
                  <p
                    id="confirm-dialog-desc"
                    className="mt-2 text-sm font-semibold leading-relaxed text-slate-600"
                  >
                    {message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !showSpinner && onOpenChange(false)}
                  className="-mr-1 -mt-1 h-9 w-9 shrink-0 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Đóng"
                >
                  <X className="mx-auto h-5 w-5" strokeWidth={2} />
                </button>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={showSpinner}
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  disabled={showSpinner}
                  onClick={() => void handleConfirm()}
                  className={`rounded-lg px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${v.confirm} ${v.confirmHover}`}
                >
                  {showSpinner ? "Đang xử lý…" : confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(tree, document.body);
}
