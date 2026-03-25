"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag, Plus, Search, Edit, Trash2, Loader2, AlertCircle, X,
  CheckCircle, Send, ThumbsUp, ThumbsDown, Archive, Globe,
  ChevronDown, Layers, FileText, BookOpen, Eye, RefreshCw,
  ArrowRight, Info, Music, ImageIcon, Upload, Volume2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getSignedMediaUrl } from "@/lib/media-url";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TagItem { id: string; category: string; code: string; label: string; description?: string; }
interface QuestionGroup {
  id: string; code: string; title: string; part: string; level: string;
  status: string; tagCodes?: string[]; createdAt: string;
  stem?: string; explanation?: string;
  assets?: { id: string; kind: string; storageKey: string; publicUrl: string; mimeType: string; sortOrder: number; contentText?: string }[];
  questions?: { id: string; questionNo: number; prompt: string; answerKey: string; options: { optionKey: string; content: string; isCorrect: boolean }[] }[];
  reviews?: { id: string; action: string; comment?: string; createdAt: string; createdBy?: any }[];
}

const PARTS = ["P1","P2","P3","P4","P5","P6","P7"];
const LEVELS = ["easy","medium","hard","expert"];
const STATUSES = ["draft","in_review","approved","published","archived"];
const STATUS_LABEL: Record<string,string> = { draft:"Nháp", in_review:"Chờ duyệt", approved:"Đã duyệt", published:"Xuất bản", archived:"Lưu trữ" };
const STATUS_COLOR: Record<string,string> = {
  draft:"bg-yellow-100 text-yellow-700", in_review:"bg-blue-100 text-blue-700",
  approved:"bg-purple-100 text-purple-700", published:"bg-green-100 text-green-700",
  archived:"bg-gray-100 text-gray-600",
};
const LEVEL_COLOR: Record<string,string> = { easy:"bg-green-100 text-green-700", medium:"bg-yellow-100 text-yellow-700", hard:"bg-red-100 text-red-700", expert:"bg-purple-100 text-purple-700" };

