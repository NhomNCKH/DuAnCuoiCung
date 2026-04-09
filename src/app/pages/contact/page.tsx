// app/contact/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  MessageSquare,
  Clock,
  Globe,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitted(true);
    setLoading(false);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      details: ["support@educhain.com", "hello@educhain.com"],
      color: "from-blue-500 to-cyan-500",
      action: "mailto:support@educhain.com",
    },
    {
      icon: Phone,
      title: "Hotline",
      details: ["1900 1234", "(+84) 28 1234 5678"],
      color: "from-blue-500 to-indigo-500",
      action: "tel:19001234",
    },
    {
      icon: MapPin,
      title: "Địa chỉ",
      details: ["123 Đường Nguyễn Huệ, Quận 1", "TP. Hồ Chí Minh, Việt Nam"],
      color: "from-purple-500 to-pink-500",
      action: "https://maps.google.com",
    },
    {
      icon: Clock,
      title: "Giờ làm việc",
      details: ["Thứ 2 - Thứ 6: 8:00 - 18:00", "Thứ 7: 8:00 - 12:00"],
      color: "from-orange-500 to-red-500",
      action: null,
    },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook", color: "bg-[#1877F2]" },
    { icon: Twitter, href: "#", label: "Twitter", color: "bg-[#1DA1F2]" },
    { icon: Linkedin, href: "#", label: "LinkedIn", color: "bg-[#0A66C2]" },
    {
      icon: Instagram,
      href: "#",
      label: "Instagram",
      color: "bg-pink-600",
    },
    { icon: Youtube, href: "#", label: "YouTube", color: "bg-[#FF0000]" },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-blue-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 rounded-full px-4 py-2 mb-6">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Liên hệ</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-6">
              Chúng tôi luôn sẵn sàng
              <span className="block text-blue-700">
                lắng nghe bạn
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Có bất kỳ câu hỏi hoặc góp ý? Hãy liên hệ với chúng tôi. Đội ngũ
              hỗ trợ luôn sẵn sàng giúp đỡ bạn 24/7.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {contactInfo.map((info, idx) => (
              <motion.div
                key={info.title}
                variants={item}
                whileHover={{ y: -8 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all"
              >
                <div
                  className={`w-14 h-14 bg-gradient-to-r ${info.color} rounded-xl flex items-center justify-center mb-4`}
                >
                  <info.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {info.title}
                </h3>
                {info.details.map((detail, i) => (
                  <p key={i} className="text-gray-500 text-sm mb-1">
                    {detail}
                  </p>
                ))}
                {info.action && (
                  <Link
                    href={info.action}
                    className="inline-flex items-center gap-1 text-blue-600 text-sm font-medium mt-3 hover:gap-2 transition-all"
                  >
                    Liên hệ ngay
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-xl border border-blue-100"
            >
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-800">
                  Gửi tin nhắn cho chúng tôi
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chủ đề
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="">Chọn chủ đề</option>
                    <option value="Hỗ trợ kỹ thuật">Hỗ trợ kỹ thuật</option>
                    <option value="Vấn đề thanh toán">Vấn đề thanh toán</option>
                    <option value="Góp ý về khóa học">Góp ý về khóa học</option>
                    <option value="Hợp tác">Hợp tác</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tin nhắn
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                    placeholder="Nhập tin nhắn của bạn..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Gửi tin nhắn</span>
                    </>
                  )}
                </button>

                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <p className="text-sm text-green-700">
                      Tin nhắn đã được gửi thành công!
                    </p>
                  </motion.div>
                )}
              </form>
            </motion.div>

            {/* Map & Social */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {/* Map */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-blue-100">
                <div className="h-[300px] relative">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.135529880693!2d106.7002495!3d10.7768895!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f3c1e2c6c3d%3A0x8c2b7c8e9f2b8c2d!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBLSEEgVFAuIEhDTQ!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="grayscale hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div className="p-4 bg-blue-50">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Kết nối với chúng tôi
                </h3>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative"
                    >
                      <div
                        className={`w-12 h-12 ${social.color} rounded-xl flex items-center justify-center shadow-lg transition-all transform group-hover:scale-110 group-hover:shadow-xl`}
                      >
                        <social.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {social.label}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Support Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">
                    Hỗ trợ trực tuyến
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giải đáp mọi thắc
                  mắc của bạn.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-600 font-medium">
                    Đang hoạt động
                  </span>
                  <span className="text-gray-400">• 24/7</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-12 mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-blue-100 text-center"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Chưa tìm thấy câu trả lời?
            </h3>
            <p className="text-gray-500 mb-4">
              Tham khảo câu hỏi thường gặp hoặc liên hệ trực tiếp với chúng tôi
            </p>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 text-blue-600 font-medium hover:gap-3 transition-all"
            >
              Xem câu hỏi thường gặp
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
