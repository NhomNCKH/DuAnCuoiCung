// app/admin/exams/components/sections/SectionForm.tsx
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { SharedDropdown } from "@/components/ui/shared-dropdown";

interface SectionFormProps {
  onClose: () => void;
  onSave: (section: any) => void;
}

export function SectionForm({ onClose, onSave }: SectionFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "reading",
    part: "",
    itemCount: 0,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Thêm phần thi mới</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên phần thi</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Loại</label>
            <SharedDropdown
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
              options={[
                { value: "reading", label: "Reading" },
                { value: "writing", label: "Writing" },
              ]}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg">
              Hủy
            </button>
            <button onClick={() => onSave(formData)} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
              Thêm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}