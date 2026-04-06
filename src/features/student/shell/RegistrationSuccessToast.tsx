"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Mail, XCircle } from "lucide-react";

type Props = {
  open: boolean;
  email?: string;
  onDismiss: () => void;
};

export function RegistrationSuccessToast({ open, email, onDismiss }: Props) {
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
                  Lịch thi sẽ được thông báo qua email và trong trang hồ sơ của bạn
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
