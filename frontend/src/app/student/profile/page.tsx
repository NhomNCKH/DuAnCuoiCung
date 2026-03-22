"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  CheckCircle,
  AlertCircle,
  Award,
  BookOpen,
  Clock,
  TrendingUp,
  Shield,
} from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { uploadAvatar, uploading: isUploading, progress, error: uploadError } = useAvatarUpload();

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
  });
  const [stats, setStats] = useState({
    totalLessons: 12,
    totalHours: 24.5,
    toeicScore: 650,
    completedRate: 75,
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  // Load user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        birthday: user.birthday || "",
        address: user.address || "",
      });
      setAvatarUrl(user.avatarUrl || "");
      setAvatarPreview(user.avatarUrl || "");
    }
  }, [user]);

  // Upload avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file ảnh' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước ảnh tối đa 5MB' });
      return;
    }

    setMessage({ type: "", text: "" });

    const newAvatarUrl = await uploadAvatar(file, user?.id);
    
    if (newAvatarUrl) {
      setAvatarUrl(newAvatarUrl);
      setAvatarPreview(newAvatarUrl);
      
      // Cập nhật user trong localStorage
      const updatedUser = { ...user, avatarUrl: newAvatarUrl };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
    } else {
      setMessage({ type: 'error', text: uploadError || 'Upload thất bại' });
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      // TODO: Call API update profile when available
      // const response = await api.auth.updateProfile(formData);
      // if (response.statusCode === 200) {
      //   setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
      //   setIsEditing(false);
      //   // Update user in localStorage
      //   const updatedUser = { ...user, ...formData };
      //   localStorage.setItem('user', JSON.stringify(updatedUser));
      // }

      // Tạm thời simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
      setIsEditing(false);
    } catch (error) {
      setMessage({ type: "error", text: "Có lỗi xảy ra khi cập nhật" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hồ sơ cá nhân</h1>
          <p className="text-gray-600">
            Quản lý thông tin và tài khoản của bạn
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>Chỉnh sửa</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  name: user?.name || "",
                  email: user?.email || "",
                  phone: user?.phone || "",
                  birthday: user?.birthday || "",
                  address: user?.address || "",
                });
                setMessage({ type: "", text: "" });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Hủy</span>
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
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
      </div>

      {/* Message */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{message.text}</span>
        </motion.div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Avatar */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-emerald-100 border-4 border-emerald-200">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/128?text=No+Image";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-emerald-400 to-teal-400">
                      <User className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-emerald-600 rounded-full p-2 cursor-pointer hover:bg-emerald-700 transition-colors shadow-lg"
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

              {/* Progress Bar */}
              {isUploading && (
                <div className="mt-3 w-full max-w-[200px]">
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Đang upload... {progress}%
                  </p>
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-800 mt-4">
                {user?.name || "Học viên"}
              </h2>
              <p className="text-sm text-emerald-600">Học viên</p>

              <div className="w-full mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">Trạng thái</span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Shield className="w-3 h-3" />
                    Đã xác thực
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Tham gia</span>
                  <span className="text-gray-700">2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Thông tin cá nhân
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Họ và tên
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                ) : (
                  <p className="text-gray-800">
                    {formData.name || "Chưa cập nhật"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <p className="text-gray-800">{formData.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Số điện thoại
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Chưa cập nhật"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                ) : (
                  <p className="text-gray-800">
                    {formData.phone || "Chưa cập nhật"}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Ngày sinh
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.birthday}
                      onChange={(e) =>
                        setFormData({ ...formData, birthday: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  ) : (
                    <p className="text-gray-800">
                      {formData.birthday || "Chưa cập nhật"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Địa chỉ
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Chưa cập nhật"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  ) : (
                    <p className="text-gray-800">
                      {formData.address || "Chưa cập nhật"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Learning Stats */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Thống kê học tập
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-700">
                  {stats.totalLessons}
                </div>
                <div className="text-xs text-gray-600">Bài đã học</div>
              </div>

              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <Clock className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-700">
                  {stats.totalHours}h
                </div>
                <div className="text-xs text-gray-600">Giờ học</div>
              </div>

              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <Award className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-700">
                  {stats.toeicScore}
                </div>
                <div className="text-xs text-gray-600">Điểm TOEIC</div>
              </div>

              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-700">
                  {stats.completedRate}%
                </div>
                <div className="text-xs text-gray-600">Hoàn thành</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Tiến độ học tập</span>
                <span>{stats.completedRate}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completedRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}