'use client';

import { motion } from 'framer-motion';
import { Users, Award, Activity, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboard() {
  const { user } = useAuth();

  const stats = [
    { icon: Users, label: 'Tổng học viên', value: '1,234', change: '+12%', color: 'bg-blue-500' },
    { icon: Award, label: 'Chứng chỉ đã cấp', value: '856', change: '+23%', color: 'bg-emerald-500' },
    { icon: Activity, label: 'Bài luyện tập', value: '12.5K', change: '+8%', color: 'bg-purple-500' },
    { icon: TrendingUp, label: 'Tỉ lệ hoàn thành', value: '78%', change: '+5%', color: 'bg-orange-500' },
  ];

  const recentCertificates = [
    { id: 'CERT-001', student: 'Nguyễn Văn A', score: 950, date: '2024-03-15', status: 'verified' },
    { id: 'CERT-002', student: 'Trần Thị B', score: 850, date: '2024-03-14', status: 'pending' },
    { id: 'CERT-003', student: 'Lê Văn C', score: 990, date: '2024-03-13', status: 'verified' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Xin chào, {user?.name || 'Admin'}!
        </h1>
        <p className="text-gray-600">Chào mừng bạn quay trở lại. Dưới đây là tổng quan hệ thống.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${stat.color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              <span className="text-sm text-emerald-600 font-medium">{stat.change}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</h3>
            <p className="text-gray-600 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blockchain Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Trạng thái Blockchain</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-700">Block hiện tại</span>
              <span className="font-mono font-bold text-emerald-800">#1,234,567</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-700">Giao dịch chờ</span>
              <span className="font-mono font-bold text-blue-800">23</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-purple-700">Hash rate</span>
              <span className="font-mono font-bold text-purple-800">125.4 MH/s</span>
            </div>
          </div>
        </motion.div>

        {/* Recent Certificates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Chứng chỉ gần đây</h2>
          <div className="space-y-3">
            {recentCertificates.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div>
                  <p className="font-medium text-gray-800">{cert.student}</p>
                  <p className="text-sm text-gray-500">{cert.id} • {cert.date}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold text-emerald-600">{cert.score}</span>
                  {cert.status === 'verified' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}