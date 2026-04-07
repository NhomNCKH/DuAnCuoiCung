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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
          className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl"
        >
          <GraduationCap className="w-12 h-12 text-white" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Chào mừng bạn đến với
            <span className="block text-blue-700">
              EduChain
            </span>
          </h1>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xl text-slate-600 mb-8"
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
          <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200">
            <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-900">0</div>
            <div className="text-sm text-slate-600">Bài đã học</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200">
            <Trophy className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-900">0</div>
            <div className="text-sm text-slate-600">Điểm TOEIC</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-900">0</div>
            <div className="text-sm text-slate-600">Giờ học</div>
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
            className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center space-x-2 mx-auto"
          >
            <span>Bắt đầu học ngay</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
            <Shield className="w-4 h-4 text-blue-600" />
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
          <div className="flex items-center space-x-1 bg-white rounded-full px-3 py-1 border border-slate-200">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-slate-600">AI Interview</span>
          </div>
          <div className="flex items-center space-x-1 bg-white rounded-full px-3 py-1 border border-slate-200">
            <Shield className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-slate-600">Blockchain Cert</span>
          </div>
          <div className="flex items-center space-x-1 bg-white rounded-full px-3 py-1 border border-slate-200">
            <Trophy className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-slate-600">Real-time Feedback</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}