// app/admin/certificates/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  Download,
  Share2,
  ExternalLink,
  QrCode,
  Users,
  TrendingUp,
  Calendar,
  Send,
  Eye,
} from "lucide-react";
import { EnhancedStatCard } from "@/components/ui/EnhancedStatCard";
import { InfoCard } from "@/components/ui/InfoCard";

interface CertificateRequest {
  id: string;
  studentName: string;
  studentEmail: string;
  examName: string;
  score: number;
  examDate: string;
  status: "pending" | "approved" | "rejected";
  requestDate: string;
  blockchainId?: string;
}

export default function AdminCertificatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [requests] = useState<CertificateRequest[]>([
    {
      id: "CERT-001",
      studentName: "Nguyễn Văn A",
      studentEmail: "nguyenvana@email.com",
      examName: "TOEIC Full Test 1",
      score: 950,
      examDate: "2024-03-15",
      status: "pending",
      requestDate: "2024-03-16",
    },
    {
      id: "CERT-002",
      studentName: "Trần Thị B",
      studentEmail: "tranthib@email.com",
      examName: "TOEIC Full Test 2",
      score: 890,
      examDate: "2024-03-14",
      status: "approved",
      requestDate: "2024-03-15",
      blockchainId: "0x7a3f...9e2d",
    },
    {
      id: "CERT-003",
      studentName: "Lê Văn C",
      studentEmail: "levanc@email.com",
      examName: "TOEIC Full Test 1",
      score: 785,
      examDate: "2024-03-13",
      status: "approved",
      requestDate: "2024-03-14",
      blockchainId: "0x3b2f...8c1a",
    },
    {
      id: "CERT-004",
      studentName: "Phạm Thị D",
      studentEmail: "phamthid@email.com",
      examName: "TOEIC Full Test 1",
      score: 650,
      examDate: "2024-03-12",
      status: "rejected",
      requestDate: "2024-03-13",
    },
  ]);

  const stats = [
    {
      icon: Award,
      label: "Chứng chỉ đã cấp",
      value: "856",
      change: "+23%",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: Clock,
      label: "Đang chờ duyệt",
      value: "12",
      change: "-5%",
      color: "from-yellow-500 to-orange-500",
    },
    {
      icon: Users,
      label: "Học viên đủ điều kiện",
      value: "234",
      change: "+18%",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: TrendingUp,
      label: "Tỉ lệ cấp thành công",
      value: "96%",
      change: "+2%",
      color: "from-purple-500 to-pink-500",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-3 h-3" />;
      case "pending":
        return <Clock className="w-3 h-3" />;
      case "rejected":
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cấp chứng chỉ</h1>
          <p className="text-gray-600">Quản lý và cấp chứng chỉ Blockchain cho học viên</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all">
          <Send className="w-4 h-4" />
          <span>Cấp hàng loạt</span>
        </button>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <EnhancedStatCard
          icon={Award}
          label="Chứng chỉ đã cấp"
          value="856"
          change="+23%"
          color="from-emerald-500 to-teal-500"
          bgColor="bg-white"
          index={0}
        />
        <EnhancedStatCard
          icon={Clock}
          label="Đang chờ duyệt"
          value="12"
          change="-5%"
          color="from-yellow-500 to-orange-500"
          bgColor="bg-white"
          index={1}
        />
        <EnhancedStatCard
          icon={Users}
          label="Học viên đủ điều kiện"
          value="234"
          change="+18%"
          color="from-blue-500 to-cyan-500"
          bgColor="bg-white"
          index={2}
        />
        <EnhancedStatCard
          icon={TrendingUp}
          label="Tỉ lệ cấp thành công"
          value="96%"
          change="+2%"
          color="from-purple-500 to-pink-500"
          bgColor="bg-white"
          index={3}
        />
      </motion.div>

      {/* Blockchain Info Banner */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10" />
            <div>
              <h3 className="text-lg font-bold mb-1">Blockchain Certificate System</h3>
              <p className="text-emerald-100 text-sm">
                Tất cả chứng chỉ được lưu trữ trên Blockchain, đảm bảo tính xác thực và không thể làm giả
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
            <QrCode className="w-5 h-5" />
            <span className="text-sm font-mono">Active Network</span>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên học viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã cấp</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
      </div>

      {/* Certificate Requests Table */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Học viên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đề thi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Điểm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày thi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Blockchain ID
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((request, idx) => (
                <motion.tr
                  key={request.id}
                  variants={item}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{request.studentName}</p>
                      <p className="text-xs text-gray-500">{request.studentEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-800">{request.examName}</p>
                    <p className="text-xs text-gray-500">ID: {request.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-emerald-600">{request.score}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>{request.examDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      {request.status === "approved" ? "Đã cấp" : request.status === "pending" ? "Chờ duyệt" : "Từ chối"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {request.blockchainId ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-gray-500">{request.blockchainId}</span>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Chưa có</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {request.status === "pending" && (
                        <>
                          <button className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors">
                            Duyệt
                          </button>
                          <button className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors">
                            Từ chối
                          </button>
                        </>
                      )}
                      {request.status === "approved" && (
                        <>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Download className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Share2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
           </table>
        </div>
      </motion.div>

      {/* Bulk Issue Section */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Cấp chứng chỉ hàng loạt</h3>
              <p className="text-sm text-gray-600">Cấp chứng chỉ cho nhiều học viên cùng lúc</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white text-blue-600 rounded-lg border border-blue-300 hover:shadow-md transition-all">
              Tải template Excel
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              Upload danh sách
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}