"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Lock, 
  Users, 
  CheckCircle, 
  X, 
  AlertCircle,
  ShieldCheck,
  Search,
  Settings as SettingsIcon,
  RefreshCw,
  MoreVertical,
  Crown,
  GraduationCap,
  Building2,
  UserCog,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ActionIcon } from "@/components/ui/action-icons";
import { SharedDropdown } from "@/components/ui/shared-dropdown";
import { SharedTable, SharedTableBody, SharedTableHead } from "@/components/ui/shared-table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

// --- Types ---
interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions?: Permission[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  roles?: string[];
}

type SettingsTab = "roles" | "permissions" | "users";

interface RoleFormState {
  code: string;
  name: string;
  description: string;
}

interface PermissionFormState {
  code: string;
  name: string;
  module: string;
  description: string;
}

interface RoleVisual {
  icon: LucideIcon;
  iconWrapClass: string;
  iconClass: string;
}

const PERMISSION_MODULE_PRESETS = [
  "users",
  "roles",
  "permissions",
  "question-bank",
  "exam-template",
  "credential",
  "dashboard",
  "settings",
  "audit",
] as const;

const PERMISSION_ACTION_PRESETS = [
  { value: "read", label: "Xem" },
  { value: "manage", label: "Quản lý" },
  { value: "create", label: "Tạo mới" },
  { value: "update", label: "Cập nhật" },
  { value: "delete", label: "Xóa" },
  { value: "publish", label: "Xuất bản" },
  { value: "import", label: "Nhập liệu" },
] as const;

const ROLE_VISUALS: Record<string, RoleVisual> = {
  superadmin: {
    icon: Crown,
    iconWrapClass: "bg-amber-100",
    iconClass: "text-amber-700",
  },
  admin: {
    icon: UserCog,
    iconWrapClass: "bg-blue-100",
    iconClass: "text-blue-700",
  },
  org_admin: {
    icon: Building2,
    iconWrapClass: "bg-indigo-100",
    iconClass: "text-indigo-700",
  },
  learner: {
    icon: GraduationCap,
    iconWrapClass: "bg-emerald-100",
    iconClass: "text-emerald-700",
  },
};

