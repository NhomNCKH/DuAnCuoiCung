"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, CircleX, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastPayload {
  title: string;
  message?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends ToastPayload {
  id: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastContextValue {
  notify: (payload: ToastPayload) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Thời gian hiển thị mặc định ~3s (đồng bộ thanh progress) */
const DEFAULT_TOAST_MS = 3000;

const VARIANT = {
  success: {
    bar: "bg-emerald-600",
    progress: "bg-emerald-600",
    icon: "text-emerald-600",
  },
  error: {
    bar: "bg-red-600",
    progress: "bg-red-600",
    icon: "text-red-600",
  },
  warning: {
    bar: "bg-amber-500",
    progress: "bg-amber-500",
    icon: "text-amber-600",
  },
  info: {
    bar: "bg-blue-600",
    progress: "bg-blue-600",
    icon: "text-blue-600",
  },
} as const;

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const cls = `h-6 w-6 shrink-0 ${VARIANT[variant].icon}`;
  switch (variant) {
    case "success":
      return <CircleCheck className={cls} strokeWidth={2} aria-hidden />;
    case "error":
      return <CircleX className={cls} strokeWidth={2} aria-hidden />;
    case "warning":
      return <CircleAlert className={cls} strokeWidth={2} aria-hidden />;
    default:
      return <Info className={cls} strokeWidth={2} aria-hidden />;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (payload: ToastPayload) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const variant = payload.variant ?? "info";
      const durationMs = payload.durationMs ?? DEFAULT_TOAST_MS;

      setToasts((prev) => [...prev, { ...payload, id, variant, durationMs }]);

      window.setTimeout(() => {
        dismiss(id);
      }, durationMs);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-2 top-2 z-[200] flex w-[360px] max-w-[calc(100vw-1rem)] flex-col gap-2 md:right-4 md:top-4 md:max-w-[calc(100vw-2rem)]">
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((toast) => {
            const v = VARIANT[toast.variant];
            const durationSec = toast.durationMs / 1000;
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="pointer-events-auto flex overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
                role="status"
                aria-live="polite"
              >
                <div className={`w-1.5 shrink-0 self-stretch ${v.bar}`} aria-hidden />

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex gap-2 px-3 pb-3 pt-3">
                    <div className="mt-0.5">
                      <ToastIcon variant={toast.variant} />
                    </div>
                    <div className="min-w-0 flex-1 pr-1">
                      <p className="text-sm font-bold leading-snug text-slate-900">{toast.title}</p>
                      {toast.message ? (
                        <p className="mt-0.5 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-xs font-normal leading-relaxed text-slate-500">
                          {toast.message}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(toast.id)}
                      className="-mr-1 -mt-1 shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Đóng thông báo"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>

                  <div className="relative h-0.5 w-full overflow-hidden bg-slate-100">
                    <motion.div
                      key={`${toast.id}-bar`}
                      className={`absolute inset-y-0 left-0 ${v.progress}`}
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: durationSec, ease: "linear" }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within ToastProvider");
  }
  return context;
}