// ─── Tag Modal ────────────────────────────────────────────────────────────────
function TagModal({ tag, onClose, onSaved }: { tag?: TagItem; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ category: tag?.category ?? "", code: tag?.code ?? "", label: tag?.label ?? "", description: tag?.description ?? "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.code || !form.label) { setErr("Vui lòng điền đầy đủ thông tin bắt buộc"); return; }
    setSaving(true); setErr("");
    try {
      if (tag) await apiClient.admin.questionBank.updateTag(tag.id, form);
      else await apiClient.admin.questionBank.createTag(form);
      onSaved();
    } catch (e: any) { setErr(e.message || "Lưu thất bại"); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{tag ? "Sửa tag" : "Tạo tag mới"}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tags dùng để phân loại và tìm kiếm câu hỏi</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {err && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
              <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="grammar" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code * <span className="text-gray-400 font-normal">(unique)</span></label>
              <input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="grammar:tense" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Label * <span className="text-gray-400 font-normal">(tên hiển thị)</span></label>
            <input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} placeholder="Tense" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mô tả</label>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Mô tả ngắn..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}Lưu
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Per-question media state helper ─────────────────────────────────────────
interface GroupMedia {
  audioFile: File|null; audioName: string|null; audioUrl?: string;
  imageFile: File|null; imagePreview: string|null; imageUrl?: string;
  uploading: "audio"|"image"|null;
}
const emptyMedia = (): GroupMedia => ({ audioFile:null, audioName:null, imageFile:null, imagePreview:null, uploading:null });


// ─── Create/Edit Question Group Modal (Single-Page) ──────────────────────────
function QuestionGroupModal({ group, tags, onClose, onSaved }: { group?: QuestionGroup; tags: TagItem[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: group?.code ?? "", title: group?.title ?? "",
    part: group?.part ?? "", level: group?.level ?? "medium",
    stem: group?.stem ?? "", explanation: group?.explanation ?? "",
    tagCodes: group?.tagCodes ?? (group as any)?.questionGroupTags?.map((t: any) => t.tag?.code).filter(Boolean) ?? [] as string[],
  });

  type QItem = { 
    id?: string; questionNo: number; prompt: string; answerKey: string; 
    options: { optionKey: string; content: string; isCorrect: boolean }[];
    audioFile?: File | null; audioUrl?: string; transcript?: string;
  };
  const [questions, setQuestions] = useState<QItem[]>(
    group?.questions?.map(q => ({ 
      id: q.id, questionNo: q.questionNo, prompt: q.prompt, answerKey: q.answerKey, options: q.options,
      audioUrl: (q as any).metadata?.audioUrl,
      transcript: (q as any).metadata?.transcript,
    })) ?? []
  );

  const existingAudio = group?.assets?.find(a => a.kind === "audio");
  const existingImage = group?.assets?.find(a => a.kind === "image");
  const existingTranscript = group?.assets?.find(a => a.kind === "transcript");

  const [media, setMedia] = useState<GroupMedia>({
    audioFile: null, audioName: existingAudio?.storageKey.split("/").pop() ?? null, audioUrl: undefined,
    imageFile: null, imagePreview: null, imageUrl: undefined,
    uploading: null,
  });

  const [transcript, setTranscript] = useState(existingTranscript?.contentText ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const isListening = ["P1", "P2", "P3", "P4"].includes(form.part);
  const isP1 = form.part === "P1";
  const isP2 = form.part === "P2";
  const isP34 = ["P3", "P4"].includes(form.part);
  const isReadingGroup = ["P6", "P7"].includes(form.part);
  const isP5 = form.part === "P5";

  type UploadableAssetKind = "audio" | "image";

  // Số câu hỏi mặc định theo chuẩn TOEIC
  const qCountPerGroup: Record<string, number> = { P1: 1, P2: 1, P3: 3, P4: 3, P5: 1, P6: 4, P7: 3 };
  const isFixedQCount = ["P1", "P2", "P3", "P4", "P5", "P6"].includes(form.part);

  useEffect(() => {
    if (!group && form.part) {
      handlePartChange(form.part);
    }
  }, [form.part]);

  useEffect(() => {
    let cancelled = false;

    const loadSignedMediaUrls = async () => {
      const [audioUrl, imageUrl] = await Promise.all([
        existingAudio?.storageKey
          ? getSignedMediaUrl(existingAudio.storageKey)
          : Promise.resolve<string | null>(null),
        existingImage?.storageKey
          ? getSignedMediaUrl(existingImage.storageKey)
          : Promise.resolve<string | null>(null),
      ]);

      if (cancelled) return;

      setMedia((prev) => ({
        ...prev,
        audioUrl: prev.audioFile ? prev.audioUrl : audioUrl ?? undefined,
        imageUrl: prev.imageFile ? prev.imageUrl : imageUrl ?? undefined,
        imagePreview: prev.imageFile ? prev.imagePreview : imageUrl ?? null,
      }));
    };

    loadSignedMediaUrls();

    return () => {
      cancelled = true;
    };
  }, [existingAudio?.storageKey, existingImage?.storageKey]);

  const handlePartChange = (newPart: string) => {
    setForm(prev => ({...prev, part: newPart}));
    const count = qCountPerGroup[newPart] || 1;
    const isP2 = newPart === "P2";
    
    const newQs = Array.from({ length: count }, (_, i) => ({
      questionNo: i + 1, prompt: "", answerKey: "A",
      options: [
        { optionKey: "A", content: isP2 ? "Đáp án A" : "", isCorrect: true }, 
        { optionKey: "B", content: isP2 ? "Đáp án B" : "", isCorrect: false },
        { optionKey: "C", content: isP2 ? "Đáp án C" : "", isCorrect: false }, 
        { optionKey: "D", content: isP2 ? "N/A" : "", isCorrect: false }
      ]
    }));
    setQuestions(newQs);
  };

  const getUploadTarget = async (file: File, kind: UploadableAssetKind) => {
    if (group?.id) {
      const response = await apiClient.admin.questionBank.presignAsset(group.id, {
        kind,
        fileName: file.name,
        contentType: file.type,
      });
      return response.data as { signedPutUrl?: string; s3Key?: string };
    }

    const response = await apiClient.media.getPresignedUploadUrl({
      fileName: file.name,
      contentType: file.type,
      category: `question-bank-${(form.part || "general").toLowerCase()}-${kind}`,
    });

    return response.data as { signedPutUrl?: string; s3Key?: string };
  };

  const uploadFile = async (
    file: File,
    kind: UploadableAssetKind,
    sortOrder: number,
  ) => {
    const target = await getUploadTarget(file, kind);
    const signedPutUrl = target?.signedPutUrl;
    const s3Key = target?.s3Key;

    if (!signedPutUrl || !s3Key) {
      throw new Error("Không lấy được URL tải lên");
    }

    const s3Res = await fetch(signedPutUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!s3Res.ok) {
      throw new Error(`Tải file ${kind} lên S3 thất bại`);
    }

    return {
      kind,
      storageKey: s3Key,
      mimeType: file.type,
      sortOrder,
    };
  };

  const addQuestion = () => {
    if (form.part === "P7" && questions.length >= 5) return;
    setQuestions(prev => [...prev, {
      questionNo: prev.length + 1, prompt: "", answerKey: "A",
      options: [{optionKey:"A",content:"",isCorrect:true},{optionKey:"B",content:"",isCorrect:false},{optionKey:"C",content:"",isCorrect:false},{optionKey:"D",content:"",isCorrect:false}]
    }]);
  };

  const removeQuestion = (idx: number) => {
    if (form.part === "P7" && questions.length <= 2) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, questionNo: i + 1 })));
  };
  const updateQuestion = (idx: number, field: string, val: string) => setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  const updateOption = (qIdx: number, oIdx: number, field: string, val: string | boolean) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = q.options.map((o, j) => {
        if (j !== oIdx) return field === "isCorrect" ? { ...o, isCorrect: false } : o;
        return { ...o, [field]: val };
      });
      return { ...q, options: opts, answerKey: field === "isCorrect" && val ? q.options[oIdx].optionKey : q.answerKey };
    }));

  const handleSubmit = async () => {
    if (!form.part) { setErr("Vui lòng chọn Part"); return; }
    if (!form.code) { setErr("Vui lòng nhập Code"); return; }
    if (isListening && !media.audioFile && !media.audioUrl) { setErr("Vui lòng tải lên file Audio"); return; }
    if (isP1 && !media.imageFile && !media.imageUrl) { setErr("Vui lòng tải lên hình ảnh cho Part 1"); return; }
    if (isReadingGroup && !form.stem) { setErr("Vui lòng nhập đoạn văn bản"); return; }

    setSaving(true); setErr("");
    try {
      const allAssets: any[] = [];
      if (media.audioFile) {
        setMedia(prev => ({ ...prev, uploading: "audio" }));
        const uploadedAudio = await uploadFile(media.audioFile, "audio", 0);
        allAssets.push(uploadedAudio);
        setMedia(prev => ({ ...prev, uploading: null }));
      } else if (media.audioUrl && existingAudio) {
        allAssets.push({ kind: "audio", storageKey: existingAudio.storageKey, mimeType: existingAudio.mimeType, sortOrder: 0 });
      }

      if (media.imageFile) {
        setMedia(prev => ({ ...prev, uploading: "image" }));
        const uploadedImage = await uploadFile(media.imageFile, "image", 1);
        allAssets.push(uploadedImage);
        setMedia(prev => ({ ...prev, uploading: null }));
      } else if (media.imageUrl && existingImage) {
        allAssets.push({ kind: "image", storageKey: existingImage.storageKey, mimeType: existingImage.mimeType, sortOrder: 1 });
      }

      if (transcript) allAssets.push({ kind: "transcript", contentText: transcript, storageKey: `transcript/${form.code}`, sortOrder: 2 });

      const payload = {
        ...form,
        questions: questions.map(q => ({
          questionNo: q.questionNo, prompt: q.prompt, answerKey: q.answerKey,
          options: q.options.map((o, idx) => ({ optionKey: o.optionKey, content: o.content, isCorrect: o.isCorrect, sortOrder: idx + 1 }))
        })),
        assets: allAssets,
      };

      if (group) await apiClient.admin.questionBank.updateQuestionGroup(group.id, payload);
      else await apiClient.admin.questionBank.createQuestionGroup(payload);
      onSaved();
    } catch (e: any) {
      setMedia(prev => ({ ...prev, uploading: null }));
      setErr(Array.isArray(e.message) ? e.message.join(", ") : (e.message || "Lưu thất bại"));
    } finally {
      setMedia(prev => ({ ...prev, uploading: null }));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{group ? "Sửa nhóm câu hỏi" : "Tạo nhóm câu hỏi mới"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-gray-50/50">
          {/* Left Column: Context & Media (Fixed or scrollable separately if needed, but let's keep it simple first) */}
          <div className="w-full lg:w-5/12 border-r border-gray-100 overflow-y-auto p-6 space-y-6">
            {err && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{err}</div>}

            {/* Section 1: Thông tin chung */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3 h-3" /> Thông tin cơ bản
              </h3>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Part *</label>
                    <select value={form.part} onChange={e => handlePartChange(e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-emerald-500">
                      <option value="" disabled>-- Chọn Part --</option>
                      {PARTS.map(p => <option key={p} value={p}>Part {p.replace("P", "")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Độ khó</label>
                    <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-emerald-500">
                      {LEVELS.map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Mã (Code) *</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="VD: QB-P1-001" className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Tiêu đề nhóm *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="VD: Part 1 - Photos 01" className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-emerald-500" />
                </div>
              </div>
            </div>

            {/* Section 2: Media/Passage */}
            {(isListening || isReadingGroup) && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Upload className="w-3 h-3" /> Nội dung đi kèm
                </h3>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                  {isListening && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">File Audio *</label>
                      {media.audioUrl ? (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                          <Volume2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <audio src={media.audioUrl} controls className="h-6 flex-1 scale-90 origin-left" />
                          <button onClick={() => setMedia({ ...media, audioFile: null, audioUrl: undefined })} className="text-blue-400 hover:text-red-500 p-1"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <Music className="w-6 h-6 text-gray-300 mb-1" />
                          <span className="text-[10px] text-gray-500 text-center px-4">Tải lên Audio cho {isP1 || isP2 ? "câu hỏi" : "đoạn hội thoại"}</span>
                          <input type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setMedia({ ...media, audioFile: f, audioUrl: URL.createObjectURL(f) }); }} />
                        </label>
                      )}
                    </div>
                  )}

                  {isP1 && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Hình ảnh *</label>
                      {media.imagePreview ? (
                        <div className="relative w-full">
                          <img src={media.imagePreview} alt="preview" className="rounded-lg border border-gray-100 max-h-40 w-full object-contain bg-gray-50" />
                          <button onClick={() => setMedia({ ...media, imageFile: null, imagePreview: null })} className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow border border-gray-200 text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <ImageIcon className="w-6 h-6 text-gray-300 mb-1" />
                          <span className="text-[10px] text-gray-500">Chọn ảnh cho Part 1</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setMedia({ ...media, imageFile: f, imagePreview: URL.createObjectURL(f) }); }} />
                        </label>
                      )}
                    </div>
                  )}

                  {isP34 && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Transcript</label>
                      <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={4} placeholder="Nội dung audio..." className="w-full px-3 py-2 border border-gray-100 bg-gray-50 rounded text-xs outline-none" />
                    </div>
                  )}

                  {isReadingGroup && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Đoạn văn (Passage) *</label>
                      <textarea value={form.stem} onChange={e => setForm({ ...form, stem: e.target.value })} rows={10} placeholder="Nhập nội dung bài đọc..." className="w-full px-3 py-2 border border-gray-100 bg-gray-50 rounded text-xs outline-none" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase flex items-center gap-2">
                <FileText className="w-3 h-3" /> Giải thích chung
              </label>
              <textarea value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} rows={3} placeholder="Giải thích cho đáp án..." className="w-full px-3 py-2 border border-gray-100 bg-gray-50 rounded text-xs outline-none" />
            </div>
          </div>

          {/* Right Column: Questions List */}
          <div className="w-full lg:w-7/12 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between sticky top-0 bg-gray-50/95 py-2 z-10">
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-3 h-3" /> Danh sách câu hỏi ({questions.length})
                </h3>
                <p className="text-[9px] text-emerald-600 font-bold mt-0.5 italic">
                  {form.part === "P1" && "P1: 1 Ảnh + Audio = 1 Câu"}
                  {form.part === "P2" && "P2: 1 Audio = 1 Câu (3 đáp án)"}
                  {form.part === "P3" && "P3: 1 Hội thoại = 3 Câu"}
                  {form.part === "P4" && "P4: 1 Bài nói = 3 Câu"}
                  {form.part === "P5" && "P5: 1 Câu lẻ"}
                  {form.part === "P6" && "P6: 1 Đoạn văn = 4 Câu"}
                  {form.part === "P7" && "P7: 1 Bài đọc = 2-5 Câu"}
                </p>
              </div>
              {!isFixedQCount && (
                <button onClick={addQuestion} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-emerald-100 transition-colors">
                  <Plus className="w-3 h-3" /> Thêm câu hỏi
                </button>
              )}
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3 relative group/q">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-[10px]">{q.questionNo}</span>
                      Câu hỏi {q.questionNo}
                    </span>
                    {!isFixedQCount && questions.length > 2 && (
                      <button onClick={() => removeQuestion(qIdx)} className="text-red-300 hover:text-red-500 opacity-0 group-hover/q:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>

                  {!isP2 && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nội dung câu hỏi (Prompt)</label>
                      <input value={q.prompt} onChange={e => updateQuestion(qIdx, "prompt", e.target.value)} placeholder="VD: What is the main topic?" className="w-full px-3 py-1.5 border border-gray-100 bg-gray-50 rounded text-xs outline-none focus:border-emerald-300" />
                    </div>
                  )}

                  <div className={`grid grid-cols-1 ${isP2 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-2`}>
                    {q.options.filter(o => !isP2 || o.optionKey !== "D").map((o, oIdx) => (
                      <div key={o.optionKey} className={`flex items-center gap-2 p-2 rounded border transition-all ${o.isCorrect ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400" : "bg-white border-gray-100 hover:border-gray-300"}`}>
                        <button onClick={() => updateOption(qIdx, oIdx, "isCorrect", true)} className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${o.isCorrect ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200" : "border-gray-300 bg-white"}`}>
                          {o.isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </button>
                        <span className="text-[10px] font-bold text-gray-400 w-3">{o.optionKey}</span>
                        {!isP2 ? (
                          <input value={o.content} onChange={e => updateOption(qIdx, oIdx, "content", e.target.value)} placeholder={`Đáp án ${o.optionKey}`} className="flex-1 bg-transparent text-[11px] outline-none" />
                        ) : (
                          <span className="text-[11px] text-gray-600 font-medium">Đáp án {o.optionKey}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <p className="text-[10px] text-gray-400 font-medium italic flex items-center gap-1"><Info className="w-3 h-3"/> </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
            <button onClick={handleSubmit} disabled={saving} className="px-8 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-emerald-100">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {saving ? "Đang lưu..." : (group ? "Cập nhật nhóm" : "Tạo nhóm ngay")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ action, onConfirm, onClose }: { action: string; onConfirm: (comment: string) => void; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const label = action === "approve" ? "Phê duyệt" : action === "reject" ? "Từ chối" : action === "publish" ? "Xuất bản" : "Gửi duyệt";
  const color = action === "approve" ? "bg-emerald-600" : action === "reject" ? "bg-red-600" : "bg-blue-600";

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{label} nhóm câu hỏi</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-all"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500 uppercase">Ghi chú (Tùy chọn)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Nhập nội dung nhận xét..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
            />
          </div>
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-white transition-all">Hủy</button>
          <button onClick={() => onConfirm(comment)} className={`flex-1 py-2 ${color} text-white rounded-lg text-sm font-bold hover:opacity-90 transition-all`}>Xác nhận {label}</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Action Dropdown ──────────────────────────────────────────────────────────
function ActionMenu({ group, onAction, loading }: { group: QuestionGroup; onAction: (a: string, id: string, comment?: string) => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<string | null>(null);

  const actions = [
    { key: "submit-review", label: "Gửi duyệt", icon: <Send className="w-3.5 h-3.5" />, show: group.status === "draft" },
    { key: "approve", label: "Phê duyệt", icon: <ThumbsUp className="w-3.5 h-3.5" />, show: group.status === "in_review", color: "text-purple-600" },
    { key: "reject", label: "Từ chối", icon: <ThumbsDown className="w-3.5 h-3.5" />, show: group.status === "in_review", color: "text-red-600" },
    { key: "publish", label: "Xuất bản", icon: <Globe className="w-3.5 h-3.5" />, show: group.status === "approved", color: "text-emerald-600" },
    { key: "archive", label: "Lưu trữ", icon: <Archive className="w-3.5 h-3.5" />, show: ["published", "approved"].includes(group.status), color: "text-gray-500" },
  ].filter(a => a.show);

  if (!actions.length) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 disabled:opacity-50 transition-all">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Hành động<ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} /></>}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px] py-1 overflow-hidden">
              {actions.map(a => (
                <button key={a.key} onClick={() => { setOpen(false); setReviewAction(a.key); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-gray-50 transition-colors ${a.color ?? "text-gray-700"}`}>
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewAction && (
          <ReviewModal
            action={reviewAction}
            onClose={() => setReviewAction(null)}
            onConfirm={(comment) => {
              onAction(reviewAction, group.id, comment);
              setReviewAction(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tags Tab ─────────────────────────────────────────────────────────────────
function TagsTab() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [modal, setModal] = useState<{open:boolean;tag?:TagItem}>({open:false});
  const [search, setSearch] = useState("");

  const fetchTags = useCallback(async()=>{
    setLoading(true); setError(null);
    try {
      const res = await apiClient.admin.questionBank.listTags();
      setTags(Array.isArray(res.data)?res.data:res.data?.items??[]);
    } catch(e:any){setError(e.message||"Không thể tải tags");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchTags();},[fetchTags]);

  const handleDelete = async(id:string)=>{
    if(!confirm("Xóa tag này?")) return;
    try{ await apiClient.admin.questionBank.deleteTag(id); setTags(p=>p.filter(t=>t.id!==id)); }
    catch(e:any){alert(e.message||"Xóa thất bại");}
  };

  const filtered = tags.filter(t=>
    !search || t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc,t)=>{
    if(!acc[t.category]) acc[t.category]=[];
    acc[t.category].push(t);
    return acc;
  },{} as Record<string,TagItem[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tag..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </div>
        <button onClick={fetchTags} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-500"/></button>
        <button onClick={()=>setModal({open:true})} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">
          <Plus className="w-4 h-4"/>Tạo tag
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4"/>{error}<button onClick={fetchTags} className="ml-auto underline">Thử lại</button></div>}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 text-emerald-500 animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Tag className="w-10 h-10 mx-auto mb-2 text-gray-300"/>
          <p className="text-sm">{search ? "Không tìm thấy tag nào" : "Chưa có tag nào. Tạo tag đầu tiên!"}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([category, catTags])=>(
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg uppercase tracking-wide">{category}</span>
                <span className="text-xs text-gray-400">{catTags.length} tags</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {catTags.map(tag=>(
                  <div key={tag.id} className="bg-white border border-gray-100 rounded-xl p-3 hover:shadow-sm transition-shadow flex items-start justify-between group">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{tag.label}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{tag.code}</p>
                      {tag.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{tag.description}</p>}
                    </div>
                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>setModal({open:true,tag})} className="p-1.5 hover:bg-blue-50 rounded-lg"><Edit className="w-3.5 h-3.5 text-blue-500"/></button>
                      <button onClick={()=>handleDelete(tag.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {modal.open && <TagModal tag={modal.tag} onClose={()=>setModal({open:false})} onSaved={()=>{setModal({open:false});fetchTags();}}/>}
      </AnimatePresence>
    </div>
  );
}

// ─── Question Groups Tab ──────────────────────────────────────────────────────
function QuestionGroupsTab({ tags }: { tags: TagItem[] }) {
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPart, setFilterPart] = useState("all");
  const [modal, setModal] = useState<{open:boolean;group?:QuestionGroup}>({open:false});
  const [actionLoading, setActionLoading] = useState<string|null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchGroups = useCallback(async()=>{
    setLoading(true); setError(null);
    try {
      const res = await apiClient.admin.questionBank.listQuestionGroups({
        search: search||undefined, // Use search instead of keyword
        status: filterStatus!=="all"?filterStatus:undefined,
        part: filterPart!=="all"?filterPart:undefined,
        limit: 100 // Increased limit
      });
      
      // Correct extraction for NestJS interceptor pattern
      const resData = res.data as any;
      let items = [];
      if (Array.isArray(resData)) {
        items = resData;
      } else if (resData && Array.isArray(resData.data)) {
        items = resData.data;
      } else if (resData && Array.isArray(resData.items)) {
        items = resData.items;
      }
      setGroups(items);
    } catch(e:any){
      console.error("DEBUG: Fetch groups error:", e);
      setError(e.message||"Không thể tải dữ liệu");
    }
    finally{setLoading(false);}
  },[search,filterStatus,filterPart]);

  useEffect(()=>{fetchGroups();},[fetchGroups]);

  const handleAction = async (action: string, id: string, comment?: string) => {
    setActionLoading(id + action);
    try {
      const payload = { comment: comment || "" };
      const fns: Record<string, (id: string, payload: any) => Promise<any>> = {
        "submit-review": (id, p) => apiClient.admin.questionBank.submitReview(id, p),
        "approve": (id, p) => apiClient.admin.questionBank.approve(id, p),
        "reject": (id, p) => apiClient.admin.questionBank.reject(id, p),
        "publish": (id, p) => apiClient.admin.questionBank.publish(id, p),
        "archive": (id, p) => apiClient.admin.questionBank.archive(id, p),
      };
      if (fns[action]) await fns[action](id, payload);
      await fetchGroups();
    } catch (e: any) { alert(e.message || `${action} thất bại`); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async(id:string)=>{
    if(!confirm("Xóa nhóm câu hỏi này?")) return;
    try{ await apiClient.admin.questionBank.deleteQuestionGroup(id); setGroups(p=>p.filter(g=>g.id!==id)); }
    catch(e:any){alert(e.message||"Xóa thất bại");}
  };

  const toggleSelect = (id:string) => setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const selectAll = () => setSelected(groups.length===selected.size?new Set():new Set(groups.map(g=>g.id)));

  const stats = {
    total:groups.length,
    published:groups.filter(g=>g.status==="published").length,
    draft:groups.filter(g=>g.status==="draft").length,
    in_review:groups.filter(g=>g.status==="in_review").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:"Tổng",v:stats.total,icon:Layers,c:"bg-blue-100 text-blue-600"},
          {label:"Xuất bản",v:stats.published,icon:CheckCircle,c:"bg-green-100 text-green-600"},
          {label:"Nháp",v:stats.draft,icon:FileText,c:"bg-yellow-100 text-yellow-600"},
          {label:"Chờ duyệt",v:stats.in_review,icon:Eye,c:"bg-purple-100 text-purple-600"},
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.c}`}><s.icon className="w-4 h-4"/></div>
            <div><p className="text-xl font-bold text-gray-800">{s.v}</p><p className="text-xs text-gray-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm kiếm..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </div>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="all">Tất cả trạng thái</option>
          {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={filterPart} onChange={e=>setFilterPart(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="all">Tất cả Part</option>
          {PARTS.map(p=><option key={p} value={p}>Part {p.replace("P","")}</option>)}
        </select>
        <button onClick={fetchGroups} className="p-2 hover:bg-gray-100 rounded-lg" title="Làm mới"><RefreshCw className="w-4 h-4 text-gray-500"/></button>
        <button onClick={()=>setModal({open:true})} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">
          <Plus className="w-4 h-4"/>Tạo nhóm
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size>0 && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm flex-wrap">
          <span className="text-emerald-700 font-medium">Đã chọn {selected.size} nhóm</span>
          <button onClick={()=>apiClient.admin.questionBank.bulkStatus(Array.from(selected),"published").then(fetchGroups)} className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Xuất bản hàng loạt</button>
          <button onClick={()=>apiClient.admin.questionBank.bulkStatus(Array.from(selected),"archived").then(fetchGroups)} className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Lưu trữ hàng loạt</button>
          <button onClick={()=>setSelected(new Set())} className="ml-auto text-gray-500 hover:text-gray-700"><X className="w-4 h-4"/></button>
        </div>
      )}

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4"/>{error}<button onClick={fetchGroups} className="ml-auto underline">Thử lại</button></div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin"/></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
          <p className="font-medium text-gray-600">Chưa có nhóm câu hỏi nào</p>
          <p className="text-sm mt-1">Nhấn "Tạo nhóm" để bắt đầu thêm câu hỏi vào ngân hàng</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <input type="checkbox" checked={groups.length>0&&selected.size===groups.length} onChange={selectAll} className="rounded"/>
            <span className="flex-1">Tiêu đề / Code</span>
            <span className="w-16 text-center">Part</span>
            <span className="w-20 text-center">Độ khó</span>
            <span className="w-24 text-center">Trạng thái</span>
            <span className="w-36 text-right">Thao tác</span>
          </div>
          {groups.map(group=>{
            const isActioning = actionLoading?.startsWith(group.id);
            return (
              <motion.div key={group.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                className="bg-white rounded-xl px-4 py-3 border border-gray-100 hover:shadow-sm transition-shadow flex items-center gap-3">
                <input type="checkbox" checked={selected.has(group.id)} onChange={()=>toggleSelect(group.id)} className="rounded flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{group.title}</p>
                  <p className="text-xs text-gray-400 font-mono">{group.code}</p>
                </div>
                <span className="hidden md:block w-16 text-center text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{group.part}</span>
                <span className={`hidden md:block w-20 text-center text-xs font-medium px-2 py-0.5 rounded-lg ${LEVEL_COLOR[group.level]??"bg-gray-100 text-gray-600"}`}>{group.level}</span>
                <span className={`hidden md:block w-24 text-center text-xs font-medium px-2 py-0.5 rounded-lg ${STATUS_COLOR[group.status]??"bg-gray-100 text-gray-600"}`}>{STATUS_LABEL[group.status]??group.status}</span>
                <div className="flex items-center gap-1.5 w-36 justify-end flex-shrink-0">
                  <ActionMenu group={group} onAction={handleAction} loading={!!isActioning}/>
                  <button onClick={()=>setModal({open:true,group})} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Sửa"><Edit className="w-3.5 h-3.5 text-blue-500"/></button>
                  <button onClick={()=>handleDelete(group.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Xóa"><Trash2 className="w-3.5 h-3.5 text-red-500"/></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {modal.open && <QuestionGroupModal group={modal.group} tags={tags} onClose={()=>setModal({open:false})} onSaved={()=>{setModal({open:false});fetchGroups();}}/>}
      </AnimatePresence>
    </div>
  );
}

// ─── Workflow Banner ──────────────────────────────────────────────────────────
function WorkflowBanner() {
  const steps = [
    { n: 1, label: "Tạo Tag", desc: "Phân loại", status: "completed" },
    { n: 2, label: "Tạo nhóm", desc: "Soạn nội dung", status: "in_progress" },
    { n: 3, label: "Review", desc: "Kiểm tra", status: "pending" },
    { n: 4, label: "Xuất bản", desc: "Sử dụng", status: "pending" },
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-xs">
          <h3 className="text-xl font-bold text-gray-800">Quy trình quản lý</h3>
        </div>

        <div className="flex-1 flex items-center justify-center gap-4 flex-wrap md:flex-nowrap">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-4">
              <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                s.status === "in_progress" ? "bg-emerald-50 border-emerald-500" : "bg-gray-50 border-gray-100"
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  s.status === "completed" ? "bg-emerald-500 text-white" :
                  s.status === "in_progress" ? "bg-emerald-600 text-white" :
                  "bg-white text-gray-300 border border-gray-200"
                }`}>
                  {s.status === "completed" ? <CheckCircle className="w-4 h-4" /> : s.n}
                </div>
                <div>
                  <p className={`text-xs font-bold ${s.status === "in_progress" ? "text-emerald-700" : "text-gray-700"}`}>{s.label}</p>
                  <p className="text-[10px] text-gray-400">{s.desc}</p>
                </div>
              </div>
              {i < steps.length - 1 && <ArrowRight className="hidden md:block w-4 h-4 text-gray-300" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminQuestionsPage() {
  const [activeTab, setActiveTab] = useState<"tags"|"groups">("tags");
  const [tags, setTags] = useState<TagItem[]>([]);

  const fetchTags = useCallback(async()=>{
    try {
      const res = await apiClient.admin.questionBank.listTags();
      setTags(Array.isArray(res.data)?res.data:(res.data as any)?.items??[]);
    } catch{}
  },[]);

  useEffect(()=>{fetchTags();},[fetchTags]);

  const tabs = [
    { id:"tags" as const, label:"Tags", icon:<Tag className="w-4 h-4"/>, desc:"Quản lý nhãn phân loại" },
    { id:"groups" as const, label:"Nhóm câu hỏi", icon:<BookOpen className="w-4 h-4"/>, desc:"Ngân hàng câu hỏi" },
  ];

  return (
    <div className="space-y-5">
     

      {/* Workflow Banner */}
      <WorkflowBanner/>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab===tab.id?"bg-emerald-600 text-white shadow-sm":"bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-600"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.15}}>
          {activeTab==="tags" ? <TagsTab/> : <QuestionGroupsTab tags={tags}/>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
