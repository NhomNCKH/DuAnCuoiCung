"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, AlertCircle, CheckCircle, Zap,
  Settings, Layers, Globe, Archive,
  RefreshCw, Info, Search, Tag, Clock, Eye,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import type { ApiResponse } from "@/types/api";
import { apiClient } from "@/lib/api-client";
import { formatExamPublishError } from "../utils/helpers";
import { useToast } from "@/hooks/useToast";
import {
  ExamPreviewModal,
  type PreviewTemplatePayload,
  type TemplatePreviewValidation,
} from "./ExamPreviewModal";
import { ActionIcon } from "@/components/ui/action-icons";
import { SharedDropdown } from "@/components/ui/shared-dropdown";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExamTemplate {
  id: string; code: string; name: string; mode: string; status: string;
  totalDurationSec: number; totalQuestions: number; instructions?: string;
  shuffleQuestionOrder?: boolean; shuffleOptionOrder?: boolean;
  sections?: Section[]; rules?: Rule[]; items?: Item[];
}
interface Section { id?: string; part: string; sectionOrder: number; expectedGroupCount: number; expectedQuestionCount: number; durationSec?: number; }
interface Rule { id?: string; part: string; questionCount: number; groupCount?: number; levelDistribution?: Record<string,number>; requiredTagCodes?: string[]; }
interface Item { id: string; questionGroupId: string; displayOrder: number; locked?: boolean; questionGroup?: { title: string; code: string; part: string; } }
interface ValidationResult { valid: boolean; errors?: string[]; warnings?: string[]; }

const PARTS = ["P1","P2","P3","P4","P5","P6","P7"];
const PART_LABEL: Record<string,string> = { P1:"Part 1 - Photos", P2:"Part 2 - Q&A", P3:"Part 3 - Conversations", P4:"Part 4 - Talks", P5:"Part 5 - Incomplete Sentences", P6:"Part 6 - Text Completion", P7:"Part 7 - Reading Comprehension" };
const STATUS_COLOR: Record<string,string> = { draft:"bg-amber-100 text-amber-700 border border-amber-200", published:"bg-blue-100 text-blue-700 border border-blue-200", archived:"bg-slate-100 text-slate-600 border border-slate-200" };
const STATUS_LABEL: Record<string,string> = { draft:"Nháp", published:"Đã xuất bản", archived:"Lưu trữ" };
const MODE_LABEL: Record<string,string> = { practice:"Practice", mock_test:"Mock Test", official_exam:"Official Exam" };

const WORKFLOW_TAB_IDS = ["overview", "sections", "rules", "items", "validate"] as const;
type WorkflowTabId = (typeof WORKFLOW_TAB_IDS)[number];
const WORKFLOW_TAB_LABEL: Record<WorkflowTabId, string> = {
  overview: "Thông tin",
  sections: "Cấu trúc",
  rules: "Quy tắc",
  items: "Câu hỏi",
  validate: "Xuất bản",
};

/** Props tối thiểu + optional từ danh sách / form tạo mới — dùng render ngay không chờ GET */
export type ExamDetailModalTemplateInput = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status: string;
  mode?: string;
  totalQuestions?: number;
  totalDurationSec?: number;
  instructions?: string;
  shuffleQuestionOrder?: boolean;
  shuffleOptionOrder?: boolean;
  updatedAt?: string;
  sections?: Section[];
  rules?: Rule[];
  items?: Item[];
};

function examTemplateFromModalProps(t: ExamDetailModalTemplateInput): ExamTemplate {
  return {
    id: t.id,
    code: t.code ?? "",
    name: t.name,
    mode: t.mode ?? "mock_test",
    status: t.status,
    totalDurationSec:
      typeof t.totalDurationSec === "number" && t.totalDurationSec > 0 ? t.totalDurationSec : 7200,
    totalQuestions:
      typeof t.totalQuestions === "number" && t.totalQuestions > 0 ? t.totalQuestions : 200,
    instructions: t.instructions,
    shuffleQuestionOrder: t.shuffleQuestionOrder,
    shuffleOptionOrder: t.shuffleOptionOrder,
    sections: t.sections,
    rules: t.rules,
    items: t.items,
  };
}