export default function SettingsPage() {
  const { refreshToken } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Role Assignment State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [userRoleCodes, setUserRoleCodes] = useState<string[]>([]);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [showPermissionEditor, setShowPermissionEditor] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [savingEntity, setSavingEntity] = useState(false);
  const [showRolePermissionModal, setShowRolePermissionModal] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<Role | null>(null);
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<string[]>([]);
  const [savingRolePermissions, setSavingRolePermissions] = useState(false);
  const [selectedPermissionModule, setSelectedPermissionModule] = useState<string>("all");
  const [permissionAction, setPermissionAction] = useState<string>("read");
  const [isPermissionCodeManual, setIsPermissionCodeManual] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleFormState>({ code: "", name: "", description: "" });
  const [permissionForm, setPermissionForm] = useState<PermissionFormState>({
    code: "",
    name: "",
    module: "",
    description: "",
  });

  const extractArrayPayload = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.data?.data?.items)) return payload.data.data.items;
    return [];
  };

  const getErrorMessage = (err: any, fallback: string) => {
    if (typeof err?.message === "string") return err.message;
    if (Array.isArray(err?.message)) return err.message.join(", ");
    return fallback;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (activeTab === "roles") {
        res = await apiClient.admin.rbac.listRoles({
          limit: 100,
          keyword: searchTerm || undefined,
        });
      } else if (activeTab === "permissions") {
        res = await apiClient.admin.rbac.listPermissions({
          limit: 100,
          keyword: searchTerm || undefined,
        });
      } else if (activeTab === "users") {
        res = await apiClient.admin.rbac.listUsers({
          limit: 100,
          keyword: searchTerm || undefined,
        });
      }

      if (res) {
        const items = extractArrayPayload((res as any).data);

        if (activeTab === "roles") setRoles(items);
        else if (activeTab === "permissions") setPermissions(items);
        else if (activeTab === "users") setUsers(items);
      }
    } catch (err: any) {
      console.error("Failed to fetch RBAC data", err);
      setError(err.message || "Không thể tải dữ liệu từ máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, searchTerm]);

  useEffect(() => {
    const qs = searchParams ?? new URLSearchParams();
    const tab = qs.get("tab");
    if (tab === "roles" || tab === "permissions" || tab === "users") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleChangeTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams((searchParams ?? new URLSearchParams()).toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Load roles once if not already loaded to use in modal
  useEffect(() => {
    if (roles.length === 0 && activeTab !== "roles") {
      apiClient.admin.rbac.listRoles().then(res => {
        const items = extractArrayPayload((res as any).data);
        setRoles(items);
      }).catch(console.error);
    }
  }, []);

  const handleOpenRoleModal = (user: User) => {
    setSelectedUser(user);
    const currentRoleCodes = user.roles ?? (user.role ? [user.role] : []);
    setUserRoleCodes(currentRoleCodes);
    setShowRoleModal(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    setSavingRoles(true);
    try {
      await apiClient.admin.rbac.replaceUserRoles(selectedUser.id, userRoleCodes);
      setShowRoleModal(false);
      fetchData(); // Refresh user list
      notify({
        title: "Cập nhật vai trò thành công",
        message: `Đã cập nhật vai trò cho ${selectedUser.name}.`,
        variant: "success",
      });
    } catch (err: any) {
      notify({
        title: "Không thể cập nhật vai trò",
        message: err.message || "Lỗi khi cập nhật vai trò",
        variant: "error",
      });
    } finally {
      setSavingRoles(false);
    }
  };

  const toggleRoleCode = (code: string) => {
    setUserRoleCodes(prev =>
      prev.includes(code) ? prev.filter(i => i !== code) : [...prev, code]
    );
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ code: "", name: "", description: "" });
    setShowRoleEditor(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      code: role.code ?? "",
      name: role.name ?? "",
      description: role.description ?? "",
    });
    setShowRoleEditor(true);
  };

  const saveRole = async () => {
    const code = roleForm.code.trim();
    const name = roleForm.name.trim();
    if (!code || !name) {
      notify({
        title: "Thiếu thông tin",
        message: "Code và Tên vai trò là bắt buộc.",
        variant: "warning",
      });
      return;
    }

    setSavingEntity(true);
    try {
      if (editingRole) {
        await apiClient.admin.rbac.updateRole(editingRole.id, {
          code,
          name,
          description: roleForm.description.trim() || undefined,
        });
      } else {
        await apiClient.admin.rbac.createRole({
          code,
          name,
          description: roleForm.description.trim() || undefined,
        });
      }
      setShowRoleEditor(false);
      await fetchData();
      notify({
        title: editingRole ? "Cập nhật vai trò thành công" : "Tạo vai trò thành công",
        message: `${name} đã được lưu.`,
        variant: "success",
      });
    } catch (err: any) {
      notify({
        title: "Không thể lưu vai trò",
        message: getErrorMessage(err, "Không thể lưu vai trò"),
        variant: "error",
      });
    } finally {
      setSavingEntity(false);
    }
  };

  const removeRole = async (role: Role) => {
    if (!confirm(`Xóa vai trò "${role.name}" (${role.code})?`)) return;
    try {
      await apiClient.admin.rbac.deleteRole(role.id);
      await fetchData();
      notify({
        title: "Xóa vai trò thành công",
        message: `${role.name} đã được xóa.`,
        variant: "success",
      });
    } catch (err: any) {
      notify({
        title: "Không thể xóa vai trò",
        message: getErrorMessage(err, "Không thể xóa vai trò"),
        variant: "error",
      });
    }
  };

  const openAssignPermissions = async (role: Role) => {
    setSelectedRoleForPermissions(role);
    setSelectedPermissionCodes((role.permissions ?? []).map((permission) => permission.code));
    setShowRolePermissionModal(true);

    if (permissions.length === 0) {
      try {
        const res = await apiClient.admin.rbac.listPermissions({ limit: 100 });
        const items = extractArrayPayload((res as any).data);
        setPermissions(items);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const togglePermissionCode = (code: string) => {
    setSelectedPermissionCodes((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  const saveRolePermissions = async () => {
    if (!selectedRoleForPermissions) return;
    setSavingRolePermissions(true);
    try {
      await apiClient.admin.rbac.replaceRolePermissions(
        selectedRoleForPermissions.id,
        selectedPermissionCodes,
      );
      setShowRolePermissionModal(false);
      await fetchData();
      // Refresh session so permission changes take effect immediately on UI/menu guards.
      await refreshToken();
      notify({
        title: "Gán quyền thành công",
        message: "Phân quyền đã được cập nhật và sẽ áp dụng ngay.",
        variant: "success",
      });
      setTimeout(() => window.location.reload(), 300);
    } catch (err: any) {
      notify({
        title: "Không thể gán quyền",
        message: getErrorMessage(err, "Không thể gán quyền cho vai trò"),
        variant: "error",
      });
    } finally {
      setSavingRolePermissions(false);
    }
  };

  const openCreatePermission = () => {
    setEditingPermission(null);
    setPermissionAction("read");
    setIsPermissionCodeManual(false);
    setPermissionForm({ code: "", name: "", module: "users", description: "" });
    setShowPermissionEditor(true);
  };

  const openEditPermission = (permission: Permission) => {
    const inferredAction = permission.code?.split(".").pop()?.toLowerCase() || "manage";
    setEditingPermission(permission);
    setPermissionAction(inferredAction);
    setIsPermissionCodeManual(true);
    setPermissionForm({
      code: permission.code ?? "",
      name: permission.name ?? "",
      module: permission.module ?? "",
      description: permission.description ?? "",
    });
    setShowPermissionEditor(true);
  };

  const savePermission = async () => {
    const code = permissionForm.code.trim();
    const name = permissionForm.name.trim();
    if (!code || !name) {
      notify({
        title: "Thiếu thông tin",
        message: "Code và Tên quyền hạn là bắt buộc.",
        variant: "warning",
      });
      return;
    }

    setSavingEntity(true);
    try {
      if (editingPermission) {
        await apiClient.admin.rbac.updatePermission(editingPermission.id, {
          code,
          name,
          module: permissionForm.module.trim() || undefined,
          description: permissionForm.description.trim() || undefined,
        });
      } else {
        await apiClient.admin.rbac.createPermission({
          code,
          name,
          module: permissionForm.module.trim() || undefined,
          description: permissionForm.description.trim() || undefined,
        });
      }
      setShowPermissionEditor(false);
      await fetchData();
      notify({
        title: editingPermission ? "Cập nhật quyền hạn thành công" : "Tạo quyền hạn thành công",
        message: `${name} đã được lưu.`,
        variant: "success",
      });
    } catch (err: any) {
      notify({
        title: "Không thể lưu quyền hạn",
        message: getErrorMessage(err, "Không thể lưu quyền hạn"),
        variant: "error",
      });
    } finally {
      setSavingEntity(false);
    }
  };

  const removePermission = async (permission: Permission) => {
    if (!confirm(`Xóa quyền "${permission.name}" (${permission.code})?`)) return;
    try {
      await apiClient.admin.rbac.deletePermission(permission.id);
      await fetchData();
      notify({
        title: "Xóa quyền hạn thành công",
        message: `${permission.name} đã được xóa.`,
        variant: "success",
      });
    } catch (err: any) {
      notify({
        title: "Không thể xóa quyền hạn",
        message: getErrorMessage(err, "Không thể xóa quyền hạn"),
        variant: "error",
      });
    }
  };

  const tabs = [
    { id: "roles", label: "Vai trò", icon: Shield, desc: "Quản lý nhóm quyền" },
    { id: "permissions", label: "Quyền hạn", icon: Lock, desc: "Danh mục hành động" },
    { id: "users", label: "Phân quyền User", icon: Users, desc: "Gán vai trò cho người dùng" },
  ];

  const permissionRows = useMemo(
    () =>
      permissions
        .filter((permission) =>
          selectedPermissionModule === "all"
            ? true
            : (permission.module || "core").toLowerCase() === selectedPermissionModule
        )
        .sort((a, b) => {
        const moduleA = (a.module || "core").toLowerCase();
        const moduleB = (b.module || "core").toLowerCase();
        if (moduleA !== moduleB) return moduleA.localeCompare(moduleB);
        return (a.code || "").toLowerCase().localeCompare((b.code || "").toLowerCase());
      }),
    [permissions, selectedPermissionModule]
  );

  const permissionModuleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const permission of permissions) {
      const moduleKey = (permission.module || "core").toLowerCase();
      stats[moduleKey] = (stats[moduleKey] ?? 0) + 1;
    }
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [permissions]);

  const getRoleVisual = (roleCode?: string): RoleVisual => {
    const normalized = (roleCode || "").toLowerCase();
    return (
      ROLE_VISUALS[normalized] ?? {
        icon: ShieldAlert,
        iconWrapClass: "bg-slate-100",
        iconClass: "text-slate-600",
      }
    );
  };

  useEffect(() => {
    if (activeTab !== "permissions" && selectedPermissionModule !== "all") {
      setSelectedPermissionModule("all");
    }
  }, [activeTab, selectedPermissionModule]);

  useEffect(() => {
    if (!showPermissionEditor || editingPermission || isPermissionCodeManual) return;

    const normalizedModule = permissionForm.module
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (!normalizedModule) return;

    const actionLabel =
      PERMISSION_ACTION_PRESETS.find((item) => item.value === permissionAction)?.label ?? "Quản lý";
    const moduleLabel = normalizedModule.replace(/[_-]/g, " ");
    const generatedCode = `${normalizedModule}.${permissionAction}`;

    setPermissionForm((prev) => {
      const nextName = prev.name?.trim() ? prev.name : `${actionLabel} ${moduleLabel}`;
      if (prev.code === generatedCode && prev.name === nextName) return prev;
      return { ...prev, code: generatedCode, name: nextName };
    });
  }, [showPermissionEditor, editingPermission, isPermissionCodeManual, permissionForm.module, permissionAction]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {showRoleEditor && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                {editingRole ? "Cập nhật vai trò" : "Tạo vai trò mới"}
              </h2>
              <button onClick={() => setShowRoleEditor(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 gap-3">
              <input
                value={roleForm.code}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Code (vd: admin, org_admin)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={roleForm.name}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Tên vai trò"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowRoleEditor(false)}
                className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={saveRole}
                disabled={savingEntity}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEntity ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionEditor && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                {editingPermission ? "Cập nhật quyền hạn" : "Tạo quyền hạn mới"}
              </h2>
              <button onClick={() => setShowPermissionEditor(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-500">Module</p>
                  <input
                    value={permissionForm.module}
                    onChange={(e) =>
                      setPermissionForm((prev) => ({ ...prev, module: e.target.value }))
                    }
                    placeholder="VD: users"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    list="permission-module-presets"
                  />
                  <datalist id="permission-module-presets">
                    {PERMISSION_MODULE_PRESETS.map((moduleName) => (
                      <option key={moduleName} value={moduleName} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-500">Hành động</p>
                  <SharedDropdown
                    value={permissionAction}
                    onChange={setPermissionAction}
                    options={PERMISSION_ACTION_PRESETS.map((item) => ({
                      value: item.value,
                      label: `${item.label} (${item.value})`,
                    }))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {PERMISSION_MODULE_PRESETS.map((moduleName) => (
                  <button
                    key={moduleName}
                    type="button"
                    onClick={() =>
                      setPermissionForm((prev) => ({ ...prev, module: moduleName }))
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${
                      permissionForm.module.toLowerCase() === moduleName
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {moduleName}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={isPermissionCodeManual}
                  onChange={(e) => setIsPermissionCodeManual(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                Sửa tay mã quyền (code)
              </label>

              <input
                value={permissionForm.code}
                onChange={(e) => setPermissionForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Code (vd: users.read)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!isPermissionCodeManual}
              />
              <input
                value={permissionForm.name}
                onChange={(e) => setPermissionForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Tên quyền hạn"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <textarea
                value={permissionForm.description}
                onChange={(e) => setPermissionForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowPermissionEditor(false)}
                className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={savePermission}
                disabled={savingEntity}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEntity ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRolePermissionModal && selectedRoleForPermissions && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Gán quyền cho vai trò</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedRoleForPermissions.name} ({selectedRoleForPermissions.code})
                </p>
              </div>
              <button
                onClick={() => setShowRolePermissionModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[420px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
              {permissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissionCodes.includes(permission.code)}
                    onChange={() => togglePermissionCode(permission.code)}
                    className="mt-0.5 w-4 h-4 accent-blue-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{permission.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400">
                      {permission.code}
                    </p>
                    {permission.module && (
                      <p className="text-[10px] text-blue-600 mt-0.5">Module: {permission.module}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowRolePermissionModal(false)}
                className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={saveRolePermissions}
                disabled={savingRolePermissions}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {savingRolePermissions ? "Đang lưu..." : "Lưu phân quyền"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      <AnimatePresence>
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Gán vai trò</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Người dùng: {selectedUser.name}</p>
                </div>
                <button onClick={() => setShowRoleModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-2 max-h-[400px] overflow-y-auto">
                {roles.map(role => (
                  <button 
                    key={role.id}
                    onClick={() => toggleRoleCode(role.code)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                      userRoleCodes.includes(role.code)
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        userRoleCodes.includes(role.code) ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${userRoleCodes.includes(role.code) ? "text-blue-900" : "text-gray-700"}`}>
                          {role.name}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{role.code}</p>
                      </div>
                    </div>
                    {userRoleCodes.includes(role.code) && (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSaveRoles}
                  disabled={savingRoles}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {savingRoles ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {savingRoles ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Header Row */}
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleChangeTab(tab.id as SettingsTab)}
                className={`h-10 px-1 text-sm font-bold transition-all relative ${
                  isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </div>
                {isActive && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="h-10 w-10 inline-flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              if (activeTab === "roles") openCreateRole();
              if (activeTab === "permissions") openCreatePermission();
            }}
            disabled={activeTab === "users"}
            className="h-10 inline-flex items-center gap-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ActionIcon action="add" className="w-4 h-4" />
            <span>
              {activeTab === "roles"
                ? "Thêm vai trò"
                : activeTab === "permissions"
                  ? "Thêm quyền hạn"
                  : "Thêm mới"}
            </span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Tìm kiếm ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>Sắp xếp: Mới nhất</span>
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400 text-xs font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-lg text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <h3 className="font-bold text-gray-900">Không thể tải dữ liệu</h3>
              <p className="text-gray-500 text-sm mt-1">{error}</p>
              <button onClick={fetchData} className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700">
                Thử lại
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "roles" && (
                <motion.div
                  key="roles"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 gap-3"
                >
                  {roles.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">Chưa có vai trò nào.</div>
                  ) : (
                    roles.map((role) => {
                      const roleVisual = getRoleVisual(role.code);
                      const RoleIcon = roleVisual.icon;
                      return (
                      <div key={role.id} className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded flex items-center justify-center ${roleVisual.iconWrapClass}`}>
                            <RoleIcon className={`w-5 h-5 ${roleVisual.iconClass}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-800">{role.name}</h4>
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded uppercase tracking-tight">{role.code}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openAssignPermissions(role)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all"
                            title="Gán quyền cho vai trò"
                          >
                            <ActionIcon action="assignPermission" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditRole(role)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <ActionIcon action="edit" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeRole(role)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <ActionIcon action="delete" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )})
                  )}
                </motion.div>
              )}

              {activeTab === "permissions" && (
                <motion.div
                  key="permissions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {permissionRows.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">Chưa có quyền hạn nào.</div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedPermissionModule("all")}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            selectedPermissionModule === "all"
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200"
                          }`}
                        >
                          TẤT CẢ ({permissions.length})
                        </button>
                        {permissionModuleStats.map(([moduleName, count]) => (
                          <button
                            key={moduleName}
                            onClick={() => setSelectedPermissionModule(moduleName)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              selectedPermissionModule === moduleName
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200"
                            }`}
                          >
                            <span className="uppercase">{moduleName}</span>
                            <span className="text-blue-500">({count})</span>
                          </button>
                        ))}
                      </div>

                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <div className="overflow-x-auto">
                          <SharedTable className="min-w-[760px]">
                            <SharedTableHead>
                              <tr>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Permission</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Code</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Module</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Mô tả</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Thao tác</th>
                              </tr>
                            </SharedTableHead>
                            <SharedTableBody>
                              {permissionRows.map((perm) => (
                                <tr key={perm.id}>
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-semibold text-gray-800">{perm.name}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <code className="rounded bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">
                                      {perm.code}
                                    </code>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-blue-700">
                                      {perm.module || "core"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="max-w-[320px] truncate text-xs text-gray-500">
                                      {perm.description || "—"}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => openEditPermission(perm)}
                                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                                        title="Sửa quyền hạn"
                                      >
                                        <SettingsIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => removePermission(perm)}
                                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                                        title="Xóa quyền hạn"
                                      >
                                        <ActionIcon action="delete" className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </SharedTableBody>
                          </SharedTable>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "users" && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 gap-3"
                >
                  {users.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">Không tìm thấy người dùng.</div>
                  ) : (
                    users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-800 text-white rounded flex items-center justify-center font-bold text-sm shadow-sm">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">{u.name}</h4>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vai trò</span>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {(u.roles && u.roles.length > 0 ? u.roles : [u.role || "learner"]).slice(0, 3).map((roleCode) => {
                                const roleVisual = getRoleVisual(roleCode);
                                const RoleIcon = roleVisual.icon;
                                return (
                                  <span
                                    key={`${u.id}-${roleCode}`}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg"
                                  >
                                    <RoleIcon className={`w-3 h-3 ${roleVisual.iconClass}`} />
                                    <span className="text-[10px] font-bold text-gray-700 uppercase">
                                      {roleCode}
                                    </span>
                                  </span>
                                );
                              })}
                              {(u.roles?.length || 0) > 3 && (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600">
                                  +{(u.roles?.length || 0) - 3}
                                </span>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleOpenRoleModal(u)}
                            className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all"
                          >
                            <ActionIcon action="assignRole" className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

    </div>
  );
}
