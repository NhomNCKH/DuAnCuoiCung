// app/auth/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import lottie from "lottie-web";
import animationData from "@/app/animations/12345.json"
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Shield,
  Sparkles,
  GraduationCap,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Quote,
  Eye,
  EyeOff,
  Github,
  Twitter,
  Instagram,
  Globe,
  Zap,
  Star,
  Heart,
  Compass,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const redirect = searchParams.get("redirect") || "/student/dashboard";

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  const lottieContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lottieContainer.current) {
      const animation = lottie.loadAnimation({
        container: lottieContainer.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: animationData,
      });

      return () => animation.destroy();
    }
  }, []);

  const handlePasswordChange = (value: string) => {
    setRegPassword(value);
    setPasswordValidations({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login({ email: loginEmail, password: loginPassword });
      if (res.success) {
        const storedUser = localStorage.getItem("user");
        const user = storedUser ? JSON.parse(storedUser) : null;
        const isAdminRole = ["admin", "superadmin", "org_admin"].includes(
          user?.role || "",
        );
        router.push(isAdminRole ? "/admin/dashboard" : redirect);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!agreeTerms) {
      setError("Vui lòng đồng ý với Điều khoản và Chính sách");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (
      !passwordValidations.length ||
      !passwordValidations.uppercase ||
      !passwordValidations.lowercase ||
      !passwordValidations.number
    ) {
      setError("Vui lòng nhập mật khẩu đúng định dạng");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.auth.register({
        name: regName,
        email: regEmail,
        password: regPassword,
      });

      if (response.statusCode === 201) {
        const loginRes = await login({
          email: regEmail,
          password: regPassword,
        });
        if (loginRes.success) {
          router.push("/student/dashboard");
        } else {
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

  const [currentTestimonial, setCurrentTestimonial] = useState(0);



  const stats = [
    {
      value: "50,000+",
      label: "Học viên",
      icon: User,
      color: "from-blue-500 to-cyan-500",
    },
    {
      value: "98%",
      label: "Hài lòng",
      icon: Star,
      color: "from-amber-500 to-yellow-500",
    },
    {
      value: "+150",
      label: "Điểm TB",
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
    },
    {
      value: "2,000+",
      label: "Bài tập",
      icon: BookOpen,
      color: "from-purple-500 to-pink-500",
    },
  ];

  const features = [
    {
      icon: Target,
      title: "Lộ trình cá nhân hóa",
      desc: "AI đề xuất bài học phù hợp với trình độ",
    },
    {
      icon: Clock,
      title: "Học mọi lúc mọi nơi",
      desc: "24/7 truy cập, học trên mọi thiết bị",
    },
    {
      icon: Shield,
      title: "Chứng chỉ Blockchain",
      desc: "Được xác thực toàn cầu, không thể làm giả",
    },
    {
      icon: Zap,
      title: "AI chấm điểm",
      desc: "Phản hồi tức thì, cải thiện nhanh chóng",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000" />
      </div>

      {/* Floating Particles */}


      <div className="relative z-10 container mx-auto px-4 min-h-screen flex items-center justify-center py-12">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4 border border-white/20">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white/80">
                TOEIC Preparation Platform
              </span>
            </div>
            <p className="text-white/60 mt-2">
              Nền tảng luyện thi TOEIC thông minh với AI
            </p>
          </motion.div>

          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Left Panel - Branding & Info */}
                <div className="lg:w-1/2 p-8 lg:p-12 bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20">
                <AnimatePresence mode="wait">
                    <motion.div
                    key={isLogin ? "login-info" : "register-info"}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-8"
                    >
                    {/* Lottie Animation */}
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <div ref={lottieContainer} className="w-full h-64" />
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {stats.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10"
                        >
                            <div
                            className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mb-2`}
                            >
                            <stat.icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-xl font-bold text-white">
                            {stat.value}
                            </div>
                            <div className="text-xs text-white/60">
                            {stat.label}
                            </div>
                        </motion.div>
                        ))}
                    </div>
                    
                    {/* Features */}
                    <div className="grid grid-cols-2 gap-3">
                        {features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                            <feature.icon className="w-4 h-4 text-blue-400 mt-0.5" />
                            <div>
                            <p className="text-white text-xs font-medium">
                                {feature.title}
                            </p>
                            <p className="text-white/40 text-[10px]">
                                {feature.desc}
                            </p>
                            </div>
                        </div>
                        ))}
                    </div>
                    </motion.div>
                </AnimatePresence>
                </div>

              {/* Right Panel - Forms */}
              <div className="lg:w-1/2 p-8 lg:p-12">
                {/* Toggle Buttons */}
                <div className="flex gap-2 bg-white/10 rounded-xl p-1 mb-8">
                  <button
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isLogin
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Đăng nhập
                  </button>
                  <button
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      !isLogin
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Đăng ký
                  </button>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <p className="text-sm text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Forms */}
                <AnimatePresence mode="wait">
                  {isLogin ? (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleLogin}
                      className="space-y-4"
                    >
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="email"
                          placeholder="Email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mật khẩu"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5 text-white/40 hover:text-white/60" />
                          ) : (
                            <Eye className="w-5 h-5 text-white/40 hover:text-white/60" />
                          )}
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-white/20 bg-white/10 checked:bg-blue-500"
                          />
                          <span className="text-sm text-white/60">
                            Ghi nhớ đăng nhập
                          </span>
                        </label>
                        <button
                          type="button"
                          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Quên mật khẩu?
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 group disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Đăng nhập</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="register"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleRegister}
                      className="space-y-4"
                    >
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="text"
                          placeholder="Họ và tên"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="email"
                          placeholder="Email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mật khẩu"
                          value={regPassword}
                          onChange={(e) => handlePasswordChange(e.target.value)}
                          className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                          required
                          disabled={loading}
                        />
                      </div>

                      {regPassword && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-1 text-xs bg-white/10 rounded-xl p-3"
                        >
                          <p className="text-white/60 font-medium mb-2">
                            Mật khẩu cần có:
                          </p>
                          <div
                            className={`flex items-center gap-1 ${passwordValidations.length ? "text-green-400" : "text-red-400"}`}
                          >
                            {passwordValidations.length ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            <span>Ít nhất 8 ký tự</span>
                          </div>
                          <div
                            className={`flex items-center gap-1 ${passwordValidations.uppercase ? "text-green-400" : "text-red-400"}`}
                          >
                            {passwordValidations.uppercase ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            <span>Chữ hoa (A-Z)</span>
                          </div>
                          <div
                            className={`flex items-center gap-1 ${passwordValidations.lowercase ? "text-green-400" : "text-red-400"}`}
                          >
                            {passwordValidations.lowercase ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            <span>Chữ thường (a-z)</span>
                          </div>
                          <div
                            className={`flex items-center gap-1 ${passwordValidations.number ? "text-green-400" : "text-red-400"}`}
                          >
                            {passwordValidations.number ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            <span>Số (0-9)</span>
                          </div>
                        </motion.div>
                      )}

                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Xác nhận mật khẩu"
                          value={regConfirmPassword}
                          onChange={(e) =>
                            setRegConfirmPassword(e.target.value)
                          }
                          className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                          required
                          disabled={loading}
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 checked:bg-blue-500"
                        />
                        <span className="text-sm text-white/60">
                          Tôi đồng ý với{" "}
                          <button
                            type="button"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Điều khoản
                          </button>{" "}
                          và{" "}
                          <button
                            type="button"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Chính sách bảo mật
                          </button>
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 group disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Đăng ký - Nhận 7 ngày học thử</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Social Login */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-white/40">
                      Hoặc tiếp tục với
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button className="py-2.5 bg-white/10 rounded-xl text-white/80 font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-sm">Google</span>
                  </button>
                  <button className="py-2.5 bg-[#1877F2]/20 rounded-xl text-white/80 font-medium hover:bg-[#1877F2]/30 transition-all flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span className="text-sm">Facebook</span>
                  </button>
                  <button className="py-2.5 bg-white/10 rounded-xl text-white/80 font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                    <Github className="w-4 h-4" />
                    <span className="text-sm">GitHub</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8 text-white/40 text-sm"
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-3 h-3" />
              <span>Bảo mật với công nghệ Blockchain</span>
              <span className="mx-2">•</span>
              <span>© 2024 EduChain. All rights reserved.</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