// ─── Sections Tab ─────────────────────────────────────────────────────────────
function SectionsTab({
  template,
  onRefresh,
  onSaved,
}: {
  template: ExamTemplate;
  onRefresh: () => void;
  onSaved?: () => void;
}) {
  const [sections, setSections] = useState<Section[]>(template.sections ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [standardDialogOpen, setStandardDialogOpen] = useState(false);

  const applyToeicStandard = () => {
    const standard: Section[] = [
      { part: "P1", sectionOrder: 1, expectedGroupCount: 6, expectedQuestionCount: 6 },
      // P2: mỗi question group thường chỉ có 1 câu → groupCount = questionCount = 25
      { part: "P2", sectionOrder: 2, expectedGroupCount: 25, expectedQuestionCount: 25 },
      { part: "P3", sectionOrder: 3, expectedGroupCount: 13, expectedQuestionCount: 39 },
      { part: "P4", sectionOrder: 4, expectedGroupCount: 10, expectedQuestionCount: 30 },
      { part: "P5", sectionOrder: 5, expectedGroupCount: 30, expectedQuestionCount: 30 },
      { part: "P6", sectionOrder: 6, expectedGroupCount: 4, expectedQuestionCount: 16 },
      { part: "P7", sectionOrder: 7, expectedGroupCount: 15, expectedQuestionCount: 54 },
    ];
    setSections(standard);
  };

  const addSection = () => {
    const nextOrder = sections.length + 1;
    const defaultPart = (["P1", "P2", "P3", "P4", "P5", "P6", "P7"])[sections.length] || "P1";
    
    // TOEIC Standard Defaults
    const defaults: Record<string, { g: number; q: number }> = {
      P1: { g: 6, q: 6 },
      P2: { g: 25, q: 25 },
      P3: { g: 13, q: 39 },
      P4: { g: 10, q: 30 },
      P5: { g: 30, q: 30 },
      P6: { g: 4, q: 16 },
      P7: { g: 15, q: 54 },
    };
    
    const { g, q } = defaults[defaultPart] || { g: 1, q: 1 };

    setSections(prev => [...prev, { 
      part: defaultPart, 
      sectionOrder: nextOrder, 
      expectedGroupCount: g, 
      expectedQuestionCount: q 
    }]);
  };

  const removeSection = (i: number) => setSections(prev => prev.filter((_, j) => j !== i).map((s, j) => ({ ...s, sectionOrder: j + 1 })));
  
  const update = (i: number, field: string, val: any) => {
    setSections(prev => prev.map((s, j) => {
      if (j !== i) return s;
      const updated = { ...s, [field]: val };
      // Các part có 1 câu / 1 nhóm: groupCount = questionCount
      if (field === "expectedGroupCount" && ["P1", "P2", "P5"].includes(s.part)) {
        updated.expectedQuestionCount = val;
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    setSaving(true); setErr(""); setOk(false);
    try {
      const payload = sections.map((section, idx) => ({
        part: section.part,
        sectionOrder: Number(section.sectionOrder ?? idx + 1),
        expectedGroupCount: Number(section.expectedGroupCount ?? 1),
        expectedQuestionCount: Number(section.expectedQuestionCount ?? 1),
        durationSec:
          section.durationSec !== undefined && section.durationSec !== null
            ? Number(section.durationSec)
            : undefined,
      }));
      await apiClient.admin.examTemplate.replaceSections(template.id, payload);
      setOk(true);
      onRefresh();
      onSaved?.();
      setTimeout(() => setOk(false), 2000);
    } catch (e: any) { setErr(e.message || "Lưu thất bại"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={standardDialogOpen}
        onOpenChange={setStandardDialogOpen}
        title="Áp dụng cấu trúc TOEIC Chuẩn?"
        message="Hệ thống sẽ thay thế cấu trúc hiện tại bằng cấu trúc TOEIC Chuẩn (200 câu)."
        confirmLabel="Áp dụng"
        variant="warning"
        onConfirm={() => {
          applyToeicStandard();
        }}
      />
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Cấu trúc đề thi
          </h3>
          <p className="text-sm text-gray-500">Thiết kế các phần thi theo đúng format TOEIC</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStandardDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <Zap className="w-4 h-4" /> Cấu trúc Chuẩn
          </button>
          <button onClick={addSection} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
            <ActionIcon action="add" className="w-4 h-4" /> Thêm phần
          </button>
        </div>
      </div>

      <AnimatePresence>
        {err && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
          </motion.div>
        )}
        {ok && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> Đã lưu thành công!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {sections.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Chưa có phần thi nào. Nhấn "Thêm phần" để bắt đầu.</p>
          </div>
        ) : (
          sections.map((s, i) => (
            <div key={i} className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:border-blue-300 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-gray-100 text-gray-700 rounded flex items-center justify-center font-bold text-sm">
                    {s.sectionOrder}
                  </span>
                  <h4 className="font-bold text-gray-800">Phần {s.sectionOrder}: {PART_LABEL[s.part]}</h4>
                </div>
                <button onClick={() => removeSection(i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                  <ActionIcon action="delete" className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Chọn Part</label>
                  <SharedDropdown
                    value={s.part}
                    onChange={(value) => update(i, "part", value)}
                    options={PARTS.map((p) => ({ value: p, label: `${p} — ${PART_LABEL[p].split("-")[1].trim()}` }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Số nhóm</label>
                  <input type="number" min={1} value={s.expectedGroupCount} onChange={e => update(i, "expectedGroupCount", +e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Số câu hỏi</label>
                  <input type="number" min={1} value={s.expectedQuestionCount} onChange={e => update(i, "expectedQuestionCount", +e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Thời gian (s)</label>
                  <input type="number" min={0} value={s.durationSec ?? ""} onChange={e => update(i, "durationSec", e.target.value ? +e.target.value : undefined)} placeholder="Mặc định" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {sections.length > 0 && (
        <div className="pt-4 flex items-center justify-between border-t border-gray-100">
          <div className="text-sm text-gray-500">
            Tổng cộng: <span className="font-bold text-gray-800">{sections.length} phần</span>, <span className="font-bold text-blue-600">{sections.reduce((acc, s) => acc + s.expectedQuestionCount, 0)} câu hỏi</span>
          </div>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Lưu cấu trúc
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────
function RulesTab({
  template,
  onRefresh,
  onSaved,
}: {
  template: ExamTemplate;
  onRefresh: () => void;
  onSaved?: () => void;
}) {
  const [rules, setRules] = useState<Rule[]>(template.rules ?? []);
  const [tags, setTags] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    apiClient.admin.questionBank.listTags().then(res => setTags(Array.isArray(res.data) ? res.data : res.data?.items ?? []));
  }, []);

  const addRule = () => setRules(prev => [...prev, { part: "P1", questionCount: 6, groupCount: 1, requiredTagCodes: [], levelDistribution: { easy: 0, medium: 0, hard: 0, expert: 0 } }]);
  const removeRule = (i: number) => setRules(prev => prev.filter((_, j) => j !== i));
  const update = (i: number, field: string, val: any) => setRules(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r));

  const updateLevel = (ruleIdx: number, level: string, val: number) => {
    const current = rules[ruleIdx].levelDistribution ?? {};
    const nextDist = { ...current, [level]: val };
    const totalQuestions = Object.values(nextDist).reduce((a, b) => a + b, 0);
    
    setRules(prev => prev.map((r, j) => {
      if (j !== ruleIdx) return r;
      return { ...r, levelDistribution: nextDist, questionCount: totalQuestions };
    }));
  };

  const toggleTag = (ruleIdx: number, tagCode: string) => {
    const current = rules[ruleIdx].requiredTagCodes ?? [];
    const next = current.includes(tagCode) ? current.filter(c => c !== tagCode) : [...current, tagCode];
    update(ruleIdx, "requiredTagCodes", next);
  };

  const handleSave = async () => {
    setSaving(true); setErr(""); setOk(false);
    try {
      const payload = rules.map((rule) => ({
        part: rule.part,
        questionCount: Number(rule.questionCount ?? 1),
        groupCount:
          rule.groupCount !== undefined && rule.groupCount !== null
            ? Number(rule.groupCount)
            : undefined,
        levelDistribution: rule.levelDistribution ?? {},
        requiredTagCodes: rule.requiredTagCodes ?? [],
        excludedTagCodes: (rule as any).excludedTagCodes ?? [],
      }));
      await apiClient.admin.examTemplate.replaceRules(template.id, payload);
      setOk(true);
      onRefresh();
      onSaved?.();
      setTimeout(() => setOk(false), 2000);
    } catch (e: any) { setErr(e.message || "Lưu thất bại"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> Quy tắc chọn câu hỏi
          </h3>
          <p className="text-sm text-gray-500">Thiết lập điều kiện để hệ thống tự động lấy câu hỏi</p>
        </div>
        <button onClick={addRule} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
          <ActionIcon action="add" className="w-4 h-4" /> Thêm rule mới
        </button>
      </div>

      <AnimatePresence>
        {err && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
          </motion.div>
        )}
        {ok && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> Đã lưu thành công!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Chưa có quy tắc nào.</p>
          </div>
        ) : (
          rules.map((r, i) => (
            <div key={i} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:border-amber-300 transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </span>
                  <h4 className="font-bold text-gray-800">Quy tắc cho {PART_LABEL[r.part]}</h4>
                </div>
                <button onClick={() => removeRule(i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                  <ActionIcon action="delete" className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Áp dụng cho Part</label>
                    <SharedDropdown
                      value={r.part}
                      onChange={(value) => update(i, "part", value)}
                      options={PARTS.map((p) => ({ value: p, label: p }))}
                    />
                  </div>
                  
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-800 uppercase mb-2 flex items-center gap-1.5">
                      <Layers className="w-3 h-3" /> Section liên quan
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {template.sections?.filter(s => s.part === r.part).map(s => (
                        <span key={s.id} className="px-2 py-0.5 bg-white border border-amber-200 rounded text-[10px] font-bold text-amber-700">
                          S{s.sectionOrder} ({s.expectedGroupCount} groups)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tổng số câu hỏi</label>
                    <input type="number" readOnly value={r.questionCount} className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded text-sm font-bold text-gray-500 outline-none" />
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Phân bổ độ khó</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['easy', 'medium', 'hard', 'expert'].map(lv => (
                        <div key={lv} className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase text-center">{lv}</p>
                          <input 
                            type="number" min={0} 
                            value={r.levelDistribution?.[lv] ?? 0} 
                            onChange={e => updateLevel(i, lv, +e.target.value)}
                            className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-center text-sm font-bold focus:border-amber-500 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Lọc theo Tags</label>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[80px]">
                      {tags.map(t => (
                        <button 
                          key={t.code} 
                          onClick={() => toggleTag(i, t.code)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                            r.requiredTagCodes?.includes(t.code) 
                            ? "bg-amber-600 text-white" 
                            : "bg-white text-gray-500 border border-gray-200 hover:border-amber-300"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {rules.length > 0 && (
        <div className="pt-4 flex justify-end border-t border-gray-100">
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-400" />}
            Lưu quy tắc
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Items Tab ────────────────────────────────────────────────────────────────
function ItemsTab({ template, onRefresh }: { template: ExamTemplate; onRefresh: () => void }) {
  const [autoFilling, setAutoFilling] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [publishedGroups, setPublishedGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSearch, setManualManualSearch] = useState("");
  const [manualPart, setManualPart] = useState<string>("all");

  const items = template.items ?? [];
  const sections = template.sections ?? [];

  useEffect(() => {
    if (selectedSection) {
      const section = sections.find(s => s.id === selectedSection);
      if (section) setManualPart(section.part);
    } else {
      setManualPart("all");
    }
  }, [selectedSection, sections]);

  const loadGroups = useCallback(async()=>{
    setLoadingGroups(true);
    try {
      const res = await apiClient.admin.questionBank.listQuestionGroups({ 
        status: "published", 
        part: manualPart !== "all" ? manualPart : undefined,
        search: manualSearch || undefined,
        objectiveOnly: true,
        limit: 50 
      } as any);
      const resData = res.data as any;
      let items = Array.isArray(resData) ? resData : (resData?.data || resData?.items || []);
      setPublishedGroups(items);
    } catch(e: any) { console.error(e); }
    finally{setLoadingGroups(false);}
  }, [manualSearch, manualPart]);

  useEffect(() => { if (showManualModal) loadGroups(); }, [showManualModal, loadGroups]);

  const handleAutoFill = async(parts?: string[]) => {
    setAutoFilling(true); setErr(""); setOk("");
    try {
      await apiClient.admin.examTemplate.autoFillItems(template.id, parts ? { parts } : {});
      setOk("Tự động điền câu hỏi thành công!"); 
      onRefresh();
      // Tự động chuyển sang bước Validate sau 1.5s
      setTimeout(() => {
        setOk("");
        const validateBtn = document.getElementById("go-to-validate");
        if (validateBtn) validateBtn.scrollIntoView({ behavior: "smooth" });
      }, 1500);
    } catch(e: any) { setErr(e.message || "Auto-fill thất bại"); }
    finally { setAutoFilling(false); }
  };

  const handleAddManual = async(groupId: string) => {
    if (!selectedSection) { setErr("Vui lòng chọn section trước"); return; }
    try {
      await apiClient.admin.examTemplate.addManualItems(template.id, [{ sectionId: selectedSection, questionGroupId: groupId }]);
      setOk("Đã thêm câu hỏi vào đề!");
      onRefresh();
      setTimeout(() => setOk(""), 2000);
    } catch(e: any) { setErr(e.message || "Thêm thất bại"); }
  };

  const handleDeleteItem = async(itemId: string) => {
    try {
      await apiClient.admin.examTemplate.deleteItem(template.id, itemId);
      onRefresh();
    } catch(e: any) { setErr(e.message || "Xóa thất bại"); }
  };

  const itemsBySection = sections.map(s => ({
    ...s,
    items: items.filter(i => (i as any).sectionId === s.id)
  })).sort((a, b) => a.sectionOrder - b.sectionOrder);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {err && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
          </motion.div>
        )}
        {ok && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />{ok}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
              <h4 className="font-bold text-gray-800">Auto-fill thông minh</h4>
            </div>
            <p className="text-sm text-gray-500 mb-6">Tự động chọn câu hỏi dựa trên quy tắc đã thiết lập.</p>
            <button onClick={() => handleAutoFill()} disabled={autoFilling} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {autoFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Chạy Auto-fill
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-gray-800 text-sm uppercase">Thêm thủ công</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase">1. Chọn Section</label>
                <SharedDropdown
                  value={selectedSection}
                  onChange={setSelectedSection}
                  options={[
                    { value: "", label: "-- Chọn Section --" },
                    ...sections.map((s) => ({
                      value: s.id ?? "",
                      label: `Section ${s.sectionOrder} (${s.part})`,
                    })),
                  ]}
                />
              </div>
              
              <button 
                disabled={!selectedSection}
                onClick={() => setShowManualModal(true)}
                className="w-full py-4 border-2 border-dashed border-gray-200 text-gray-400 rounded-lg text-sm font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                <ActionIcon action="add" className="w-4 h-4" />
                <span>Chọn từ ngân hàng</span>
              </button>
            </div>
          </div>

          <button
            id="go-to-validate"
            onClick={() => {
              const validateTab = document.querySelector('[data-tab-id="validate"]');
              if (validateTab) (validateTab as HTMLButtonElement).click();
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>Tiếp tục Validate</span>
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {itemsBySection.map((section) => (
            <div key={section.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white bg-gray-800 px-2 py-0.5 rounded uppercase">Phần {section.sectionOrder}</span>
                  <h5 className="font-bold text-gray-800 text-sm">{PART_LABEL[section.part]}</h5>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${section.items.length === section.expectedGroupCount ? "bg-blue-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, (section.items.length / section.expectedGroupCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-500">{section.items.length} / {section.expectedGroupCount}</span>
                </div>
              </div>

              <div className="space-y-2">
                {section.items.length === 0 ? (
                  <div className="py-6 text-center border border-dashed border-gray-300 rounded text-xs text-gray-400 bg-white">
                    Trống
                  </div>
                ) : (
                  section.items.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded p-3 hover:border-blue-500 transition-colors group">
                      <span className="text-xs font-bold text-gray-300 w-4">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800 truncate">{item.questionGroup?.title || "Nhóm câu hỏi"}</p>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded uppercase">{item.questionGroup?.part}</span>
                        </div>
                        <p className="text-[10px] font-mono text-gray-400">{item.questionGroup?.code}</p>
                      </div>
                      <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <ActionIcon action="delete" className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-lg">Chọn câu hỏi</h3>
                <button onClick={() => setShowManualModal(false)} className="p-2 hover:bg-gray-100 rounded transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    placeholder="Tìm theo mã, tiêu đề..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded text-sm focus:border-blue-500 outline-none transition-all"
                    value={manualSearch}
                    onChange={e => setManualManualSearch(e.target.value)}
                  />
                </div>
                <SharedDropdown
                  value={manualPart}
                  onChange={setManualPart}
                  className="min-w-[150px]"
                  options={[
                    { value: "all", label: "Tất cả Part" },
                    ...PARTS.map((p) => ({ value: p, label: p })),
                  ]}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                {loadingGroups ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-gray-400">Đang tải...</p>
                  </div>
                ) : publishedGroups.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded border border-gray-200">
                    <p className="text-gray-400">Không tìm thấy kết quả</p>
                  </div>
                ) : publishedGroups.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded hover:border-blue-500 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded uppercase">{g.part}</span>
                        <p className="text-sm font-bold text-gray-800 truncate">{g.title}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-400">{g.code}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                          {(g.questionCount ?? g.questions?.length ?? 0)} câu
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAddManual(g.id)}
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors"
                    >
                      CHỌN
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Validate & Publish Tab ───────────────────────────────────────────────────
function ValidateTab({ template, onRefresh, onClose }: { template: ExamTemplate; onRefresh: () => void; onClose: () => void }) {
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [result, setResult] = useState<ValidationResult|null>(null);
  const [preview, setPreview] = useState<{
    template: PreviewTemplatePayload;
    validation: TemplatePreviewValidation;
  } | null>(null);
  const [err, setErr] = useState("");

  const handleValidate = async() => {
    setValidating(true); setErr(""); setResult(null);
    try {
      const res = await apiClient.admin.examTemplate.validate(template.id);
      const raw = res.data as Record<string, unknown> | undefined;
      const data = {
        valid: Boolean(raw?.isValid ?? raw?.valid),
        errors: Array.isArray(raw?.errors) ? [...(raw.errors as string[])] : [],
        warnings: Array.isArray(raw?.warnings) ? [...(raw.warnings as string[])] : [],
      };

      // Kiểm tra tổng số câu hỏi nếu là Mock Test hoặc Official Exam
      if (template.mode !== "practice" && template.totalQuestions !== 200) {
        data.warnings.push("Lưu ý: Đề thi thử chuẩn TOEIC thường yêu cầu đủ 200 câu hỏi.");
      }

      setResult(data);
      const prevRes = (await apiClient.admin.examTemplate.preview(
        template.id,
      )) as ApiResponse<{ template: PreviewTemplatePayload; validation: TemplatePreviewValidation }>;
      setPreview(prevRes.data ?? null);
    } catch (e: unknown) {
      setErr(formatExamPublishError(e));
    }
    finally{setValidating(false);}
  };

  const handlePublish = async () => {
    setPublishing(true);
    setErr("");
    try {
      await apiClient.admin.examTemplate.publish(template.id);
      onRefresh();
      onClose();
    } catch (e: unknown) {
      setErr(formatExamPublishError(e));
      throw e;
    } finally {
      setPublishing(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    setErr("");
    try {
      await apiClient.admin.examTemplate.archive(template.id);
      onRefresh();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || "Lưu trữ thất bại");
      throw e;
    } finally {
      setArchiving(false);
    }
  };

  const handleDuplicate = async() => {
    try {
      await apiClient.admin.examTemplate.duplicate(template.id);
      alert("Đã nhân bản đề thi!");
      onRefresh();
    } catch(e:any){setErr(e.message||"Nhân bản thất bại");}
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        title="Xuất bản đề thi?"
        message="Sau khi xuất bản, học viên có thể sử dụng đề thi này."
        confirmLabel="Xuất bản"
        cancelLabel="Hủy"
        variant="default"
        loading={publishing}
        onConfirm={handlePublish}
      />
      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Lưu trữ đề thi?"
        message="Đề thi sẽ không còn hiển thị cho học viên cho đến khi được khôi phục (nếu hệ thống hỗ trợ)."
        confirmLabel="Lưu trữ"
        cancelLabel="Hủy"
        variant="danger"
        loading={archiving}
        onConfirm={handleArchive}
      />
      <AnimatePresence>
        {err && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="whitespace-pre-wrap break-words">{err}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" /> Thông tin xuất bản
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${STATUS_COLOR[template.status] ?? ""}`}>
                {STATUS_LABEL[template.status] ?? template.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Chế độ", value: MODE_LABEL[template.mode] ?? template.mode, icon: Globe },
                { label: "Tổng câu", value: `${template.totalQuestions} câu`, icon: Layers },
                { label: "Thời gian", value: `${Math.floor(template.totalDurationSec / 60)} phút`, icon: RefreshCw },
                { label: "Mã đề", value: template.code, icon: Tag },
              ].map(s => (
                <div key={s.label} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5">
                    <s.icon className="w-3 h-3" /> {s.label}
                  </p>
                  <p className="font-bold text-gray-800 text-sm">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button onClick={handleValidate} disabled={validating} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {result ? "Kiểm tra lại" : "Validate dữ liệu"}
              </button>
              <button onClick={handleDuplicate} className="w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
                Nhân bản đề thi
              </button>
            </div>
          </div>

          {preview && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
              <h5 className="font-bold text-gray-800 text-xs uppercase">Cấu trúc thực tế</h5>
              <div className="space-y-2">
                {(preview.template?.sections ?? template.sections)?.map((s) => {
                  const tplItems = preview.template?.items ?? template.items;
                  const actualCount =
                    tplItems?.filter((i) => (i as { sectionId?: string }).sectionId === s.id)
                      .length || 0;
                  const isComplete = actualCount === s.expectedGroupCount;
                  return (
                    <div key={s.id} className={`flex items-center justify-between p-3 rounded border ${
                      isComplete ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-200"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${
                          isComplete ? "bg-blue-600 text-white" : "bg-red-600 text-white"
                        }`}>
                          {s.sectionOrder}
                        </span>
                        <span className="text-xs font-bold text-gray-700">{PART_LABEL[s.part]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${isComplete ? "text-blue-600" : "text-red-600"}`}>
                          {actualCount} / {s.expectedGroupCount}
                        </span>
                        {isComplete ? <CheckCircle className="w-3.5 h-3.5 text-blue-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!result && !validating && (
            <div className="h-full flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <RefreshCw className="w-8 h-8 text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm font-bold">Chưa có kết quả kiểm tra</p>
            </div>
          )}

          {result && (
            <div className={`h-full rounded-lg p-6 border-2 flex flex-col ${result.valid ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-lg ${result.valid ? "bg-blue-600 text-white" : "bg-red-600 text-white"}`}>
                  {result.valid ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-xl text-gray-800">{result.valid ? "Hợp lệ" : "Không hợp lệ"}</h4>
                  <p className="text-xs text-gray-500">{result.valid ? "Sẵn sàng xuất bản" : "Cần chỉnh sửa"}</p>
                </div>
              </div>
              
              <div className="flex-1 space-y-2 overflow-y-auto mb-6">
                {result.errors?.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-white p-3 rounded border border-red-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <span className="font-bold leading-tight">{e}</span>
                  </div>
                ))}
                {result.warnings?.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-white p-3 rounded border border-amber-100">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                    <span className="font-bold leading-tight">{w}</span>
                  </div>
                ))}
                {result.valid && (
                  <p className="text-sm text-blue-800 font-bold text-center py-6">
                    Mẫu đề thi hợp lệ! Bạn có thể xuất bản ngay.
                  </p>
                )}
              </div>

              {result.valid && (
                <div className="mt-auto">
                  {template.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => setPublishDialogOpen(true)}
                      disabled={publishing}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Globe className="w-5 h-5" />
                      XUẤT BẢN
                    </button>
                  )}
                  {template.status === "published" && (
                    <button
                      type="button"
                      onClick={() => setArchiveDialogOpen(true)}
                      disabled={archiving}
                      className="w-full py-3 bg-gray-900 text-white rounded-lg font-bold text-lg hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Archive className="w-5 h-5" />
                      LƯU TRỮ
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ExamDetailModal (exported) ─────────────────────────────────────────
interface ExamDetailModalProps {
  template: ExamDetailModalTemplateInput;
  onClose: () => void;
  onRefresh: () => void;
  initialTab?: "overview" | "sections" | "rules" | "items" | "validate";
  getDifficultyColor?: (d: string) => string;
  getDifficultyLabel?: (d: string) => string;
}

export function ExamDetailModal({ template, onClose, onRefresh, initialTab = "overview" }: ExamDetailModalProps) {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "sections" | "rules" | "items" | "validate">(initialTab);
  const [templateDetail, setTemplateDetail] = useState<ExamTemplate>(() => examTemplateFromModalProps(template));
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<{
    template: PreviewTemplatePayload;
    validation: TemplatePreviewValidation;
  } | null>(null);

  const workflowIndex = WORKFLOW_TAB_IDS.indexOf(activeTab as WorkflowTabId);
  const goWorkflowPrev = () => {
    if (workflowIndex <= 0) return;
    setActiveTab(WORKFLOW_TAB_IDS[workflowIndex - 1]);
  };
  const goWorkflowNext = () => {
    if (workflowIndex < 0 || workflowIndex >= WORKFLOW_TAB_IDS.length - 1) return;
    setActiveTab(WORKFLOW_TAB_IDS[workflowIndex + 1]);
  };

  const fetchDetail = useCallback(async () => {
    setRefreshing(true);
    setErr("");
    try {
      const res = await apiClient.admin.examTemplate.get(template.id);
      setTemplateDetail(res.data as ExamTemplate);
    } catch (e: any) {
      setErr(e.message || "Không thể tải chi tiết");
    } finally {
      setRefreshing(false);
    }
  }, [template.id]);

  useEffect(() => {
    setTemplateDetail(examTemplateFromModalProps(template));
    setErr("");
    // Chỉ khi mở đề khác (id đổi); không gắn cả `template` để tránh reset khi parent re-render cùng id
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: template.id only
  }, [template.id]);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewPayload(null);
    try {
      const res = (await apiClient.admin.examTemplate.preview(
        template.id,
      )) as ApiResponse<{
        template: PreviewTemplatePayload;
        validation: TemplatePreviewValidation;
      }>;
      const inner = res.data;
      if (!inner?.template) {
        notify({
          title: "Không có dữ liệu xem trước",
          message: "Máy chủ không trả về nội dung đề thi.",
          variant: "error",
        });
        return;
      }
      setPreviewPayload(inner);
      setPreviewOpen(true);
    } catch (e: unknown) {
      notify({
        title: "Không thể tải xem trước",
        message: formatExamPublishError(e),
        variant: "error",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  return (
    <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800 truncate">{template.name}</h2>
            {template.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{String(template.description)}</p>}
          </div>
          <div className="flex items-center gap-3 ml-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all border border-gray-200 disabled:pointer-events-none disabled:opacity-50"
            >
              {previewLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}{" "}
              Xem trước
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Workflow Indicator */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[800px] relative">
            <div className="absolute top-[18px] left-0 right-0 h-px bg-gray-300 z-0" />
            
            {[
              { id: "overview", n: 1, label: "Thông tin" },
              { id: "sections", n: 2, label: "Cấu trúc" },
              { id: "rules", n: 3, label: "Quy tắc" },
              { id: "items", n: 4, label: "Câu hỏi" },
              { id: "validate", n: 5, label: "Xuất bản" },
            ].map((s) => (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                <button
                  data-tab-id={s.id}
                  onClick={() => setActiveTab(s.id as any)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                    activeTab === s.id ? "bg-blue-600 border-blue-600 text-white shadow-sm" :
                    "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {s.n}
                </button>
                <span className={`text-[11px] font-bold ${
                  activeTab === s.id ? "text-blue-700" : "text-gray-500"
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content: luôn có templateDetail từ props trước — GET chỉ đồng bộ thêm, không chặn cả khối */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {err && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {err}
              </p>
              <button
                type="button"
                onClick={fetchDetail}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          )}
          {refreshing && (
            <div className="sticky top-0 z-10 mb-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 shadow-sm">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
              Đang đồng bộ dữ liệu từ máy chủ…
            </div>
          )}
          {templateDetail ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="h-full"
              >
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: "Tổng số câu", value: `${templateDetail.totalQuestions} Q`, icon: Layers, color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "Thời gian làm bài", value: `${Math.floor(templateDetail.totalDurationSec / 60)} phút`, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "Chế độ thi", value: MODE_LABEL[templateDetail.mode] ?? templateDetail.mode, icon: Globe, color: "text-purple-600", bg: "bg-purple-50" },
                        { label: "Trạng thái", value: STATUS_LABEL[templateDetail.status] ?? templateDetail.status, icon: Info, color: "text-amber-600", bg: "bg-amber-50" },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                          <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                          </div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                          <p className="text-lg font-bold text-gray-800">{s.value}</p>
                        </div>
                      ))}
                    </div>
                    {templateDetail.instructions && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-600" /> Hướng dẫn làm bài
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                          {templateDetail.instructions}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                        <div className={`w-2 h-2 rounded-full ${templateDetail.shuffleQuestionOrder ? "bg-blue-500" : "bg-gray-300"}`} />
                        <span className="text-xs font-bold text-gray-600 uppercase">Xáo trộn câu hỏi: {templateDetail.shuffleQuestionOrder ? "Bật" : "Tắt"}</span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                        <div className={`w-2 h-2 rounded-full ${templateDetail.shuffleOptionOrder ? "bg-blue-500" : "bg-gray-300"}`} />
                        <span className="text-xs font-bold text-gray-600 uppercase">Xáo trộn đáp án: {templateDetail.shuffleOptionOrder ? "Bật" : "Tắt"}</span>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "sections" && (
                  <SectionsTab
                    template={templateDetail}
                    onRefresh={fetchDetail}
                    onSaved={() => setActiveTab("rules")}
                  />
                )}
                {activeTab === "rules" && (
                  <RulesTab
                    template={templateDetail}
                    onRefresh={fetchDetail}
                    onSaved={() => setActiveTab("items")}
                  />
                )}
                {activeTab === "items" && <ItemsTab template={templateDetail} onRefresh={fetchDetail} />}
                {activeTab === "validate" && <ValidateTab template={templateDetail} onRefresh={() => { fetchDetail(); onRefresh(); }} onClose={onClose} />}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>

        {templateDetail && (
          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500 hidden sm:block">
              Chuyển bước bằng nút dưới đây hoặc bấm số trên thanh quy trình.
            </p>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={goWorkflowPrev}
                disabled={workflowIndex <= 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </button>
              <button
                type="button"
                onClick={goWorkflowNext}
                disabled={workflowIndex >= WORKFLOW_TAB_IDS.length - 1}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-40"
              >
                Tiếp theo
                <ChevronRight className="h-4 w-4" />
                {workflowIndex >= 0 && workflowIndex < WORKFLOW_TAB_IDS.length - 1 && (
                  <span className="hidden md:inline font-medium opacity-90">
                    ({WORKFLOW_TAB_LABEL[WORKFLOW_TAB_IDS[workflowIndex + 1]]})
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>

      <ExamPreviewModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewPayload(null);
        }}
        loading={false}
        errorMessage={null}
        payload={previewPayload}
      />
    </>
  );
}
