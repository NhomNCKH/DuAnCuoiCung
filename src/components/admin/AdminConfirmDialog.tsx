"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  loading = false,
  danger = false,
  onClose,
  onConfirm,
}: AdminConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="close confirm dialog" />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="surface relative w-full max-w-md p-5"
          >
            <div className="mb-3 flex items-start gap-3">
              <div className={`rounded-lg p-2 ${danger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

