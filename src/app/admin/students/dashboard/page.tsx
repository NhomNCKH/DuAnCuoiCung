'use client';

import { BookOpen, Trophy, Clock, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Xin chào, {user?.name || 'Học viên'}!
        </h1>
        <p className="text-gray-600">Chào mừng bạn trở lại! Hãy tiếp tục hành trình học tập của bạn.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
          <BookOpen className="w-8 h-8 text-emerald-600 mb-3" />
          <h3 className="text-2xl font-bold text-gray-800">12</h3>
          <p className="text-gray-600 text-sm">Bài đã học</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
          <Clock className="w-8 h-8 text-emerald-600 mb-3" />
          <h3 className="text-2xl font-bold text-gray-800">24.5h</h3>
          <p className="text-gray-600 text-sm">Thời gian học</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
          <Trophy className="w-8 h-8 text-emerald-600 mb-3" />
          <h3 className="text-2xl font-bold text-gray-800">650</h3>
          <p className="text-gray-600 text-sm">Điểm TOEIC</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
          <TrendingUp className="w-8 h-8 text-emerald-600 mb-3" />
          <h3 className="text-2xl font-bold text-gray-800">+25%</h3>
          <p className="text-gray-600 text-sm">Tiến bộ</p>
        </div>
      </div>

      {/* Bài học tiếp theo */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Bài học tiếp theo</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">TOEIC Listening - Part 1</p>
              <p className="text-sm text-gray-500">Photographs</p>
            </div>
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
              Học ngay
            </button>
          </div>
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">TOEIC Reading - Part 5</p>
              <p className="text-sm text-gray-500">Incomplete Sentences</p>
            </div>
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
              Học ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}