'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Leaf, ArrowRight, Shield } from 'lucide-react';

export default function AdminWelcomePage() {
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
          <Leaf className="w-12 h-12 text-white" />
        </motion.div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-emerald-900 mb-4">
          Chào mừng Admin
        </h1>
        
        <p className="text-xl text-emerald-700 mb-8">
          Bạn đã đăng nhập vào hệ thống quản trị EduChain
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-emerald-600">1,234</div>
            <div className="text-sm text-emerald-800">Học viên</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-emerald-600">856</div>
            <div className="text-sm text-emerald-800">Chứng chỉ</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-emerald-600">12.5k</div>
            <div className="text-sm text-emerald-800">Bài luyện</div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/admin/dashboard')}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg flex items-center justify-center space-x-2 mx-auto"
          >
            <span>Đi đến Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <div className="flex items-center justify-center space-x-2 text-sm text-emerald-600">
            <Shield className="w-4 h-4" />
            <span>Blockchain Secured Admin Panel</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}