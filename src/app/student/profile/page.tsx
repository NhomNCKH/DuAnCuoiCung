
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Edit2,
  Save,
  X,
  Camera,
  Loader2,
  Award,
  BookOpen,
  Clock,
  TrendingUp,
  Shield,
  Globe,
  Linkedin,
  Github,
  Twitter,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { getSignedMediaUrl } from "@/lib/media-url";
import { persistStoredUser } from "@/lib/auth-session";
import { useToast } from "@/hooks/useToast";

export default function StudentProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { uploadAvatar, uploading: isUploading, progress, error: uploadError } = useAvatarUpload();
  const { notify } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    birthday: "",
    address: "",
    bio: "",
    linkedin: "",
    github: "",
    twitter: "",
  });
  const [stats, setStats] = useState({
    totalLessons: 48,
    totalHours: 24.5,
    toeicScore: 650,
    completedRate: 65,
    streak: 7,
    rank: 1250,
  });

  const birthdayPickerRef = useRef<HTMLDivElement | null>(null);
  const [birthdayOpen, setBirthdayOpen] = useState(false);

  const birthdayMonth = useMemo(() => {
    const iso = String(formData.birthday || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m] = iso.split("-").map((v) => Number(v));
      const d = new Date(y, (m ?? 1) - 1, 1);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [formData.birthday]);

  const [birthdayVisibleMonth, setBirthdayVisibleMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    setBirthdayVisibleMonth(birthdayMonth);
  }, [birthdayMonth]);

  useEffect(() => {
    if (!birthdayOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (birthdayPickerRef.current?.contains(target)) return;
      setBirthdayOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [birthdayOpen]);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const formatIso = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const formatDisplay = (iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
    const [y, m, d] = iso.split("-").map((v) => Number(v));
    if (!y || !m || !d) return "";
    return `${pad2(d)}/${pad2(m)}/${y}`;
  };

  const monthNames = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  const yearOptions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const from = currentYear - 80;
    const to = currentYear + 2;
    const years: number[] = [];
    for (let y = to; y >= from; y--) years.push(y);
    return years;
  }, []);

  // Load user data
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const avatarRes = await apiClient.auth.getAvatar();
        const avatarData = avatarRes.data;
        const signedAvatarUrl =
          avatarData?.s3Key && String(avatarData.s3Key).trim() !== ""
            ? await getSignedMediaUrl(avatarData.s3Key)
            : avatarData?.avatarUrl ?? "";

        setAvatarUrl(signedAvatarUrl ?? "");
        setAvatarPreview(signedAvatarUrl ?? "");
      } catch {
        setAvatarUrl("");
        setAvatarPreview("");
      }
    };

    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        birthday: user.birthday || "",
        address: user.address || "",
        bio: user.bio || "",
        linkedin: user.linkedin || "",
        github: user.github || "",
        twitter: user.twitter || "",
      });
      loadAvatar();
    }
  }, [user]);

  // Upload avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify({ variant: "error", title: "File không hợp lệ", message: "Vui lòng chọn file ảnh." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify({ variant: "warning", title: "Ảnh quá lớn", message: "Kích thước ảnh tối đa 5MB." });
      return;
    }

    const uploadedAvatar = await uploadAvatar(file);

    if (uploadedAvatar?.avatarUrl) {
      setAvatarUrl(uploadedAvatar.avatarUrl);
      setAvatarPreview(uploadedAvatar.avatarUrl);

      const updatedUser = {
        ...user,
        avatarUrl: uploadedAvatar.avatarUrl,
        avatarS3Key: uploadedAvatar.s3Key,
      };
      if (updatedUser) {
        persistStoredUser(updatedUser as any);
        window.dispatchEvent(new Event("auth:user-updated"));
      }

      notify({ variant: "success", title: "Cập nhật thành công", message: "Ảnh đại diện đã được cập nhật." });
    } else {
      notify({ variant: "error", title: "Upload thất bại", message: uploadError || "Vui lòng thử lại." });
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    setIsSaving(true);

    try {
      const res = await apiClient.auth.updateMe({
        name: formData.name,
        phone: formData.phone,
        birthday: formData.birthday,
        address: formData.address,
        bio: formData.bio,
        linkedin: formData.linkedin,
        github: formData.github,
        twitter: formData.twitter,
      });

      const updated = (res as any)?.data?.data ?? (res as any)?.data ?? null;
      if (updated && user) {
        const merged = { ...user, ...updated };
        persistStoredUser(merged as any);
        window.dispatchEvent(new Event("auth:user-updated"));
      }
      notify({ variant: "success", title: "Cập nhật thành công", message: "Thông tin cá nhân đã được lưu." });
      setIsEditing(false);
    } catch (error) {
      notify({ variant: "error", title: "Cập nhật thất bại", message: "Có lỗi xảy ra khi cập nhật. Vui lòng thử lại." });
    } finally {
      setIsSaving(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 lg:text-3xl">
            Hồ sơ cá nhân
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Quản lý thông tin và tài khoản của bạn
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            <Edit2 className="w-4 h-4" />
            <span>Chỉnh sửa</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                if (user) {
                  setFormData({
                    name: user.name || "",
                    email: user.email || "",
                    phone: user.phone || "",
                    birthday: user.birthday || "",
                    address: user.address || "",
                    bio: user.bio || "",
                    linkedin: user.linkedin || "",
                    github: user.github || "",
                    twitter: user.twitter || "",
                  });
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
            >
              <X className="w-4 h-4" />
              <span>Hủy</span>
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu</span>
            </button>
          </div>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Avatar & Social */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Avatar Card */}
          <motion.div
            variants={item}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600/40 dark:bg-transparent"
          >
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-amber-400 to-yellow-400">
                      <User className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-amber-500 p-2 shadow-lg transition hover:bg-amber-600"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </div>

              {isUploading && (
                <div className="mt-3 w-full max-w-[200px]">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-300">
                    Đang upload... {progress}%
                  </p>
                </div>
              )}

              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                {formData.name || "Học viên"}
              </h2>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-300">
                Học viên
              </p>

              <div className="mt-6 w-full border-t border-slate-200 pt-6 dark:border-slate-600/40">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500 dark:text-slate-300">Trạng thái</span>
                  <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-300">
                    <Shield className="w-3 h-3" />
                    Đã xác thực
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-300">Tham gia</span>
                  <span className="text-slate-700 dark:text-slate-200">2024</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Social Links */}
          <motion.div
            variants={item}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600/40 dark:bg-transparent"
          >
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Liên kết mạng xã hội
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10">
                <Linkedin className="w-5 h-5 text-blue-600" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="LinkedIn URL"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                  />
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formData.linkedin || "Chưa cập nhật"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10">
                <Github className="w-5 h-5 text-slate-900 dark:text-slate-100" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="GitHub URL"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                  />
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formData.github || "Chưa cập nhật"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10">
                <Twitter className="w-5 h-5 text-blue-400" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="Twitter URL"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                  />
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formData.twitter || "Chưa cập nhật"}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column - Info & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600/40 dark:bg-transparent"
          >
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <User className="h-5 w-5 text-amber-500" />
              Thông tin cá nhân
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Họ và tên
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-slate-100">
                    {formData.name || "Chưa cập nhật"}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <p className="text-slate-900 dark:text-slate-100">{formData.email}</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Số điện thoại
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Chưa cập nhật"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-slate-100">
                    {formData.phone || "Chưa cập nhật"}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Ngày sinh
                </label>
                {isEditing ? (
                  <div ref={birthdayPickerRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setBirthdayOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/5 dark:focus:ring-amber-500/20"
                      aria-haspopup="dialog"
                      aria-expanded={birthdayOpen}
                    >
                      <span className={formData.birthday ? "" : "text-slate-400 dark:text-slate-400"}>
                        {formData.birthday ? formatDisplay(formData.birthday) : "dd/mm/yyyy"}
                      </span>
                      <Calendar className="h-4 w-4 text-slate-400" />
                    </button>

                    {birthdayOpen ? (
                      <div
                        role="dialog"
                        className="absolute z-50 mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-600/40 dark:bg-slate-950"
                      >
                        <div className="flex items-center justify-between gap-2 px-1 py-1">
                          <button
                            type="button"
                            onClick={() =>
                              setBirthdayVisibleMonth(
                                (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                              )
                            }
                            className="h-9 w-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                            aria-label="Tháng trước"
                          >
                            ←
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-center gap-2">
                              <select
                                value={birthdayVisibleMonth.getMonth()}
                                onChange={(e) => {
                                  const nextMonth = Number(e.target.value);
                                  setBirthdayVisibleMonth((d) => new Date(d.getFullYear(), nextMonth, 1));
                                }}
                                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition hover:bg-slate-50 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/5 dark:focus:ring-amber-500/20"
                                aria-label="Chọn tháng"
                              >
                                {monthNames.map((label, idx) => (
                                  <option key={label} value={idx}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={birthdayVisibleMonth.getFullYear()}
                                onChange={(e) => {
                                  const nextYear = Number(e.target.value);
                                  setBirthdayVisibleMonth((d) => new Date(nextYear, d.getMonth(), 1));
                                }}
                                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition hover:bg-slate-50 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/5 dark:focus:ring-amber-500/20"
                                aria-label="Chọn năm"
                              >
                                {yearOptions.map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setBirthdayVisibleMonth(
                                (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                              )
                            }
                            className="h-9 w-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                            aria-label="Tháng sau"
                          >
                            →
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-7 gap-2 px-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-300">
                          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                            <div key={d} className="py-1">
                              {d}
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 grid grid-cols-7 gap-2 px-1">
                          {(() => {
                            const y = birthdayVisibleMonth.getFullYear();
                            const m = birthdayVisibleMonth.getMonth();
                            const first = new Date(y, m, 1);
                            const daysInMonth = new Date(y, m + 1, 0).getDate();
                            const firstDow = first.getDay(); // 0 Sun
                            const offset = (firstDow + 6) % 7; // monday=0

                            const cells: Array<{ day: number; inMonth: boolean }> = [];
                            for (let i = 0; i < offset; i++) cells.push({ day: 0, inMonth: false });
                            for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
                            while (cells.length < 42) cells.push({ day: 0, inMonth: false });

                            const todayIso = formatIso(new Date());
                            const selectedIso = String(formData.birthday || "");

                            return cells.map((c, idx) => {
                              if (!c.inMonth) {
                                return <div key={idx} className="h-10" />;
                              }

                              const iso = `${y}-${pad2(m + 1)}-${pad2(c.day)}`;
                              const isToday = iso === todayIso;
                              const isSelected = iso === selectedIso;

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, birthday: iso });
                                    setBirthdayOpen(false);
                                  }}
                                  className={`h-10 rounded-xl text-sm font-semibold transition ${
                                    isSelected
                                      ? "bg-amber-500 text-white"
                                      : "text-slate-700 hover:bg-amber-50 hover:text-amber-900 dark:text-slate-200 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
                                  } ${
                                    isToday && !isSelected
                                      ? "ring-2 ring-amber-300 dark:ring-amber-500/30"
                                      : ""
                                  }`}
                                >
                                  {c.day}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        <div className="mt-2 flex items-center justify-between px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, birthday: "" });
                              setBirthdayOpen(false);
                            }}
                            className="rounded-xl px-2 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                          >
                            Xóa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const iso = formatIso(new Date());
                              setFormData({ ...formData, birthday: iso });
                              setBirthdayVisibleMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                              setBirthdayOpen(false);
                            }}
                            className="rounded-xl px-2 py-1 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-500/10"
                          >
                            Hôm nay
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-slate-900 dark:text-slate-100">
                    {formData.birthday || "Chưa cập nhật"}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Địa chỉ
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Chưa cập nhật"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-slate-100">
                    {formData.address || "Chưa cập nhật"}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Giới thiệu
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Giới thiệu ngắn về bản thân..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-100 dark:focus:border-amber-400/40 dark:focus:ring-amber-500/20"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                    {formData.bio || "Chưa cập nhật"}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Learning Stats */}
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600/40 dark:bg-transparent"
          >
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Thống kê học tập
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-600/40 dark:bg-white/5">
                <BookOpen className="mx-auto mb-2 h-6 w-6 text-amber-600 dark:text-amber-300" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalLessons}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">Bài học</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-600/40 dark:bg-white/5">
                <Clock className="mx-auto mb-2 h-6 w-6 text-amber-600 dark:text-amber-300" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalHours}h
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">Giờ học</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-600/40 dark:bg-white/5">
                <Award className="mx-auto mb-2 h-6 w-6 text-amber-600 dark:text-amber-300" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.toeicScore}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">Điểm TOEIC</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-600/40 dark:bg-white/5">
                <TrendingUp className="mx-auto mb-2 h-6 w-6 text-amber-600 dark:text-amber-300" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.completedRate}%
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">Hoàn thành</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-600/40 dark:bg-white/5">
                <Globe className="mx-auto mb-2 h-6 w-6 text-amber-600 dark:text-amber-300" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  #{stats.rank}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">Xếp hạng</div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Tiến độ học tập</span>
                <span>{stats.completedRate}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${stats.completedRate}%` }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
