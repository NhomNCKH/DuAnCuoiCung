// app/student/exam/result/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  CheckCircle, 
  XCircle, 
  Award, 
  Clock, 
  AlertTriangle,
  Home,
  RotateCcw,
  Share2,
  Download
} from "lucide-react";
import Link from "next/link";

export default function ExamResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const score = searchParams.get('score');
  const isBlocked = searchParams.get('blocked') === 'true';
  
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const savedResult = localStorage.getItem(`exam_result_${id}`);
    if (savedResult) {
      setResult(JSON.parse(savedResult));
    }
  }, [id]);

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Bài thi bị hủy</h1>
          <p className="text-gray-600 mb-6">
            Bài thi của bạn đã bị hủy do phát hiện hành vi gian lận.
            Vui lòng liên hệ giám thị để biết thêm chi tiết.
          </p>
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const percentage = score ? parseInt(score) : result?.score || 0;
  const isPassed = percentage >= 60;
  const level = percentage >= 80 ? 'Xuất sắc' : percentage >= 60 ? 'Đạt' : 'Chưa đạt';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm mb-4">
            <Award className="w-5 h-5 text-yellow-500" />
            <span className="font-medium">Kết quả bài thi</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">TOEIC Practice Test</h1>
          <p className="text-gray-500 mt-1">Mã đề: {id}</p>
        </motion.div>

        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-white rounded-2xl shadow-xl p-8 mb-6 text-center ${
            isPassed ? 'border-l-8 border-green-500' : 'border-l-8 border-red-500'
          }`}
        >
          <div className="relative inline-block">
            <div className="text-7xl font-bold text-gray-800">{Math.round(percentage)}</div>
            <div className="text-sm text-gray-500">/100</div>
          </div>
          
          <div className="mt-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-semibold ${
              isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isPassed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {level}
            </div>
          </div>
          
          <p className="text-gray-500 mt-4">
            Bạn đã trả lời đúng {result?.correctCount || 0}/{result?.totalQuestions || 0} câu hỏi
          </p>
        </motion.div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Thời gian làm bài</span>
            </div>
            <p className="text-xl font-bold text-gray-800">45 phút</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Cảnh báo</span>
            </div>
            <p className="text-xl font-bold text-yellow-600">{result?.violations || 0} lần</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
          
          <button
            onClick={() => router.push(`/student/exam/${id}`)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Làm lại
          </button>
          
          <button
            onClick={() => {
              // Share result
              navigator.share?.({
                title: 'Kết quả thi TOEIC',
                text: `Tôi đạt ${Math.round(percentage)} điểm trong bài thi TOEIC Practice Test!`,
              });
            }}
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Chia sẻ
          </button>
        </div>
      </div>
    </div>
  );
}