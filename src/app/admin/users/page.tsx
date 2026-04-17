// app/admin/users/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users, Search,
  Mail, Calendar, CheckCircle, XCircle, Loader2, Clock,
  AlertCircle, X, Save,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { EnhancedStatCard } from "@/components/ui/EnhancedStatCard";
import { AdminCard, AdminConfirmDialog, AdminEmptyState } from "@/components/admin";
import { useToast } from "@/hooks/useToast";
import { ActionIcon } from "@/components/ui/action-icons";
import { SharedDropdown } from "@/components/ui/shared-dropdown";
import { SharedTable, SharedTableBody, SharedTableHead } from "@/components/ui/shared-table";
import { useAuth } from "@/hooks/useAuth";
import { getSignedMediaUrl } from "@/lib/media-url";

interface RbacUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  roles?: string[];
  avatarUrl?: string | null;
}

interface RbacRoleOption {
  id: string;
  code: string;
  name: string;
}

interface UserModalProps {
  user?: RbacUser;
  onClose: () => void;
  onSaved: () => void;
  onNotify: (title: string, message?: string, variant?: "success" | "error" | "info" | "warning") => void;
}

function UserModal({ user, onClose, onSaved, onNotify }: UserModalProps) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    status: user?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || (!isEdit && !form.password.trim())) {
      setErr("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }
    if (isEdit && form.password.trim() && form.password.trim().length < 6) {
      setErr("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      if (isEdit && user) {
        const updatePayload: { name: string; email: string; status: string; password?: string } = {
          name: form.name.trim(),
          email: form.email.trim(),
          status: form.status,
        };
        if (form.password.trim()) {
          updatePayload.password = form.password.trim();
        }
        await apiClient.admin.rbac.updateUser(user.id, {
          ...updatePayload,
        });
      } else {
        await apiClient.admin.rbac.createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          status: form.status,
        });
      }
      onSaved();
      onNotify(
        isEdit ? "Cập nhật người dùng thành công" : "Tạo người dùng thành công",
        isEdit ? `Đã cập nhật ${form.name}.` : `Đã tạo người dùng ${form.name}.`,
        "success"
      );
      onClose();
    } catch (e: any) {
      const message = e.message || "Lưu thất bại";
      setErr(message);
      onNotify(isEdit ? "Không thể cập nhật người dùng" : "Không thể tạo người dùng", message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px]"
        onClick={onClose}
        aria-label="close user modal"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{isEdit ? "Chỉnh sửa người dùng" : "Thêm người dùng"}</h3>
            <p className="text-sm text-gray-500">{isEdit ? `${user?.name} — ${user?.email}` : "Tạo tài khoản mới"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {err && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />{err}
            </div>
          )}
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Họ và tên"
            autoComplete="name"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            autoComplete="email"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder={isEdit ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu (tối thiểu 6 ký tự)"}
            autoComplete={isEdit ? "new-password" : "new-password"}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
          />
          <SharedDropdown
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            options={[
              { value: "active", label: "Hoạt động" },
              { value: "pending_verification", label: "Chờ xác thực" },
            ]}
          />
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [users, setUsers] = useState<RbacUser[]>([]);
  const [avatarByUserId, setAvatarByUserId] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<RbacRoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<RbacUser | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<RbacUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const extractArrayPayload = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.data?.data?.items)) return payload.data.data.items;
    return [];
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.admin.rbac.listUsers({
        keyword: searchTerm || undefined,
        role: selectedRole !== "all" ? selectedRole : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      });
      const list: RbacUser[] = extractArrayPayload(res?.data);
      setUsers(list);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách người dùng");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedRole, selectedStatus]);

  const extractS3KeyFromUrl = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (!u.hostname.includes("amazonaws.com")) return null;
      const key = u.pathname.replace(/^\/+/, "");
      return key || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const entries = (users ?? [])
        .map((u) => ({ id: u.id, avatarUrl: String(u.avatarUrl ?? "").trim() }))
        .filter((u) => u.avatarUrl);

      if (entries.length === 0) {
        setAvatarByUserId({});
        return;
      }

      const next: Record<string, string> = {};
      for (const e of entries) {
        const s3Key = extractS3KeyFromUrl(e.avatarUrl);
        if (s3Key) {
          const signed = await getSignedMediaUrl(s3Key);
          if (signed) next[e.id] = signed;
          else next[e.id] = e.avatarUrl;
        } else {
          next[e.id] = e.avatarUrl;
        }
      }

      if (!cancelled) setAvatarByUserId(next);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [users]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiClient.admin.rbac.listRoles({
        page: 1,
        limit: 100,
        sort: "name",
        order: "ASC",
      });
      const roleList = extractArrayPayload(res?.data) as RbacRoleOption[];
      setRoles(roleList);
    } catch {
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "status-chip status-chip--active";
      case "pending_verification": return "status-chip status-chip--pending";
      case "suspended": return "status-chip status-chip--suspended";
      case "deleted": return "status-chip status-chip--deleted";
      default: return "status-chip status-chip--default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Hoạt động";
      case "pending_verification": return "Chờ xác thực";
      case "suspended": return "Bị khóa";
      case "deleted": return "Đã xóa";
      default: return status;
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const filteredUsers = useMemo(
    () => users.filter((u) => u.status !== "deleted"),
    [users]
  );
  const roleOptions = useMemo(
    () =>
      roles
        .filter((role) => role?.code)
        .map((role) => ({ value: role.code, label: role.name?.trim() || role.code })),
    [roles]
  );
  const roleOptionsFromUsers = useMemo(() => {
    const roleCodes = new Set<string>();
    users.forEach((u) => {
      (u.roles ?? []).forEach((code) => {
        if (code) roleCodes.add(code);
      });
      if (u.role) roleCodes.add(u.role);
    });
    return Array.from(roleCodes)
      .sort((a, b) => a.localeCompare(b))
      .map((code) => ({
        value: code,
        label: code
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
      }));
  }, [users]);
  const mergedRoleOptions = roleOptions.length > 0 ? roleOptions : roleOptionsFromUsers;
  const roleDropdownOptions = useMemo(
    () => [{ value: "all", label: "Tất cả vai trò" }, ...mergedRoleOptions],
    [mergedRoleOptions]
  );
  const statusDropdownOptions = useMemo(
    () => [
      { value: "all", label: "Tất cả trạng thái" },
      { value: "active", label: "Hoạt động" },
      { value: "pending_verification", label: "Chờ xác thực" },
      { value: "suspended", label: "Bị khóa" },
    ],
    []
  );
  const canManageUsers = (user?.permissions ?? []).includes("users.manage");

  const activeCount = filteredUsers.filter((u) => u.status === "active").length;
  const pendingCount = filteredUsers.filter((u) => u.status === "pending_verification").length;
  const suspendedCount = filteredUsers.filter((u) => u.status === "suspended").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <EnhancedStatCard icon={Users} label="Tổng người dùng" value={filteredUsers.length} change="" color="from-blue-500 to-blue-600" bgColor="bg-white" index={0} compact tone="blue" />
        <EnhancedStatCard icon={CheckCircle} label="Đang hoạt động" value={activeCount} change="" color="from-green-500 to-green-600" bgColor="bg-white" index={1} compact tone="green" />
        <EnhancedStatCard icon={Clock} label="Chờ xác thực" value={pendingCount} change="" color="from-yellow-500 to-yellow-600" bgColor="bg-white" index={2} compact tone="yellow" />
        <EnhancedStatCard icon={XCircle} label="Bị khóa" value={suspendedCount} change="" color="from-red-500 to-red-600" bgColor="bg-white" index={3} compact tone="red" />
      </motion.div>

      {/* Filters */}
      <AdminCard>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              name="admin-user-search"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <SharedDropdown
            value={selectedRole}
            onChange={setSelectedRole}
            options={roleDropdownOptions}
            className="min-w-[180px]"
          />
          <SharedDropdown
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={statusDropdownOptions}
            className="min-w-[160px]"
          />
          <button
            className="btn-primary ml-0 md:ml-1"
            onClick={() => setCreatingUser(true)}
            disabled={!canManageUsers}
          >
            <ActionIcon action="add" className="w-4 h-4" />
            <span>Thêm người dùng</span>
          </button>
        </div>
      </AdminCard>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={fetchUsers} className="ml-auto text-sm underline">Thử lại</button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <SharedTable>
              <SharedTableHead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dùng</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </SharedTableHead>
              <SharedTableBody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      <AdminEmptyState icon={Users} title="Không có người dùng nào" />
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <motion.tr key={user.id} variants={item} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {avatarByUserId[user.id] ? (
                            <img
                              src={avatarByUserId[user.id]}
                              alt="avatar"
                              className="h-9 w-9 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "";
                                setAvatarByUserId((prev) => {
                                  const next = { ...prev };
                                  delete next[user.id];
                                  return next;
                                });
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {user.name?.charAt(0) ?? "?"}
                            </div>
                          )}
                          <p className="font-medium text-gray-800">{user.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((roleCode) => (
                              <span key={roleCode} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium capitalize">
                                {roleCode}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium capitalize">
                              {user.role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                          {getStatusLabel(user.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => canManageUsers && setEditingUser(user)}
                            title="Chỉnh sửa người dùng"
                            disabled={!canManageUsers}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ActionIcon action="edit" className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!canManageUsers) return;
                              if (togglingUserId === user.id) return;
                              const nextStatus = user.status === "active" ? "suspended" : "active";
                              const previousStatus = user.status;
                              setTogglingUserId(user.id);
                              setUsers((prev) =>
                                prev.map((item) =>
                                  item.id === user.id ? { ...item, status: nextStatus } : item
                                )
                              );
                              try {
                                await apiClient.admin.rbac.updateUser(user.id, { status: nextStatus });
                                notify({
                                  title: nextStatus === "suspended" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
                                  message: `${user.name} đã được cập nhật trạng thái.`,
                                  variant: "success",
                                });
                              } catch (err: any) {
                                setUsers((prev) =>
                                  prev.map((item) =>
                                    item.id === user.id ? { ...item, status: previousStatus } : item
                                  )
                                );
                                notify({
                                  title: "Không thể cập nhật trạng thái",
                                  message: err.message || "Vui lòng thử lại",
                                  variant: "error",
                                });
                              } finally {
                                setTogglingUserId(null);
                              }
                            }}
                            title={user.status === "active" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            disabled={!canManageUsers || togglingUserId === user.id}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {user.status === "active"
                              ? <ActionIcon action="unlock" className="w-4 h-4 text-green-500" />
                              : <ActionIcon action="lock" className="w-4 h-4 text-yellow-500" />
                            }
                          </button>
                          <button
                            onClick={() => canManageUsers && setUserToDelete(user)}
                            title="Xóa người dùng"
                            disabled={!canManageUsers}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ActionIcon action="delete" className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </SharedTableBody>
            </SharedTable>
          </div>
        </motion.div>
      )}

      {/* Create/Edit User Modal */}
      {creatingUser && canManageUsers && (
        <UserModal
          onClose={() => setCreatingUser(false)}
          onSaved={fetchUsers}
          onNotify={(title, message, variant) => notify({ title, message, variant })}
        />
      )}

      {editingUser && canManageUsers && (
        <UserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={fetchUsers}
          onNotify={(title, message, variant) => notify({ title, message, variant })}
        />
      )}

      <AdminConfirmDialog
        open={Boolean(userToDelete)}
        title="Xóa người dùng"
        description={
          userToDelete
            ? `Bạn có chắc muốn xóa người dùng ${userToDelete.name}? Hành động này sẽ chuyển tài khoản sang trạng thái đã xóa.`
            : ""
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        danger
        loading={deleting}
        onClose={() => {
          if (!deleting) setUserToDelete(null);
        }}
        onConfirm={async () => {
          if (!userToDelete) return;
          setDeleting(true);
          try {
            await apiClient.admin.rbac.deleteUser(userToDelete.id);
            notify({
              title: "Đã xóa người dùng",
              message: `${userToDelete.name} đã được xóa khỏi danh sách.`,
              variant: "success",
            });
            setUserToDelete(null);
            fetchUsers();
          } catch (err: any) {
            notify({
              title: "Không thể xóa người dùng",
              message: err.message || "Vui lòng thử lại",
              variant: "error",
            });
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
