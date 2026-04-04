"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag, Search, Loader2, AlertCircle, X,
  CheckCircle, Send, ThumbsUp, ThumbsDown, Archive, Globe,
  ChevronDown, Layers, FileText, BookOpen, Eye, RefreshCw,
  ArrowRight, Info, Music, ImageIcon, Upload, Volume2, FileUp,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getSignedMediaUrl } from "@/lib/media-url";
import { AdminConfirmDialog, AdminPagination } from "@/components/admin";
import { useToast } from "@/hooks/useToast";
import { ActionIcon } from "@/components/ui/action-icons";
import { SharedDropdown } from "@/components/ui/shared-dropdown";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TagItem { id: string; category: string; code: string; label: string; description?: string; }
interface QuestionGroup {
  id: string; code: string; title: string; part: string; level: string;
  status: string; tagCodes?: string[]; createdAt: string;
  /** Số câu (API danh sách — loadRelationCount) */
  questionCount?: number;
  stem?: string; explanation?: string;
  assets?: { id: string; kind: string; storageKey: string; publicUrl: string; mimeType: string; sortOrder: number; contentText?: string }[];
  questions?: { id: string; questionNo: number; prompt: string; answerKey: string; options: { optionKey: string; content: string; isCorrect: boolean }[] }[];
  reviews?: { id: string; action: string; comment?: string; createdAt: string; createdBy?: any }[];
}

type WorkflowStats = {
  tagCount: number;
  totalGroups: number;
  inReview: number;
  approved: number;
  published: number;
  archived: number;
};

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function parseQuestionGroupsResponse(raw: any): {
  items: QuestionGroup[];
  pagination: PaginationState;
} {
  const fallback: PaginationState = { page: 1, limit: 20, total: 0, totalPages: 1 };
  if (!raw) return { items: [], pagination: fallback };

  if (Array.isArray(raw)) {
    return {
      items: raw as QuestionGroup[],
      pagination: { page: 1, limit: raw.length || 20, total: raw.length, totalPages: 1 },
    };
  }

  if (Array.isArray(raw.data)) {
    const pg = raw.pagination ?? {};
    const total = Number(pg.total ?? raw.data.length ?? 0);
    const limit = Number(pg.limit ?? raw.data.length ?? 20);
    const page = Number(pg.page ?? 1);
    return {
      items: raw.data as QuestionGroup[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Number(pg.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)))),
      },
    };
  }

  if (Array.isArray(raw.items)) {
    const total = Number(raw.total ?? raw.items.length ?? 0);
    const limit = Number(raw.limit ?? raw.items.length ?? 20);
    const page = Number(raw.page ?? 1);
    return {
      items: raw.items as QuestionGroup[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
      },
    };
  }

  return { items: [], pagination: fallback };
}

const PARTS = ["P1","P2","P3","P4","P5","P6","P7"];
const LEVELS = ["easy","medium","hard","expert"];
const STATUSES = ["draft","in_review","approved","published","archived"];
const STATUS_LABEL: Record<string,string> = { draft:"Nháp", in_review:"Chờ duyệt", approved:"Đã duyệt", published:"Xuất bản", archived:"Lưu trữ" };
/** Badge đồng bộ globals.css (.qg-status / .qg-level) — dark mode: nền mờ + viền, giống status-chip users */
const STATUS_CLASS: Record<string, string> = {
  draft: "qg-status qg-status--draft",
  in_review: "qg-status qg-status--in_review",
  approved: "qg-status qg-status--approved",
  published: "qg-status qg-status--published",
  archived: "qg-status qg-status--archived",
};
const LEVEL_CLASS: Record<string, string> = {
  easy: "qg-level qg-level--easy",
  medium: "qg-level qg-level--medium",
  hard: "qg-level qg-level--hard",
  expert: "qg-level qg-level--expert",
};

