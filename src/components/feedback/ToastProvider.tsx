"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

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
}

interface ToastContextValue {
  notify: (payload: ToastPayload) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastIcon(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "error":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    default:
      return <Info className="h-5 w-5 text-blue-600" />;
  }
}

function getToastStyle(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return "border-green-200 bg-green-50/95";
    case "error":
      return "border-red-200 bg-red-50/95";
    case "warning":
      return "border-amber-200 bg-amber-50/95";
    default:
      return "border-blue-200 bg-blue-50/95";
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
      const durationMs = payload.durationMs ?? 2800;

      setToasts((prev) => [...prev, { ...payload, id, variant }]);

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
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className={`pointer-events-auto overflow-hidden rounded-xl border px-3 py-2 shadow-lg backdrop-blur ${getToastStyle(
                toast.variant
              )}`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">{getToastIcon(toast.variant)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{toast.title}</p>
                  {toast.message ? <p className="text-xs text-slate-600">{toast.message}</p> : null}
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="rounded p-1 text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
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

