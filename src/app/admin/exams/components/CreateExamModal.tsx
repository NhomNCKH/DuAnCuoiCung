"use client";
// CreateExamModal - Step 1: Tạo exam template cơ bản
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from '@/hooks/useAuth';

interface Props { onClose: () => void; onSuccess: (id: string) => void; }

const MODES = [
  { value:"practice", label:"Practice", desc:"Luyện tập theo từng phần" },
  { value:"mock_test", label:"Mock Test", desc:"Thi thử chuẩn TOEIC" },
  { value:"official_exam", label:"Official Exam", desc:"Kỳ thi chính thức" },
];

export function CreateExamModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    code:"", name:"", mode:"mock_test",
    totalDurationSec:7200, totalQuestions:200,
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
      if (form.instructions.trim()) payload.instructions = form.instructions.trim();
      const res = await apiClient.admin.examTemplate.create(payload);
      const id = (res.data as any)?.id;
      if (!id) throw new Error("Không nhận được ID từ server");
      onSuccess(id);
    } catch(e:any){setErr(e.message||"Tạo thất bại");}
    finally{setSaving(false);}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden">
        
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tạo đề thi mới</h2>
            <p className="text-sm text-gray-500 mt-1">Bước 5/11 — Khởi tạo Template</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {err && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Code *</label>
              <input
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="VD: TOEIC-2024-01"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Tên đề thi *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Đề thi thử tháng 1"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Chế độ thi</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MODES.map(m => (
                <button key={m.value} type="button" onClick={() => setForm({ ...form, mode: m.value })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${form.mode === m.value ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-blue-200 bg-white"}`}>
                  <p className={`text-sm font-bold ${form.mode === m.value ? "text-blue-700" : "text-gray-700"}`}>{m.label}</p>
                  <p className="text-[10px] text-gray-400 font-medium leading-tight mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Thời gian (giây) *</label>
              <input
                type="number" min={1}
                value={form.totalDurationSec || ""}
                onChange={e => setForm({ ...form, totalDurationSec: e.target.value ? Math.max(1, parseInt(e.target.value)) : 0 })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all"
              />
              {form.totalDurationSec > 0 && <p className="text-[10px] text-gray-400 font-medium">{Math.floor(form.totalDurationSec / 60)} phút</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng số câu *</label>
              <input
                type="number" min={1}
                value={form.totalQuestions || ""}
                onChange={e => setForm({ ...form, totalQuestions: e.target.value ? Math.max(1, parseInt(e.target.value)) : 0 })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Hướng dẫn</label>
            <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={2} placeholder="Nhập hướng dẫn..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
          </div>

          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.shuffleQuestionOrder} onChange={e => setForm({ ...form, shuffleQuestionOrder: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Xáo trộn câu hỏi
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.shuffleOptionOrder} onChange={e => setForm({ ...form, shuffleOptionOrder: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Xáo trộn đáp án
            </label>
          </div>
        </form>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all">Hủy</button>
          <button type="submit" onClick={handleSubmit} disabled={saving} className="flex-[2] py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Tạo & Tiếp tục
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
