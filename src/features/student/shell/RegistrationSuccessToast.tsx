"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Mail, XCircle } from "lucide-react";

type Props = {
  open: boolean;
  email?: string;
  examDate?: string | null;
  onDismiss: () => void;
};

function formatDateVi(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function RegistrationSuccessToast({ open, email, examDate, onDismiss }: Props) {
  const dateLabel = formatDateVi(examDate);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 20, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 20, y: 20 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div className="min-w-[320px] rounded-lg border-l-4 border-green-500 bg-white p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h4 className="mb-1 font-semibold text-gray-900">Đăng ký thành công!</h4>
                <p className="text-sm text-gray-600">
                  {dateLabel
                    ? `Bạn đã chọn ngày thi ${dateLabel}. Email xác nhận sẽ được gửi ngay, và 07:00 sáng ngày thi hệ thống sẽ nhắc bạn.`
                    : "Email xác nhận sẽ được gửi ngay, và 07:00 sáng ngày thi hệ thống sẽ nhắc bạn."}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="h-3 w-3" />
                  <span>{email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                aria-label="Đóng"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
