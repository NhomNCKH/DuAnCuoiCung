// app/admin/exams/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Loader2, Info, ArrowRight } from "lucide-react";
import { ActionIcon } from "@/components/ui/action-icons";
import { ExamStats } from "./components/ExamStats";
import { ExamFilters } from "./components/ExamFilters";
import { ExamCard } from "./components/ExamCard";
import { ExamListItem } from "./components/ExamListItem";
import { ExamDetailModal } from "./components/ExamDetailModal";
import { CreateExamModal } from "./components/CreateExamModal";
import { useExamTemplates } from "./hooks/useExamTemplates";
import { useExamActions } from "./hooks/useExamActions";

type ViewMode = "grid" | "list";
type ExamStatus = "all" | "published" | "draft" | "archived";
type ExamMode = "all" | "practice" | "mock_test" | "official_exam";

// ─── Workflow Banner ──────────────────────────────────────────────────────────
function WorkflowBanner() {
  const steps = [
    { n: 1, label: "Thông tin", desc: "Code, tên, mode" },
    { n: 2, label: "Cấu trúc", desc: "Sections" },
    { n: 3, label: "Quy tắc", desc: "Rules" },
    { n: 4, label: "Câu hỏi", desc: "Fill questions" },
    { n: 5, label: "Xuất bản", desc: "Publish" },
  ];
  return (
    <div className="workflow-banner-exams bg-white border border-gray-100 rounded-2xl p-4 shadow-sm overflow-hidden relative group">
      <div className="relative flex flex-col md:flex-row items-center gap-4 md:gap-8">
        <div className="flex-shrink-0 flex flex-col items-center md:items-start border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-8">
          <span className="workflow-banner-kicker text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Workflow</span>
          <h3 className="text-lg font-black text-gray-900 leading-tight">Quy trình<br className="hidden md:block" /> thiết lập</h3>
        </div>

        <div className="flex-1 w-full overflow-hidden">
          <div className="flex items-center justify-between py-1">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center flex-1 last:flex-none group/step">
                <div className="flex items-center gap-3 transition-all duration-300 transform group-hover/step:translate-x-1">
                  <div className="relative">
                    <div className="workflow-step-dot w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-gray-400 group-hover/step:bg-blue-600 group-hover/step:text-white group-hover/step:border-blue-600 group-hover/step:shadow-lg group-hover/step:shadow-blue-200 transition-all duration-300">
                      {s.n}
                    </div>
                    {/* Active dot indicator if needed, but keeping it simple for now */}
                  </div>
                  <div className="flex flex-col">
                    <span className="workflow-step-label text-[11px] font-bold text-gray-800 group-hover/step:text-blue-700 transition-colors duration-300">{s.label}</span>
                    <span className="workflow-step-desc text-[9px] text-gray-400 font-medium group-hover/step:text-gray-500 transition-colors duration-300">{s.desc}</span>
                  </div>
                </div>
                
                {i < steps.length - 1 && (
                  <div className="workflow-step-connector flex-1 mx-4 h-[1px] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 relative overflow-hidden">
                    <div className="workflow-step-connector-glow absolute inset-0 bg-blue-400 transform -translate-x-full group-hover/step:translate-x-full transition-transform duration-1000 ease-in-out opacity-30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminExamsPage() {
  const { templates, loading, error, stats, refresh } = useExamTemplates();
  const { publishExam, duplicateExam } = useExamActions();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ExamStatus>("all");
  const [selectedMode, setSelectedMode] = useState<ExamMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredTemplates = Array.isArray(templates)
    ? templates.filter((template) => {
        const matchesSearch =
          template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === "all" || template.status === selectedStatus;
        const matchesMode = selectedMode === "all" || template.mode === selectedMode;
        return matchesSearch && matchesStatus && matchesMode;
      })
    : [];

  const handlePublish = async (id: string) => {
    await publishExam(id);
    refresh();
  };

  const handleDuplicate = async (id: string) => {
    await duplicateExam(id);
    refresh();
  };

  // After creating, auto-open detail modal on Sections tab so user can continue the workflow
  const handleCreateSuccess = (id: string) => {
    setShowCreateModal(false);
    refresh();
    setSelectedTemplate({ id, name: "Đề thi mới", status: "draft", _initialTab: "sections" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Không thể tải dữ liệu</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={() => refresh()} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Thử lại
        </button>
      </div>
    );
  }

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800"></h1>
          <p className="text-gray-500 text-sm mt-0.5"></p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm transition-all self-start md:self-auto"
        >
          <ActionIcon action="add" className="w-4 h-4" />
          <span className="font-bold text-sm">Tạo đề thi mới</span>
        </button>
      </div>

      {/* Workflow Banner */}
      <WorkflowBanner />

      {/* Stats */}
      <ExamStats stats={stats} />

      {/* Filters */}
      <ExamFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Templates */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-1">Không tìm thấy đề thi</h3>
          <p className="text-gray-500 text-sm">Hãy thử thay đổi bộ lọc hoặc tạo đề thi mới</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto">
            <ActionIcon action="add" className="w-4 h-4" />Tạo đề thi đầu tiên
          </button>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className={viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5" : "space-y-3"}
        >
          {filteredTemplates.map((template) =>
            viewMode === "grid" ? (
              <ExamCard
                key={template.id}
                template={template}
                onSelect={setSelectedTemplate}
                onDuplicate={handleDuplicate}
                onPublish={template.status === "draft" ? handlePublish : undefined}
              />
            ) : (
              <ExamListItem
                key={template.id}
                template={template}
                onSelect={setSelectedTemplate}
                onDuplicate={handleDuplicate}
                onPublish={template.status === "draft" ? handlePublish : undefined}
              />
            )
          )}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedTemplate && (
          <ExamDetailModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onRefresh={refresh}
            initialTab={selectedTemplate._initialTab ?? "overview"}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <CreateExamModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
