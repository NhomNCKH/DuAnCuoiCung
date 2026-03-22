'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  ArrowRight, 
  Shield, 
  BookOpen, 
  Trophy, 
  Clock,
  Sparkles
} from 'lucide-react';

export default function StudentWelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl px-4"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl"
        >
          <GraduationCap className="w-12 h-12 text-white" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-900 mb-4">
            Chào mừng bạn đến với
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
              EduChain
            </span>
          </h1>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xl text-emerald-700 mb-8"
        >
          Hành trình chinh phục TOEIC của bạn bắt đầu từ đây!
        </motion.p>

        {/* Stats Cards - Thành tích cá nhân */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-3 gap-4 mb-12"
        >
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <BookOpen className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-emerald-600">0</div>
            <div className="text-sm text-emerald-800">Bài đã học</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <Trophy className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-emerald-600">0</div>
            <div className="text-sm text-emerald-800">Điểm TOEIC</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <Clock className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-emerald-600">0</div>
            <div className="text-sm text-emerald-800">Giờ học</div>
          </div>
        </motion.div>

        {/* Nút bắt đầu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="space-y-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/student/dashboard')}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg flex items-center justify-center space-x-2 mx-auto"
          >
            <span>Bắt đầu học ngay</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <div className="flex items-center justify-center space-x-2 text-sm text-emerald-600">
            <Shield className="w-4 h-4" />
            <span>Chứng chỉ được bảo mật bởi Blockchain</span>
          </div>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-wrap justify-center gap-3 mt-8"
        >
          <div className="flex items-center space-x-1 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span className="text-xs text-emerald-700">AI Interview</span>
          </div>
          <div className="flex items-center space-x-1 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span className="text-xs text-emerald-700">Blockchain Cert</span>
          </div>
          <div className="flex items-center space-x-1 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1">
            <Trophy className="w-3 h-3 text-emerald-600" />
            <span className="text-xs text-emerald-700">Real-time Feedback</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}