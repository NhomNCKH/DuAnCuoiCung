// app/admin/exams/components/ExamFilters.tsx
import { Search, Grid, List } from "lucide-react";
import { ExamStatus, ExamMode, ViewMode } from "../types";
import { SharedDropdown } from "@/components/ui/shared-dropdown";

interface ExamFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatus: ExamStatus;
  onStatusChange: (value: ExamStatus) => void;
  selectedMode: ExamMode;
  onModeChange: (value: ExamMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ExamFilters({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedMode,
  onModeChange,
  viewMode,
  onViewModeChange,
}: ExamFiltersProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm đề thi theo tên, mã hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition-all outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <SharedDropdown
            value={selectedStatus}
            onChange={(value) => onStatusChange(value as ExamStatus)}
            className="min-w-[170px]"
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "published", label: "Đã xuất bản" },
              { value: "draft", label: "Bản nháp" },
              { value: "archived", label: "Đã lưu trữ" },
            ]}
          />
          <SharedDropdown
            value={selectedMode}
            onChange={(value) => onModeChange(value as ExamMode)}
            className="min-w-[160px]"
            options={[
              { value: "all", label: "Tất cả chế độ" },
              { value: "practice", label: "Luyện tập" },
              { value: "mock_test", label: "Thi thử" },
              { value: "official_exam", label: "Thi thật" },
            ]}
          />
          <div className="flex bg-gray-50 p-1 rounded-xl">
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}