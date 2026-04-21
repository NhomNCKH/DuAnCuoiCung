"use client";
// CreateExamModal - Step 1: Tạo exam template cơ bản
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from '@/hooks/useAuth';

/** Dữ liệu form vừa gửi — dùng hiển thị ngay modal chi tiết, không phải chờ GET */
export interface CreateExamSuccessSnapshot {
  code: string;
  name: string;
  mode: string;
  totalDurationSec: number;
  totalQuestions: number;
  examDate?: string;
  instructions?: string;
  shuffleQuestionOrder: boolean;
  shuffleOptionOrder: boolean;
}

interface Props {
  onClose: () => void;
  onSuccess: (id: string, snapshot: CreateExamSuccessSnapshot) => void;
}

const MODES = [
  { value:"practice", label:"Practice", desc:"Luyện tập theo từng phần" },
  { value:"mock_test", label:"Mock Test", desc:"Thi thử chuẩn TOEIC" },
  { value:"official_exam", label:"Official Exam", desc:"Kỳ thi chính thức" },
];

export function CreateExamModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    code:"", name:"", mode:"mock_test",
    totalDurationSec:7200, totalQuestions:200,
    examDate: "",
    instructions:"", shuffleQuestionOrder:false, shuffleOptionOrder:false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const validate = (): string | null => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code) return "Vui lòng điền Code";
    if (code.length < 3) return "Code phải có ít nhất 3 ký tự";
    if (code.length > 50) return "Code tối đa 50 ký tự";
    if (!name) return "Vui lòng điền Tên đề thi";
    if (name.length < 3) return "Tên đề thi phải có ít nhất 3 ký tự";
    if (!["practice", "mock_test", "official_exam"].includes(form.mode)) return "Mode không hợp lệ";
    if (form.mode === "official_exam" && !String(form.examDate || "").trim()) return "Vui lòng chọn ngày thi";
    if (!form.totalDurationSec || form.totalDurationSec < 1) return "Thời gian phải lớn hơn 0";
    if (!form.totalQuestions || form.totalQuestions < 1) return "Số câu phải lớn hơn 0";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validErr = validate();
    if (validErr) { setErr(validErr); return; }
    setSaving(true); setErr("");
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim(),
        name: form.name.trim(),
        mode: form.mode,
        totalDurationSec: Number(form.totalDurationSec),
        totalQuestions: Number(form.totalQuestions),
        shuffleQuestionOrder: form.shuffleQuestionOrder,
        shuffleOptionOrder: form.shuffleOptionOrder,
      };
      if (form.mode === "official_exam" && String(form.examDate || "").trim()) {
        payload.examDate = String(form.examDate).trim();
      }
      if (form.instructions.trim()) payload.instructions = form.instructions.trim();
      const res = await apiClient.admin.examTemplate.create(payload);
      const id = (res.data as any)?.id;
      if (!id) throw new Error("Không nhận được ID từ server");
      onSuccess(id, {
        code: form.code.trim(),
        name: form.name.trim(),
        mode: form.mode,
        totalDurationSec: Number(form.totalDurationSec),
        totalQuestions: Number(form.totalQuestions),
        examDate: form.mode === "official_exam" ? (String(form.examDate || "").trim() || undefined) : undefined,
        instructions: form.instructions.trim() || undefined,
        shuffleQuestionOrder: form.shuffleQuestionOrder,
        shuffleOptionOrder: form.shuffleOptionOrder,
      });
    } catch(e:any){setErr(e.message||"Tạo thất bại");}
    finally{setSaving(false);}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[1.5px]" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600/40 dark:bg-slate-950">
        
        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-6 dark:border-slate-600/40 dark:bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Tạo đề thi mới</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bước 5/11 — Khởi tạo Template</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
          {err && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{err}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Code *</label>
              <input
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="VD: TOEIC-2024-01"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tên đề thi *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Đề thi thử tháng 1"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Chế độ thi</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MODES.map(m => (
                <button key={m.value} type="button" onClick={() => setForm({ ...form, mode: m.value })}
                  className={[
                    "rounded-2xl border p-4 text-left transition",
                    form.mode === m.value
                      ? "border-amber-300 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10"
                      : "border-slate-200 bg-white hover:border-amber-300/60 hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:hover:bg-white/5",
                  ].join(" ")}>
                  <p className={`text-sm font-bold ${form.mode === m.value ? "text-amber-700 dark:text-amber-200" : "text-slate-800 dark:text-slate-100"}`}>{m.label}</p>
                  <p className="mt-1 text-[10px] font-medium leading-tight text-slate-500 dark:text-slate-400">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thời gian (giây) *</label>
              <input
                type="number" min={1}
                value={form.totalDurationSec || ""}
                onChange={e => setForm({ ...form, totalDurationSec: e.target.value ? Math.max(1, parseInt(e.target.value)) : 0 })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
              />
              {form.totalDurationSec > 0 && <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{Math.floor(form.totalDurationSec / 60)} phút</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tổng số câu *</label>
              <input
                type="number" min={1}
                value={form.totalQuestions || ""}
                onChange={e => setForm({ ...form, totalQuestions: e.target.value ? Math.max(1, parseInt(e.target.value)) : 0 })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
              />
            </div>
          </div>

          {form.mode === "official_exam" && (
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ngày thi *</label>
              <input
                type="date"
                value={form.examDate}
                onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                style={{ colorScheme: "dark" }}
              />
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Chỉ áp dụng cho Official Exam.</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hướng dẫn</label>
            <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={2} placeholder="Nhập hướng dẫn..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20" />
          </div>

          <div className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600/40 dark:bg-slate-950/20">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.shuffleQuestionOrder} onChange={e => setForm({ ...form, shuffleQuestionOrder: e.target.checked })} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
              Xáo trộn câu hỏi
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.shuffleOptionOrder} onChange={e => setForm({ ...form, shuffleOptionOrder: e.target.checked })} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
              Xáo trộn đáp án
            </label>
          </div>
        </form>

        <div className="flex gap-3 border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-600/40 dark:bg-slate-950/20">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5">Hủy</button>
          <button type="submit" onClick={handleSubmit} disabled={saving} className="flex-[2] rounded-xl bg-amber-500 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Tạo & Tiếp tục
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
