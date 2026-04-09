"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Award, X, GraduationCap, User, AlertCircle } from "lucide-react";

type UserLite = { name?: string; email?: string } | null | undefined;

type Props = {
  open: boolean;
  onClose: () => void;
  user: UserLite;
  isSubmitting: boolean;
  onConfirm: () => void;
};

export function ExamRegistrationModal({
  open,
  onClose,
  user,
  isSubmitting,
  onConfirm,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3, damping: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                  <Award className="h-6 w-6" />
                  Đăng ký thi chứng chỉ
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                  <GraduationCap className="h-10 w-10 text-blue-600" />
                </div>
                <h4 className="mb-2 text-lg font-semibold text-gray-900">Xác nhận đăng ký thi</h4>
                <p className="text-sm text-gray-600">
                  Bạn có chắc chắn muốn đăng ký tham gia kỳ thi chứng chỉ?
                </p>
              </div>

              <div className="mb-6 rounded-xl bg-blue-50 p-4">
                <h5 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                  <User className="h-4 w-4 text-blue-600" />
                  Thông tin thí sinh
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Họ và tên:</span>
                    <span className="font-medium text-gray-900">{user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">{user?.email}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="mb-1 text-sm font-medium text-amber-800">Lưu ý quan trọng:</p>
                    <p className="text-xs text-amber-700">
                      Sau khi đăng ký, bạn sẽ nhận được thông tin chi tiết về lịch thi qua email. Vui lòng kiểm tra
                      email thường xuyên để không bỏ lỡ thông báo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting}
                className={`flex-1 rounded-xl px-4 py-2.5 font-medium text-white transition-all ${
                  isSubmitting
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg"
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang xử lý...
                  </div>
                ) : (
                  "Xác nhận đăng ký"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
