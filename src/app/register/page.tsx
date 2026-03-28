// app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Leaf,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Shield,
  CheckCircle,
  XCircle,
  Sparkles,
  GraduationCap,
  Target,
  Clock,
  Gift,
  Rocket,
  BookOpen,
  Award,
  TrendingUp,
  Users,
  Star,
  Quote,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordValidations({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!agreeTerms) {
      setError("Vui lòng đồng ý với Điều khoản và Chính sách");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (!passwordValidations.length || !passwordValidations.uppercase || 
        !passwordValidations.lowercase || !passwordValidations.number) {
      setError("Vui lòng nhập mật khẩu đúng định dạng");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.auth.register({ name, email, password });

      if (response.statusCode === 201) {
        // Auto-login sau khi đăng ký thành công bằng useAuth().login
        const loginRes = await login({ email, password });

        if (loginRes.success) {
          router.push("/student/dashboard");
        } else {
          // Đăng ký OK nhưng auto-login thất bại → chuyển sang trang login
          router.push("/login");
        }
      } else {
        setError(response.message || "Đăng ký thất bại");
      }
    } catch (err: any) {
      if (err.statusCode === 409) {
        setError("Email đã được đăng ký. Vui lòng sử dụng email khác");
      } else {
        setError(err.message || "Có lỗi xảy ra. Vui lòng thử lại");
      }
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Rocket, title: "Lộ trình cá nhân hóa", desc: "AI đề xuất bài học phù hợp với trình độ" },
    { icon: Target, title: "Mục tiêu rõ ràng", desc: "Theo dõi tiến độ và đạt mục tiêu TOEIC" },
    { icon: Clock, title: "Học mọi lúc mọi nơi", desc: "24/7 truy cập, học trên mọi thiết bị" },
    { icon: Award, title: "Chứng chỉ Blockchain", desc: "Được xác thực toàn cầu, không thể làm giả" },
  ];

  const stats = [
    { value: "50,000+", label: "Học viên", icon: Users },
    { value: "98%", label: "Hài lòng", icon: Star },
    { value: "+150", label: "Điểm trung bình", icon: TrendingUp },
    { value: "2,000+", label: "Bài tập", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-6rem)]">
          {/* Left Side - Hero Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <Leaf className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-800 to-teal-600 bg-clip-text text-transparent">
                  EduChain
                </span>
                <div className="text-xs text-emerald-600">TOEIC Preparation</div>
              </div>
            </div>

            {/* Main Title */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-emerald-100 rounded-full px-4 py-2 mb-4">
                <Gift className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  Đăng ký ngay - Nhận ngay 7 ngày học thử MIỄN PHÍ!
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                <span className="text-emerald-900">Bắt đầu hành trình</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  chinh phục TOEIC
                </span>
              </h1>
              <p className="text-lg text-emerald-700 leading-relaxed">
                Tham gia cùng <span className="font-semibold">50,000+ học viên</span> đã cải thiện điểm số
                và đạt được mục tiêu TOEIC của mình.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-emerald-700">{stat.value}</div>
                      <div className="text-xs text-gray-500">{stat.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {benefits.map((benefit, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-emerald-100"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center mb-3">
                    <benefit.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">{benefit.title}</h4>
                  <p className="text-xs text-gray-500">{benefit.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200"
            >
              <Quote className="w-6 h-6 text-emerald-500 mb-3" />
              <p className="text-sm text-gray-700 italic mb-3">
                "Học ở EduChain chỉ 2 tháng, mình đã tăng từ 450 lên 785 điểm TOEIC. 
                Lộ trình học rất khoa học, AI chấm bài chính xác. Đáng đầu tư nhất!"
              </p>
              <div className="flex items-center gap-3">
                <img
                  src="https://ui-avatars.com/api/?name=Thanh+Tung&background=10b981&color=fff"
                  alt="Student"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Nguyễn Thanh Tùng</p>
                  <p className="text-xs text-emerald-600">TOEIC 785 • Học viên tháng 9/2024</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Side - Register Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-emerald-100">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-emerald-800 to-teal-600 bg-clip-text text-transparent">
                    EduChain
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 bg-emerald-100 rounded-full px-3 py-1 mb-2">
                  <Gift className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">7 ngày học thử miễn phí</span>
                </div>
                <p className="text-emerald-600 text-sm">Tạo tài khoản để trải nghiệm AI</p>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-emerald-800">Tạo tài khoản mới</h2>
                <p className="text-emerald-600 text-sm">Đăng ký để trải nghiệm AI và lộ trình học cá nhân hóa</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Họ và tên"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-emerald-800 placeholder-emerald-400 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-emerald-800 placeholder-emerald-400 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-emerald-800 placeholder-emerald-400 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Password validation */}
                {password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1 text-xs bg-emerald-50 p-3 rounded-lg"
                  >
                    <p className="text-emerald-700 font-medium mb-2">Mật khẩu cần có:</p>
                    <div className={`flex items-center gap-1 ${passwordValidations.length ? 'text-emerald-600' : 'text-red-500'}`}>
                      {passwordValidations.length ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>Ít nhất 8 ký tự</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordValidations.uppercase ? 'text-emerald-600' : 'text-red-500'}`}>
                      {passwordValidations.uppercase ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>Chữ hoa (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordValidations.lowercase ? 'text-emerald-600' : 'text-red-500'}`}>
                      {passwordValidations.lowercase ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>Chữ thường (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordValidations.number ? 'text-emerald-600' : 'text-red-500'}`}>
                      {passwordValidations.number ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>Số (0-9)</span>
                    </div>
                  </motion.div>
                )}

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="password"
                    placeholder="Xác nhận mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-emerald-800 placeholder-emerald-400 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Ảnh đại diện (không bắt buộc)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="w-full py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-white hover:file:bg-emerald-600"
                    disabled={loading}
                  />
                  {avatarPreview && (
                    <div className="flex justify-center mt-3">
                      <img
                        src={avatarPreview}
                        alt="preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400 shadow-md"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="terms" className="text-sm text-emerald-600">
                    Tôi đồng ý với{" "}
                    <button type="button" className="text-emerald-700 hover:underline font-medium">
                      Điều khoản sử dụng
                    </button>{" "}
                    và{" "}
                    <button type="button" className="text-emerald-700 hover:underline font-medium">
                      Chính sách bảo mật
                    </button>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Đăng ký ngay - Nhận 7 ngày học thử</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-emerald-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-emerald-500">Hoặc đăng ký với</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="py-3 px-4 bg-white rounded-xl text-[#4285F4] font-medium hover:bg-blue-50 transition-colors border border-gray-200 flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button className="py-3 px-4 bg-[#1877F2] rounded-xl text-white font-medium hover:bg-[#166FE5] transition-colors flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              <p className="text-center text-sm text-emerald-600 mt-6">
                Đã có tài khoản?{" "}
                <Link href="/login" className="text-emerald-700 font-semibold hover:underline">
                  Đăng nhập ngay
                </Link>
              </p>

              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-emerald-100">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-emerald-500">Bảo mật với công nghệ Blockchain</span>
              </div>
            </div>

            {/* Mobile Benefits */}
            <div className="lg:hidden mt-6 grid grid-cols-2 gap-3">
              {benefits.slice(0, 4).map((benefit, idx) => (
                <div key={idx} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-emerald-100">
                  <benefit.icon className="w-5 h-5 text-emerald-600 mb-2" />
                  <p className="text-xs font-medium text-gray-800">{benefit.title}</p>
                  <p className="text-[10px] text-gray-500">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}