// ─── Tag Modal ────────────────────────────────────────────────────────────────
function TagModal({
  tag,
  onClose,
  onSaved,
}: {
  tag?: TagItem;
  onClose: () => void;
  onSaved: (mode: "create" | "update") => void;
}) {
  const [form, setForm] = useState({ category: tag?.category ?? "", code: tag?.code ?? "", label: tag?.label ?? "", description: tag?.description ?? "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.code || !form.label) { setErr("Vui lòng điền đầy đủ thông tin bắt buộc"); return; }
    setSaving(true); setErr("");
    try {
      if (tag) {
        await apiClient.admin.questionBank.updateTag(tag.id, form);
        onSaved("update");
      } else {
        await apiClient.admin.questionBank.createTag(form);
        onSaved("create");
      }
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
              <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="grammar" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code * <span className="text-gray-400 font-normal">(unique)</span></label>
              <input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="grammar:tense" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Label * <span className="text-gray-400 font-normal">(tên hiển thị)</span></label>
            <input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} placeholder="Tense" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mô tả</label>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Mô tả ngắn..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
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
function QuestionGroupModal({
  group,
  tags,
  readOnly = false,
  onClose,
  onSaved,
}: {
  group?: QuestionGroup;
  tags: TagItem[];
  /** true: chỉ xem (nhóm đã xuất bản / kiểm soát nội dung) */
  readOnly?: boolean;
  onClose: () => void;
  onSaved: (mode: "create" | "update") => void;
}) {
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
    metadata?: Record<string, unknown>;
  };
  const [questions, setQuestions] = useState<QItem[]>(
    group?.questions?.map(q => ({ 
      id: q.id, questionNo: q.questionNo, prompt: q.prompt, answerKey: q.answerKey, options: q.options,
      audioUrl: (q as any).metadata?.audioUrl,
      transcript: (q as any).metadata?.transcript,
      metadata: (q as any).metadata ?? {},
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
  const [tagKeyword, setTagKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const ro = readOnly;

  const isListening = ["P1", "P2", "P3", "P4"].includes(form.part);
  const isP1 = form.part === "P1";
  const isP2 = form.part === "P2";
  const isP34 = ["P3", "P4"].includes(form.part);
  const isReadingGroup = ["P6", "P7"].includes(form.part);
  const isP5 = form.part === "P5";
  const supportsOptionalImage = isP34;
  const showImageUpload = isP1 || supportsOptionalImage;
  const filteredTags = tags.filter((t) => {
    if (!tagKeyword.trim()) return true;
    const keyword = tagKeyword.toLowerCase();
    return (
      t.label.toLowerCase().includes(keyword) ||
      t.code.toLowerCase().includes(keyword) ||
      t.category.toLowerCase().includes(keyword)
    );
  });

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

  const handleImageSelected = (file?: File | null) => {
    if (!file) return;
    setMedia((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      imageUrl: undefined,
    }));
  };

  const clearImageSelection = () => {
    setMedia((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
      imageUrl: undefined,
    }));
  };

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

    const uploadWithFallback = async () => {
      try {
        const s3Res = await fetch(signedPutUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!s3Res.ok) throw new Error(`Direct upload failed: ${s3Res.status}`);
      } catch {
        const formData = new FormData();
        formData.append("signedPutUrl", signedPutUrl);
        formData.append("contentType", file.type || "application/octet-stream");
        formData.append("file", file);
        const proxyRes = await fetch("/api/s3-upload", {
          method: "POST",
          body: formData,
        });
        if (!proxyRes.ok) {
          throw new Error(`Tải file ${kind} lên S3 thất bại`);
        }
      }
    };

    await uploadWithFallback();

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
    if (ro) return;
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
          metadata: q.metadata ?? {},
          options: q.options.map((o, idx) => ({ optionKey: o.optionKey, content: o.content, isCorrect: o.isCorrect, sortOrder: idx + 1 }))
        })),
        assets: allAssets,
      };

      if (group) {
        await apiClient.admin.questionBank.updateQuestionGroup(group.id, payload);
        onSaved("update");
      } else {
        await apiClient.admin.questionBank.createQuestionGroup(payload);
        onSaved("create");
      }
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="question-bank-modal-surface bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800">
              {ro ? "Chi tiết nhóm câu hỏi" : group ? "Sửa nhóm câu hỏi" : "Tạo nhóm câu hỏi mới"}
            </h2>
            {ro && (
              <p className="mt-0.5 text-xs font-medium text-amber-700">Chế độ chỉ xem — nội dung đã xuất bản không chỉnh sửa tại đây.</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg shrink-0"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="question-bank-modal-body flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/80">
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
                    <SharedDropdown
                      value={form.part}
                      onChange={handlePartChange}
                      disabled={ro}
                      options={[
                        { value: "", label: "-- Chọn Part --" },
                        ...PARTS.map((p) => ({ value: p, label: `Part ${p.replace("P", "")}` })),
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Độ khó</label>
                    <SharedDropdown
                      value={form.level}
                      onChange={(value) => setForm({ ...form, level: value })}
                      disabled={ro}
                      options={LEVELS.map((l) => ({
                        value: l,
                        label: l.charAt(0).toUpperCase() + l.slice(1),
                      }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Mã (Code) *</label>
                  <input readOnly={ro} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="VD: QB-P1-001" className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-500 read-only:bg-gray-50 read-only:cursor-default" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Tiêu đề nhóm *</label>
                  <input readOnly={ro} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="VD: Part 1 - Photos 01" className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-500 read-only:bg-gray-50 read-only:cursor-default" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Tags</label>
                  <input
                    readOnly={ro}
                    value={tagKeyword}
                    onChange={(e) => setTagKeyword(e.target.value)}
                    placeholder="Tìm tag theo code/label..."
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-500 read-only:bg-gray-50 read-only:cursor-default"
                  />
                  <div className="mt-2 max-h-28 overflow-y-auto rounded border border-gray-100 bg-gray-50 p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {filteredTags.slice(0, 40).map((tag) => {
                        const selected = form.tagCodes.includes(tag.code);
                        return (
                          <button
                            type="button"
                            key={tag.id}
                            disabled={ro}
                            onClick={() =>
                              !ro &&
                              setForm((prev) => ({
                                ...prev,
                                tagCodes: selected
                                  ? prev.tagCodes.filter((code: string) => code !== tag.code)
                                  : [...prev.tagCodes, tag.code],
                              }))
                            }
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:cursor-default disabled:opacity-70 ${
                              selected
                                ? "border-blue-300 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-white text-gray-600 hover:border-blue-200"
                            }`}
                          >
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                          {!ro && (
                            <button type="button" onClick={() => setMedia({ ...media, audioFile: null, audioUrl: undefined })} className="text-blue-400 hover:text-red-500 p-1"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      ) : !ro ? (
                        <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <Music className="w-6 h-6 text-gray-300 mb-1" />
                          <span className="text-[10px] text-gray-500 text-center px-4">Tải lên Audio cho {isP1 || isP2 ? "câu hỏi" : "đoạn hội thoại"}</span>
                          <input type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setMedia({ ...media, audioFile: f, audioUrl: URL.createObjectURL(f) }); }} />
                        </label>
                      ) : (
                        <p className="py-4 text-center text-xs text-gray-400">Không có file audio.</p>
                      )}
                    </div>
                  )}

                  {showImageUpload && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">
                          {isP1 ? "Hình ảnh *" : "Hình ảnh (Tùy chọn)"}
                        </label>
                        {supportsOptionalImage && (
                          <span className="text-[10px] text-gray-400">
                            Dùng khi câu hỏi cần biểu đồ, sơ đồ hoặc lịch trình
                          </span>
                        )}
                      </div>
                      {media.imagePreview ? (
                        <div className="relative w-full">
                          <img src={media.imagePreview} alt="preview" className="rounded-lg border border-gray-100 max-h-40 w-full object-contain bg-gray-50" />
                          {!ro && (
                            <button type="button" onClick={clearImageSelection} className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow border border-gray-200 text-red-500"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      ) : !ro ? (
                        <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <ImageIcon className="w-6 h-6 text-gray-300 mb-1" />
                          <span className="text-[10px] text-gray-500 text-center px-4">
                            {isP1
                              ? "Chọn ảnh cho Part 1"
                              : `Thêm ảnh minh họa cho ${form.part === "P3" ? "đoạn hội thoại" : "bài nói"} nếu cần`}
                          </span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleImageSelected(e.target.files?.[0])} />
                        </label>
                      ) : (
                        <p className="py-4 text-center text-xs text-gray-400">Không có hình đính kèm.</p>
                      )}
                    </div>
                  )}

                  {isP34 && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Transcript</label>
                      <textarea readOnly={ro} value={transcript} onChange={e => setTranscript(e.target.value)} rows={4} placeholder="Nội dung audio..." className="w-full px-3 py-2 border border-gray-100 bg-gray-50 rounded text-xs outline-none read-only:cursor-default" />
                    </div>
                  )}

                  {isReadingGroup && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Đoạn văn (Passage) *</label>
                      <textarea readOnly={ro} value={form.stem} onChange={e => setForm({ ...form, stem: e.target.value })} rows={10} placeholder="Nhập nội dung bài đọc..." className="w-full px-3 py-2 border border-gray-100 bg-gray-50 rounded text-xs outline-none read-only:cursor-default" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="text-[10px] font-bold text-gray-500 mb-2 uppercase flex items-center gap-2">
                <FileText className="w-3 h-3" /> Giải thích chung
              </label>
              <textarea readOnly={ro} value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} rows={3} placeholder="Giải thích cho đáp án..." className="w-full px-3 py-2 border border-gray-100 bg-gray-50 rounded text-xs outline-none read-only:cursor-default" />
            </div>
          </div>

          {/* Right Column: Questions List */}
          <div className="w-full lg:w-7/12 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between sticky top-0 bg-gray-50/95 py-2 z-10">
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-3 h-3" /> Danh sách câu hỏi ({questions.length})
                </h3>
                <p className="text-[9px] text-blue-600 font-bold mt-0.5 italic">
                  {form.part === "P1" && "P1: 1 Ảnh + Audio = 1 Câu"}
                  {form.part === "P2" && "P2: 1 Audio = 1 Câu (3 đáp án)"}
                  {form.part === "P3" && "P3: 1 Hội thoại (+ ảnh nếu cần) = 3 Câu"}
                  {form.part === "P4" && "P4: 1 Bài nói (+ ảnh nếu cần) = 3 Câu"}
                  {form.part === "P5" && "P5: 1 Câu lẻ"}
                  {form.part === "P6" && "P6: 1 Đoạn văn = 4 Câu"}
                  {form.part === "P7" && "P7: 1 Bài đọc = 2-5 Câu"}
                </p>
              </div>
              {!isFixedQCount && !ro && (
                <button type="button" onClick={addQuestion} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors">
                  <ActionIcon action="add" className="w-3 h-3" /> Thêm câu hỏi
                </button>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white/90 px-6 py-10 text-center">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">
                  {form.part ? "Chưa có câu hỏi trong nhóm này" : "Chọn Part để khởi tạo bộ câu hỏi mẫu"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {form.part
                    ? "Bạn có thể thêm thủ công hoặc đổi Part để tự tạo theo chuẩn TOEIC."
                    : "Hệ thống sẽ tự dựng cấu trúc câu hỏi phù hợp từng Part để bạn chỉnh sửa nhanh."}
                </p>
              </div>
            ) : (
            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3 relative group/q">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-[10px]">{q.questionNo}</span>
                      Câu hỏi {q.questionNo}
                    </span>
                    {!isFixedQCount && !ro && questions.length > 2 && (
                      <button type="button" onClick={() => removeQuestion(qIdx)} className="text-red-300 hover:text-red-500 opacity-0 group-hover/q:opacity-100 transition-opacity"><ActionIcon action="delete" className="w-3.5 h-3.5" /></button>
                    )}
                  </div>

                  {!isP2 && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nội dung câu hỏi (Prompt)</label>
                      <input readOnly={ro} value={q.prompt} onChange={e => updateQuestion(qIdx, "prompt", e.target.value)} placeholder="VD: What is the main topic?" className="w-full px-3 py-1.5 border border-gray-100 bg-gray-50 rounded text-xs outline-none focus:border-blue-300 read-only:cursor-default" />
                    </div>
                  )}

                  <div className={`grid grid-cols-1 ${isP2 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-2`}>
                    {q.options.filter(o => !isP2 || o.optionKey !== "D").map((o, oIdx) => (
                      <div key={o.optionKey} className={`flex items-center gap-2 p-2 rounded border transition-all ${o.isCorrect ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400" : "bg-white border-gray-100 hover:border-gray-300"}`}>
                        <button type="button" disabled={ro} onClick={() => !ro && updateOption(qIdx, oIdx, "isCorrect", true)} className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 disabled:cursor-default ${o.isCorrect ? "bg-blue-500 border-blue-500 shadow-sm shadow-blue-200" : "border-gray-300 bg-white"}`}>
                          {o.isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </button>
                        <span className="text-[10px] font-bold text-gray-400 w-3">{o.optionKey}</span>
                        {!isP2 ? (
                          <input readOnly={ro} value={o.content} onChange={e => updateOption(qIdx, oIdx, "content", e.target.value)} placeholder={`Đáp án ${o.optionKey}`} className="flex-1 bg-transparent text-[11px] outline-none read-only:cursor-default" />
                        ) : (
                          <span className="text-[11px] text-gray-600 font-medium">Đáp án {o.optionKey}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <p className="text-[10px] text-gray-400 font-medium italic flex items-center gap-1"><Info className="w-3 h-3"/> </p>
          <div className="flex gap-3">
            {ro ? (
              <button type="button" onClick={onClose} className="px-8 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors">
                Đóng
              </button>
            ) : (
              <>
                <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                <button type="button" onClick={handleSubmit} disabled={saving} className="px-8 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-blue-100">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {saving ? "Đang lưu..." : (group ? "Cập nhật nhóm" : "Tạo nhóm ngay")}
                </button>
              </>
            )}
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
  const color = action === "approve" ? "bg-blue-600" : action === "reject" ? "bg-red-600" : "bg-indigo-600";

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
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
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
    { key: "publish", label: "Xuất bản", icon: <Globe className="w-3.5 h-3.5" />, show: group.status === "approved", color: "text-blue-600" },
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
function TagsTab({ onDataChanged }: { onDataChanged?: () => void }) {
  const { notify } = useToast();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [modal, setModal] = useState<{open:boolean;tag?:TagItem}>({open:false});
  const [search, setSearch] = useState("");
  const [tagToDelete, setTagToDelete] = useState<TagItem | null>(null);
  const [deletingTag, setDeletingTag] = useState(false);

  const fetchTags = useCallback(async()=>{
    setLoading(true); setError(null);
    try {
      const res = await apiClient.admin.questionBank.listTags();
      setTags(Array.isArray(res.data)?res.data:res.data?.items??[]);
    } catch(e:any){setError(e.message||"Không thể tải tags");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchTags();},[fetchTags]);

  const handleDelete = async () => {
    if (!tagToDelete) return;
    setDeletingTag(true);
    try {
      await apiClient.admin.questionBank.deleteTag(tagToDelete.id);
      setTags((prev) => prev.filter((t) => t.id !== tagToDelete.id));
      notify({
        title: "Xóa tag thành công",
        message: `Tag "${tagToDelete.label}" đã được xóa.`,
        variant: "success",
      });
      onDataChanged?.();
      setTagToDelete(null);
    } catch (e: any) {
      notify({
        title: "Xóa tag thất bại",
        message: e.message || "Không thể xóa tag.",
        variant: "error",
      });
    } finally {
      setDeletingTag(false);
    }
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
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tag..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
        </div>
        <button onClick={fetchTags} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-500"/></button>
        <button onClick={()=>setModal({open:true})} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <ActionIcon action="add" className="w-4 h-4"/>Tạo tag
        </button> 
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4"/>{error}<button onClick={fetchTags} className="ml-auto underline">Thử lại</button></div>}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 text-blue-500 animate-spin"/></div>
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
                      <button onClick={()=>setModal({open:true,tag})} className="p-1.5 hover:bg-blue-50 rounded-lg"><ActionIcon action="edit" className="w-3.5 h-3.5 text-blue-500"/></button>
                      <button onClick={() => setTagToDelete(tag)} className="p-1.5 hover:bg-red-50 rounded-lg"><ActionIcon action="delete" className="w-3.5 h-3.5 text-red-500"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {modal.open && (
          <TagModal
            tag={modal.tag}
            onClose={() => setModal({ open: false })}
            onSaved={(mode) => {
              setModal({ open: false });
              fetchTags();
              notify({
                title: mode === "create" ? "Tạo tag thành công" : "Cập nhật tag thành công",
                message: mode === "create" ? "Tag mới đã được thêm vào hệ thống." : "Thông tin tag đã được cập nhật.",
                variant: "success",
              });
              onDataChanged?.();
            }}
          />
        )}
      </AnimatePresence>
      <AdminConfirmDialog
        open={!!tagToDelete}
        title="Xóa tag này?"
        description={
          tagToDelete
            ? `Tag "${tagToDelete.label}" sẽ bị xóa vĩnh viễn và không thể hoàn tác.`
            : undefined
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        loading={deletingTag}
        danger
        onClose={() => {
          if (!deletingTag) setTagToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── Question Groups Tab ──────────────────────────────────────────────────────
function QuestionGroupsTab({
  tags,
  workflowStats,
  onDataChanged,
}: {
  tags: TagItem[];
  workflowStats: WorkflowStats;
  onDataChanged?: () => void;
}) {
  const { notify } = useToast();
  const { user } = useAuth();
  const roleCodes =
    user?.roles?.length && user.roles.length > 0
      ? user.roles
      : user?.role
        ? [user.role]
        : [];
  const canEditPublishedAsSuperadmin =
    user?.role === "superadmin" || roleCodes.includes("superadmin");
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPart, setFilterPart] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [modal, setModal] = useState<{
    open: boolean;
    group?: QuestionGroup;
    readOnly?: boolean;
  }>({ open: false });
  const [actionLoading, setActionLoading] = useState<string|null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [bulkTagCodes, setBulkTagCodes] = useState<string[]>([]);
  const [bulkTagSaving, setBulkTagSaving] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<QuestionGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus, filterPart]);

  const fetchGroups = useCallback(async()=>{
    setLoading(true); setError(null);
    try {
      const res = await apiClient.admin.questionBank.listQuestionGroups({
        page,
        keyword: debouncedSearch || undefined,
        status: filterStatus!=="all"?filterStatus:undefined,
        part: filterPart!=="all"?filterPart:undefined,
        limit: 20
      });
      const parsed = parseQuestionGroupsResponse(res.data as any);
      setGroups(parsed.items);
      setPagination(parsed.pagination);
      if (parsed.pagination.totalPages > 0 && page > parsed.pagination.totalPages) {
        setPage(parsed.pagination.totalPages);
      }
    } catch(e:any){
      setError(e.message||"Không thể tải dữ liệu");
    }
    finally{setLoading(false);}
  },[page,debouncedSearch,filterStatus,filterPart]);

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
      const actionLabel: Record<string, string> = {
        "submit-review": "Gửi duyệt",
        approve: "Phê duyệt",
        reject: "Từ chối",
        publish: "Xuất bản",
        archive: "Lưu trữ",
      };
      notify({
        title: `${actionLabel[action] || "Cập nhật"} thành công`,
        message: "Trạng thái nhóm câu hỏi đã được cập nhật.",
        variant: "success",
      });
      onDataChanged?.();
    } catch (e: any) {
      notify({
        title: "Thao tác thất bại",
        message: e.message || `${action} thất bại`,
        variant: "error",
      });
    }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    setDeletingGroup(true);
    try {
      await apiClient.admin.questionBank.deleteQuestionGroup(groupToDelete.id);
      setGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id));
      notify({
        title: "Xóa nhóm câu hỏi thành công",
        message: `Nhóm "${groupToDelete.title}" đã được xóa.`,
        variant: "success",
      });
      onDataChanged?.();
      setGroupToDelete(null);
    } catch (e: any) {
      notify({
        title: "Xóa thất bại",
        message: e.message || "Không thể xóa nhóm câu hỏi.",
        variant: "error",
      });
    } finally {
      setDeletingGroup(false);
    }
  };

  const handleBulkStatus = async (status: "published" | "archived") => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await apiClient.admin.questionBank.bulkStatus(ids, status);
      await fetchGroups();
      setSelected(new Set());
      notify({
        title: status === "published" ? "Xuất bản hàng loạt thành công" : "Lưu trữ hàng loạt thành công",
        message: `Đã cập nhật ${ids.length} nhóm câu hỏi.`,
        variant: "success",
      });
      onDataChanged?.();
    } catch (e: any) {
      notify({
        title: "Thao tác hàng loạt thất bại",
        message: e.message || "Không thể cập nhật trạng thái hàng loạt.",
        variant: "error",
      });
    }
  };

  const handleBulkTag = async () => {
    const ids = Array.from(selected);
    if (!ids.length || bulkTagCodes.length === 0) return;
    setBulkTagSaving(true);
    try {
      await apiClient.admin.questionBank.bulkTag(ids, bulkTagCodes);
      await fetchGroups();
      setBulkTagModalOpen(false);
      setBulkTagCodes([]);
      notify({
        title: "Gắn tag hàng loạt thành công",
        message: `Đã cập nhật ${ids.length} nhóm câu hỏi.`,
        variant: "success",
      });
      onDataChanged?.();
    } catch (e: any) {
      notify({
        title: "Gắn tag thất bại",
        message: e.message || "Không thể gắn tag hàng loạt.",
        variant: "error",
      });
    } finally {
      setBulkTagSaving(false);
    }
  };

  /** Đã xuất bản → chỉ xem; còn lại → sửa */
  const openGroupDetailModal = async (
    group: QuestionGroup,
    mode: "view" | "edit",
  ) => {
    setLoadingDetailId(group.id);
    try {
      const res = await apiClient.admin.questionBank.getQuestionGroup(group.id);
      const payload = (res.data as any)?.data ?? res.data;
      setModal({
        open: true,
        group: payload as QuestionGroup,
        readOnly: mode === "view",
      });
    } catch (e: any) {
      notify({
        title: "Không tải được chi tiết nhóm",
        message:
          e?.statusCode === 403
            ? "Bạn không có quyền mở chi tiết nhóm câu hỏi này."
            : (e.message || "Vui lòng thử lại."),
        variant: "error",
      });
    } finally {
      setLoadingDetailId(null);
    }
  };

  const toggleSelect = (id:string) => setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const selectAll = () => setSelected(groups.length===selected.size?new Set():new Set(groups.map(g=>g.id)));

  const stats = {
    total: workflowStats.totalGroups,
    published: workflowStats.published,
    draft:
      Math.max(
        0,
        workflowStats.totalGroups -
          workflowStats.inReview -
          workflowStats.approved -
          workflowStats.published -
          workflowStats.archived,
      ),
    in_review: workflowStats.inReview,
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
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm kiếm..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
        </div>
        <SharedDropdown
          value={filterStatus}
          onChange={setFilterStatus}
          className="min-w-[170px]"
          options={[
            { value: "all", label: "Tất cả trạng thái" },
            ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
          ]}
        />
        <SharedDropdown
          value={filterPart}
          onChange={setFilterPart}
          className="min-w-[150px]"
          options={[
            { value: "all", label: "Tất cả Part" },
            ...PARTS.map((p) => ({ value: p, label: `Part ${p.replace("P", "")}` })),
          ]}
        />
        <button onClick={fetchGroups} className="p-2 hover:bg-gray-100 rounded-lg" title="Làm mới"><RefreshCw className="w-4 h-4 text-gray-500"/></button>
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 border border-blue-200 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100"
        >
          <FileUp className="w-4 h-4" />
          Import JSON
        </button>
        <button onClick={()=>setModal({ open: true, readOnly: false })} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <ActionIcon action="add" className="w-4 h-4"/>Tạo nhóm
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size>0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm flex-wrap">
          <span className="text-blue-700 font-medium">Đã chọn {selected.size} nhóm</span>
          <button onClick={() => setBulkTagModalOpen(true)} className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Gắn tag hàng loạt</button>
          <button onClick={() => handleBulkStatus("published")} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Xuất bản hàng loạt</button>
          <button onClick={() => handleBulkStatus("archived")} className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Lưu trữ hàng loạt</button>
          <button onClick={()=>setSelected(new Set())} className="ml-auto text-gray-500 hover:text-gray-700"><X className="w-4 h-4"/></button>
        </div>
      )}

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4"/>{error}<button onClick={fetchGroups} className="ml-auto underline">Thử lại</button></div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin"/></div>
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
            <span className="w-14 shrink-0 text-center">Số câu</span>
            <span className="w-16 text-center">Part</span>
            <span className="w-20 text-center">Độ khó</span>
            <span className="w-24 text-center">Trạng thái</span>
            <span className="w-40 text-right">Thao tác</span>
          </div>
          {groups.map(group=>{
            const isActioning = actionLoading?.startsWith(group.id);
            const qCount =
              typeof group.questionCount === "number"
                ? group.questionCount
                : group.questions?.length;
            const isPublished = group.status === "published";
            return (
              <motion.div key={group.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                className="bg-white rounded-xl px-4 py-3 border border-gray-100 hover:shadow-sm transition-shadow flex items-center gap-3">
                <input type="checkbox" checked={selected.has(group.id)} onChange={()=>toggleSelect(group.id)} className="rounded flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{group.title}</p>
                  <p className="text-xs text-gray-400 font-mono">{group.code}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500 md:hidden">
                    {qCount != null ? `${qCount} câu` : "—"}
                  </p>
                </div>
                <span className="hidden md:inline-flex w-14 shrink-0 justify-center text-xs font-bold tabular-nums text-slate-700 bg-slate-100 px-2 py-1 rounded-lg" title="Số câu trong nhóm">
                  {qCount != null ? qCount : "—"}
                </span>
                <span className="hidden md:block w-16 text-center text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{group.part}</span>
                <span className={`hidden md:block w-20 text-center text-xs font-medium px-2 py-1 rounded-full ${LEVEL_CLASS[group.level] ?? "qg-level qg-level--default"}`}>{group.level}</span>
                <span className={`hidden md:block w-24 text-center text-xs font-medium px-2 py-1 rounded-full ${STATUS_CLASS[group.status] ?? "qg-status qg-status--default"}`}>{STATUS_LABEL[group.status] ?? group.status}</span>
                <div className="flex items-center gap-1.5 w-40 justify-end flex-shrink-0">
                  <ActionMenu group={group} onAction={handleAction} loading={!!isActioning}/>
                  <button
                    type="button"
                    onClick={() =>
                      openGroupDetailModal(group, isPublished ? "view" : "edit")
                    }
                    className="p-1.5 rounded-lg hover:bg-blue-50"
                    title={isPublished ? "Xem chi tiết (chỉ đọc)" : "Sửa nhóm"}
                  >
                    {loadingDetailId === group.id ? (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    ) : isPublished ? (
                      <Eye className="w-3.5 h-3.5 text-blue-600" aria-hidden />
                    ) : (
                      <ActionIcon action="edit" className="w-3.5 h-3.5 text-blue-500"/>
                    )}
                  </button>
                  <button type="button" onClick={() => setGroupToDelete(group)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Xóa"><ActionIcon action="delete" className="w-3.5 h-3.5 text-red-500"/></button>
                </div>
              </motion.div>
            );
          })}
          {pagination.totalPages > 1 && (
            <AdminPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              loading={loading}
              onPageChange={setPage}
              itemLabel="nhóm"
            />
          )}
        </div>
      )}

      <AnimatePresence>
        {modal.open && (
          <QuestionGroupModal
            group={modal.group}
            tags={tags}
            readOnly={modal.readOnly === true}
            onClose={() => setModal({ open: false })}
            onSaved={(mode) => {
              setModal({ open: false });
              fetchGroups();
              notify({
                title: mode === "create" ? "Tạo nhóm câu hỏi thành công" : "Cập nhật nhóm câu hỏi thành công",
                message: mode === "create" ? "Nhóm câu hỏi mới đã được tạo." : "Nhóm câu hỏi đã được cập nhật.",
                variant: "success",
              });
              onDataChanged?.();
            }}
          />
        )}
      </AnimatePresence>
      <AdminConfirmDialog
        open={!!groupToDelete}
        title="Xóa nhóm câu hỏi này?"
        description={
          groupToDelete
            ? `Nhóm "${groupToDelete.title}" sẽ bị xóa vĩnh viễn.`
            : undefined
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        loading={deletingGroup}
        danger
        onClose={() => {
          if (!deletingGroup) setGroupToDelete(null);
        }}
        onConfirm={handleDelete}
      />
      <BulkTagModal
        open={bulkTagModalOpen}
        tags={tags}
        selectedCodes={bulkTagCodes}
        saving={bulkTagSaving}
        onToggleCode={(code) =>
          setBulkTagCodes((prev) =>
            prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
          )
        }
        onClose={() => {
          if (bulkTagSaving) return;
          setBulkTagModalOpen(false);
          setBulkTagCodes([]);
        }}
        onConfirm={handleBulkTag}
      />
      <ImportQuestionGroupsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={async () => {
          await fetchGroups();
          setSelected(new Set());
          onDataChanged?.();
        }}
      />
    </div>
  );
}

function ImportQuestionGroupsModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
}) {
  const { notify } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [err, setErr] = useState("");

  const resetState = () => {
    setFile(null);
    setGroups([]);
    setPreview(null);
    setLoading(false);
    setCommitting(false);
    setErr("");
  };

  const handleClose = () => {
    if (loading || committing) return;
    resetState();
    onClose();
  };

  const handlePreview = async () => {
    if (!file) {
      setErr("Vui lòng chọn file JSON để import");
      return;
    }

    setErr("");
    setLoading(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const parsedGroups = Array.isArray(parsed) ? parsed : parsed?.groups;
      if (!Array.isArray(parsedGroups) || parsedGroups.length === 0) {
        throw new Error("File JSON phải chứa mảng groups hợp lệ");
      }

      const previewRes = await apiClient.admin.questionBank.previewImport(parsedGroups, file.name);
      setGroups(parsedGroups);
      setPreview(previewRes.data);
    } catch (e: any) {
      setPreview(null);
      setGroups([]);
      setErr(e.message || "Preview import thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!groups.length) return;
    setCommitting(true);
    setErr("");
    try {
      if (!file) throw new Error("Thiếu file import");
      const presign = await apiClient.admin.questionBank.presignImport({
        contentType: file.type || "application/json",
        fileName: file.name,
      });
      const presignData = (presign.data ?? {}) as { signedPutUrl?: string };
      if (!presignData.signedPutUrl) {
        throw new Error("Không lấy được signed URL cho file import");
      }

      try {
        const uploadRes = await fetch(presignData.signedPutUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/json" },
        });
        if (!uploadRes.ok) throw new Error(`Direct import upload failed: ${uploadRes.status}`);
      } catch {
        const formData = new FormData();
        formData.append("signedPutUrl", presignData.signedPutUrl);
        formData.append("contentType", file.type || "application/json");
        formData.append("file", file);
        const proxyRes = await fetch("/api/s3-upload", {
          method: "POST",
          body: formData,
        });
        if (!proxyRes.ok) throw new Error("Upload file import lên S3 thất bại");
      }

      await apiClient.admin.questionBank.commitImport(groups, file?.name);
      await onImported();
      notify({
        title: "Import thành công",
        message: `Đã import ${groups.length} nhóm câu hỏi.`,
        variant: "success",
      });
      handleClose();
    } catch (e: any) {
      setErr(e.message || "Commit import thất bại");
    } finally {
      setCommitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h3 className="text-base font-bold text-gray-800">Import nhóm câu hỏi (JSON)</h3>
            <p className="mt-1 text-xs text-gray-500">FE xin sign URL từ BE và upload file trực tiếp lên S3 trước khi preview/commit.</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {err && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {err}
            </div>
          )}

          <label className="block rounded-xl border-2 border-dashed border-gray-200 p-5 text-center hover:bg-gray-50">
            <FileUp className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-700">{file ? file.name : "Chọn file JSON để import"}</p>
            <p className="text-xs text-gray-500">Chấp nhận dạng mảng `groups` hoặc object có trường `groups`.</p>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] ?? null;
                setFile(selectedFile);
                setPreview(null);
                setGroups([]);
                setErr("");
              }}
            />
          </label>

          {preview && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
              <div>
                <p className="text-gray-500">Tổng nhóm</p>
                <p className="text-lg font-bold text-gray-800">{preview.totalGroups ?? groups.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Hợp lệ</p>
                <p className="text-lg font-bold text-green-600">{preview.validGroups ?? 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Lỗi</p>
                <p className="text-lg font-bold text-red-600">{preview.invalidGroups ?? 0}</p>
              </div>
              <div>
                <p className="text-gray-500">File nguồn</p>
                <p className="truncate text-sm font-medium text-gray-800">{file?.name}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button onClick={handleClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-white">
            Hủy
          </button>
          <button
            onClick={handlePreview}
            disabled={!file || loading || committing}
            className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            {loading ? "Đang preview..." : "Preview"}
          </button>
          <button
            onClick={handleCommit}
            disabled={!preview || (preview.invalidGroups ?? 1) > 0 || loading || committing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {committing ? "Đang import..." : "Commit import"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function BulkTagModal({
  open,
  tags,
  selectedCodes,
  saving,
  onToggleCode,
  onClose,
  onConfirm,
}: {
  open: boolean;
  tags: TagItem[];
  selectedCodes: string[];
  saving: boolean;
  onToggleCode: (code: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (!open) setKeyword("");
  }, [open]);

  if (!open) return null;

  const filteredTags = tags.filter((tag) => {
    if (!keyword.trim()) return true;
    const value = keyword.toLowerCase();
    return (
      tag.label.toLowerCase().includes(value) ||
      tag.code.toLowerCase().includes(value) ||
      tag.category.toLowerCase().includes(value)
    );
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h3 className="text-base font-bold text-gray-800">Gắn tag hàng loạt</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm tag..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-2">
            {filteredTags.map((tag) => {
              const active = selectedCodes.includes(tag.code);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onToggleCode(tag.code)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="font-medium">{tag.label}</span>
                  <span className="text-xs font-mono text-gray-500">{tag.code}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-white">
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || selectedCodes.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Đang gắn..." : "Gắn tag"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Workflow Banner ──────────────────────────────────────────────────────────
function WorkflowBanner({ stats }: { stats: WorkflowStats }) {
  const activeStep =
    stats.tagCount === 0
      ? 1
      : stats.totalGroups === 0
        ? 2
        : stats.inReview > 0
          ? 3
          : stats.approved > 0 && stats.published === 0
            ? 4
            : 0;

  const steps = [
    { n: 1, label: "Tạo Tag", desc: "Phân loại" },
    { n: 2, label: "Tạo nhóm", desc: "Soạn nội dung" },
    { n: 3, label: "Review", desc: "Kiểm tra" },
    { n: 4, label: "Xuất bản", desc: "Sử dụng" },
  ];

  return (
    <div className="workflow-banner-questions rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2 overflow-x-auto">
        <div className="flex min-w-[680px] flex-1 items-center gap-2">
          {steps.map((s, i) => {
            const step = i + 1;
            const isCompleted =
              step === 1
                ? stats.tagCount > 0
                : step === 2
                  ? stats.totalGroups > 0
                  : step === 3
                    ? stats.approved + stats.published + stats.archived > 0
                    : stats.published > 0;
            const isActive = step === activeStep;

            return (
              <div key={s.n} className="flex flex-1 items-center gap-2">
                <div
                  className={`relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-1.5 transition-colors ${
                    isCompleted
                      ? "border-amber-300 bg-amber-50/80"
                      : isActive
                        ? "border-amber-400 bg-white shadow-sm"
                        : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/40 to-transparent"
                      animate={{ x: ["-120%", "120%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <div
                    className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full font-bold text-[11px] ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-amber-400 text-slate-900"
                          : "border border-gray-200 bg-white text-gray-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-3.5 w-3.5" /> : s.n}
                  </div>
                  <div className="relative z-10 min-w-0">
                    <p
                      className={`truncate text-[11px] font-bold leading-tight ${
                        isCompleted || isActive ? "text-amber-800" : "text-gray-700"
                      }`}
                    >
                      {s.label}
                    </p>
                    <p className="truncate text-[10px] text-gray-400 leading-tight">{s.desc}</p>
                  </div>
                </div>

                {i < steps.length - 1 && (
                  <div className="relative h-[2px] w-5 overflow-hidden rounded bg-gray-200">
                    {step < activeStep - 1 && <div className="h-full w-full bg-amber-400" />}
                    {step === activeStep - 1 && (
                      <motion.div
                        className="h-full w-1/2 bg-amber-400"
                        animate={{ x: ["-120%", "220%"] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminQuestionsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"tags"|"groups">("tags");
  const [tags, setTags] = useState<TagItem[]>([]);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats>({
    tagCount: 0,
    totalGroups: 0,
    inReview: 0,
    approved: 0,
    published: 0,
    archived: 0,
  });

  const fetchTags = useCallback(async()=>{
    try {
      const res = await apiClient.admin.questionBank.listTags();
      setTags(Array.isArray(res.data)?res.data:(res.data as any)?.items??[]);
    } catch{}
  },[]);

  useEffect(()=>{fetchTags();},[fetchTags]);

  const fetchWorkflowStats = useCallback(async () => {
    try {
      const [
        tagsRes,
        totalRes,
        inReviewRes,
        approvedRes,
        publishedRes,
        archivedRes,
      ] = await Promise.all([
        apiClient.admin.questionBank.listTags(),
        apiClient.admin.questionBank.listQuestionGroups({ page: 1, limit: 1 }),
        apiClient.admin.questionBank.listQuestionGroups({ page: 1, limit: 1, status: "in_review" }),
        apiClient.admin.questionBank.listQuestionGroups({ page: 1, limit: 1, status: "approved" }),
        apiClient.admin.questionBank.listQuestionGroups({ page: 1, limit: 1, status: "published" }),
        apiClient.admin.questionBank.listQuestionGroups({ page: 1, limit: 1, status: "archived" }),
      ]);

      const tagItems = Array.isArray(tagsRes.data) ? tagsRes.data : ((tagsRes.data as any)?.items ?? []);
      const totalParsed = parseQuestionGroupsResponse(totalRes.data as any);
      const inReviewParsed = parseQuestionGroupsResponse(inReviewRes.data as any);
      const approvedParsed = parseQuestionGroupsResponse(approvedRes.data as any);
      const publishedParsed = parseQuestionGroupsResponse(publishedRes.data as any);
      const archivedParsed = parseQuestionGroupsResponse(archivedRes.data as any);

      setWorkflowStats({
        tagCount: tagItems.length,
        totalGroups: totalParsed.pagination.total,
        inReview: inReviewParsed.pagination.total,
        approved: approvedParsed.pagination.total,
        published: publishedParsed.pagination.total,
        archived: archivedParsed.pagination.total,
      });
    } catch {
      // Keep existing stats on transient API errors
    }
  }, []);

  useEffect(() => {
    fetchWorkflowStats();
  }, [fetchWorkflowStats]);

  useEffect(() => {
    const tabFromQuery = searchParams.get("tab");
    setActiveTab(tabFromQuery === "groups" ? "groups" : "tags");
  }, [searchParams]);

  const handleChangeTab = (tab: "tags" | "groups") => {
    setActiveTab(tab);
    router.replace(`${pathname}?tab=${tab}`);
  };

  const tabs = [
    { id:"tags" as const, label:"Tag", icon:<Tag className="w-4 h-4"/>, desc:"Quản lý nhãn phân loại" },
    { id:"groups" as const, label:"Nhóm câu hỏi", icon:<BookOpen className="w-4 h-4"/>, desc:"Ngân hàng câu hỏi" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-center gap-6 border-b border-gray-200/80">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleChangeTab(tab.id)}
              className={`-mb-px inline-flex h-10 items-center gap-2 border-b-2 px-1 text-base font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-w-0 xl:ml-4 xl:flex-1">
          <WorkflowBanner stats={workflowStats} />
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.15}}>
          {activeTab==="tags"
            ? <TagsTab onDataChanged={fetchWorkflowStats} />
            : <QuestionGroupsTab tags={tags} workflowStats={workflowStats} onDataChanged={fetchWorkflowStats} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
