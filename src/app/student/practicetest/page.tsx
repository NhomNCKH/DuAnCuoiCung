"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Clock,
  Play,
  History,
  Star,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  Wifi,
  Volume2,
  Camera,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import type {
  LearnerExamAttemptHistoryItem,
  LearnerExamTemplateSummary,
  PaginatedData,
} from "@/types/learner-exam";

type ExamTemplate = LearnerExamTemplateSummary & {
  difficulty?: string;
  description?: string;
  latestAttempt?: LearnerExamAttemptHistoryItem | null;
  latestGradedAttempt?: LearnerExamAttemptHistoryItem | null;
  historyCount?: number;
};

export default function OfficialExamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [precheckOpen, setPrecheckOpen] = useState(false);
  const [precheckTemplate, setPrecheckTemplate] = useState<ExamTemplate | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [networkChecking, setNetworkChecking] = useState(false);
  const [networkOk, setNetworkOk] = useState(false);
  const [networkMessage, setNetworkMessage] = useState<string>("");
  const [deviceChecks, setDeviceChecks] = useState<Array<{ label: string; ok: boolean; detail?: string }>>([]);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [audioHeard, setAudioHeard] = useState<boolean | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [faceChecking, setFaceChecking] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceError, setFaceError] = useState<string>("");
  const [registrationProfile, setRegistrationProfile] = useState<{
    fullName?: string;
    identityNumber?: string;
    birthday?: string;
    phone?: string;
    address?: string;
  } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioOscRef = useRef<OscillatorNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);

  const officialTemplates = useMemo(
    () => templates.filter((template) => template.mode === "official_exam"),
    [templates],
  );

  const totalAttemptHistory = officialTemplates.reduce(
    (sum, template) => sum + (template.historyCount ?? 0),
    0,
  );
  const totalQuestions = officialTemplates.reduce(
    (sum, template) => sum + Number(template.totalQuestions ?? 0),
    0,
  );

  const filteredTemplates = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return officialTemplates;
    return officialTemplates.filter((template) => {
      const name = String(template.name ?? "").toLowerCase();
      const desc = String(template.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [officialTemplates, keyword]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const templateRes = await apiClient.learner.listPublishedTemplates();
      const payload = templateRes.data as PaginatedData<ExamTemplate>;
      setTemplates((payload.data ?? []).map((template) => ({ ...template })));
      setIsLoading(false);

      void apiClient.learner.examAttempt
        .listHistory({ limit: 100 })
        .then((historyRes) => {
          const historyPayload = historyRes.data as
            | PaginatedData<LearnerExamAttemptHistoryItem>
            | undefined;
          const latestAttemptByTemplate = new Map<string, LearnerExamAttemptHistoryItem>();
          const latestGradedAttemptByTemplate = new Map<string, LearnerExamAttemptHistoryItem>();
          const historyCountByTemplate = new Map<string, number>();

          for (const attempt of historyPayload?.data ?? []) {
            historyCountByTemplate.set(
              attempt.examTemplateId,
              (historyCountByTemplate.get(attempt.examTemplateId) ?? 0) + 1,
            );
            if (!latestAttemptByTemplate.has(attempt.examTemplateId)) {
              latestAttemptByTemplate.set(attempt.examTemplateId, attempt);
            }
            if (
              attempt.status === "graded" &&
              !latestGradedAttemptByTemplate.has(attempt.examTemplateId)
            ) {
              latestGradedAttemptByTemplate.set(attempt.examTemplateId, attempt);
            }
          }

          setTemplates((prev) =>
            prev.map((template) => ({
              ...template,
              latestAttempt: latestAttemptByTemplate.get(template.id) ?? null,
              latestGradedAttempt:
                latestGradedAttemptByTemplate.get(template.id) ?? null,
              historyCount: historyCountByTemplate.get(template.id) ?? 0,
            })),
          );
        })
        .catch(() => undefined);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách đề thi");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const formatDuration = (sec?: number) => {
    if (!sec) return "—";
    return `${Math.floor(sec / 60)} phút`;
  };

  const restartTemplate = (templateId: string) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`mock-test-force-new:${templateId}`, "1");
    }
    router.push(`/student/mock-test/${templateId}`);
  };

  const closePrecheckModal = useCallback(() => {
    setPrecheckOpen(false);
    setPrecheckTemplate(null);
    setActiveStep(1);
    setNetworkOk(false);
    setNetworkMessage("");
    setAudioPlayed(false);
    setAudioHeard(null);
    setFaceVerified(false);
    setFaceError("");
    setRegistrationProfile(null);
    setCameraReady(false);
    if (audioOscRef.current) {
      audioOscRef.current.stop();
      audioOscRef.current.disconnect();
      audioOscRef.current = null;
    }
    if (audioGainRef.current) {
      audioGainRef.current.disconnect();
      audioGainRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const runNetworkCheck = useCallback(async () => {
    setNetworkChecking(true);
    setNetworkMessage("");
    try {
      const online = typeof navigator !== "undefined" ? navigator.onLine : true;
      if (!online) throw new Error("Kết nối không ổn định.");
      await apiClient.health();

      let cameraOk = false;
      let micOk = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        cameraOk = stream.getVideoTracks().length > 0;
        micOk = stream.getAudioTracks().length > 0;
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        cameraOk = false;
        micOk = false;
      }

      const browser = navigator.userAgent;
      const platform = navigator.platform || "Unknown";
      const viewport = `${window.innerWidth}x${window.innerHeight}`;
      const checks = [
        { label: "Mạng", ok: true, detail: "Kết nối ổn định" },
        { label: "Camera", ok: cameraOk, detail: cameraOk ? "Sẵn sàng" : "Không truy cập được" },
        { label: "Micro", ok: micOk, detail: micOk ? "Sẵn sàng" : "Không truy cập được" },
        { label: "Trình duyệt", ok: true, detail: browser },
        { label: "Hệ điều hành", ok: true, detail: platform },
        { label: "Kích thước màn hình", ok: true, detail: viewport },
      ];
      setDeviceChecks(checks);

      const allPassed = checks.every((item) => item.ok);
      setNetworkOk(allPassed);
      setNetworkMessage(allPassed ? "Thông tin máy đã sẵn sàng." : "Thông tin máy chưa đạt yêu cầu.");
    } catch (e: any) {
      setNetworkOk(false);
      setNetworkMessage(e?.message || "Kết nối không ổn định.");
      setDeviceChecks([{ label: "Mạng", ok: false, detail: "Không ổn định" }]);
    } finally {
      setNetworkChecking(false);
    }
  }, []);

  const playAudioTest = useCallback(async () => {
    try {
      setAudioPlaying(true);
      setAudioHeard(null);
      setAudioPlayed(false);
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) throw new Error("Trình duyệt không hỗ trợ audio test.");
      const ctx = audioCtxRef.current ?? new Ctx();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      // Cheerful melody (~10s) for clearer speaker/headphone check.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const melody: Array<[number, number]> = [
        [523.25, 0.4], [659.25, 0.4], [783.99, 0.4], [659.25, 0.4],
        [698.46, 0.4], [880.0, 0.4], [1046.5, 0.6], [880.0, 0.4],
        [783.99, 0.4], [659.25, 0.4], [523.25, 0.4], [659.25, 0.4],
        [783.99, 0.6], [659.25, 0.4], [587.33, 0.4], [523.25, 0.6],
        [659.25, 0.4], [783.99, 0.4], [880.0, 0.4], [987.77, 0.4],
        [1046.5, 0.8], [783.99, 0.4], [659.25, 0.4], [523.25, 0.8],
      ];

      osc.type = "triangle";
      gain.gain.setValueAtTime(0.0001, now);
      let t = now;
      for (const [freq, dur] of melody) {
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
        gain.gain.linearRampToValueAtTime(0.045, t + Math.max(dur - 0.04, 0.03));
        gain.gain.linearRampToValueAtTime(0.0001, t + dur);
        t += dur;
      }
      // Keep close to 10s total
      const totalDuration = Math.min(Math.max(t - now, 9.5), 10.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + totalDuration);
      audioOscRef.current = osc;
      audioGainRef.current = gain;
      osc.onended = () => {
        setAudioPlaying(false);
        setAudioPlayed(true);
        osc.disconnect();
        gain.disconnect();
        audioOscRef.current = null;
        audioGainRef.current = null;
      };
    } catch {
      setAudioPlaying(false);
    }
  }, []);

  const ensureCamera = useCallback(async () => {
    if (!precheckOpen || activeStep !== 3) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch {
      setCameraReady(false);
      setFaceError("Không mở được camera. Vui lòng cấp quyền camera và thử lại.");
    }
  }, [activeStep, precheckOpen]);

  useEffect(() => {
    if (precheckOpen && activeStep === 3) {
      void ensureCamera();
    }
  }, [precheckOpen, activeStep, ensureCamera]);

  const handleFaceVerify = useCallback(async () => {
    if (!precheckTemplate || !videoRef.current || !canvasRef.current) return;
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setFaceError("Camera chưa sẵn sàng, vui lòng thử lại.");
      return;
    }

    setFaceChecking(true);
    setFaceError("");
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không thể đọc dữ liệu camera.");
      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1] || "";
      if (!base64) throw new Error("Không lấy được ảnh xác minh từ camera.");

      const verifyRes = await apiClient.admin.proctoring.verifyFaceIdentity({
        examTemplateId: precheckTemplate.id,
        webcamImageBase64: base64,
        checkpoint: "pre_exam_gate",
      });
      const data = verifyRes.data;
      if (!data?.verified || !data?.allowedToStart) {
        setFaceVerified(false);
        setFaceError("Không chính chủ tài khoản đăng ký thi.");
        return;
      }

      const regsRes = await apiClient.learner.officialExam.listRegistrations();
      const regs = (regsRes as any)?.data?.items ?? [];
      const reg = regs.find((item: any) => item?.template?.id === precheckTemplate.id);
      setRegistrationProfile(reg?.registrationProfile ?? null);
      setFaceVerified(true);
    } catch (e: any) {
      setFaceVerified(false);
      setFaceError(e?.message || "Không thể xác minh Face ID.");
    } finally {
      setFaceChecking(false);
    }
  }, [precheckTemplate]);

  const openPrecheck = useCallback((template: ExamTemplate) => {
    setPrecheckTemplate(template);
    setPrecheckOpen(true);
    setActiveStep(1);
    setNetworkOk(false);
    setNetworkMessage("");
    setAudioPlayed(false);
    setAudioHeard(null);
    setFaceVerified(false);
    setFaceError("");
    setRegistrationProfile(null);
  }, []);

  const proceedToExam = useCallback(() => {
    if (!precheckTemplate) return;
    if (!(networkOk && audioHeard === true && faceVerified)) return;
    closePrecheckModal();
    router.push(`/student/mock-test/${precheckTemplate.id}?official=1`);
  }, [audioHeard, closePrecheckModal, faceVerified, networkOk, precheckTemplate, router]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-600/40 dark:bg-slate-900/40"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-slate-100">
                Thi chính thức
              </h1>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto md:min-w-[520px]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên đề hoặc mô tả..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:border-slate-600/40 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-violet-500/40 dark:focus:ring-violet-500/20"
              />
            </div>
            <button
              onClick={fetchTemplates}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          </div>
        </div>
      </motion.div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30">
          <div className="mb-2 inline-flex rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{officialTemplates.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Đề chính thức</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30">
          <div className="mb-2 inline-flex rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalQuestions}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Tổng câu hỏi</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/40 dark:bg-slate-900/30">
          <div className="mb-2 inline-flex rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
            <History className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalAttemptHistory}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Lượt thi đã lưu</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchTemplates} className="flex items-center gap-1 text-sm underline">
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : officialTemplates.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <ClipboardCheck className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p>Chưa có đề thi chính thức được xuất bản</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-300">
          Không tìm thấy đề phù hợp với từ khóa.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredTemplates.map((template) => {
            const latestAttempt = template.latestAttempt;
            const latestGradedAttempt = template.latestGradedAttempt;
            const hasGradedAttempt = !!latestGradedAttempt;
            const hasInProgressAttempt = latestAttempt?.status === "in_progress";
            const primaryHref = hasGradedAttempt
              ? `/student/mock-test/${template.id}?attemptId=${latestGradedAttempt.id}&view=result`
              : `/student/mock-test/${template.id}`;
            const primaryLabel = hasGradedAttempt
              ? "Xem kết quả"
              : hasInProgressAttempt
                ? "Tiếp tục thi"
                : "Vào thi chính thức";

            return (
              <div
                key={template.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600/40 dark:bg-slate-900/30 dark:hover:bg-slate-900/40"
              >
                <div className="h-1 w-full bg-violet-200 dark:bg-violet-500/30" />
                <div className="p-5">
                  <h3 className="mb-1 line-clamp-2 font-bold text-slate-900 dark:text-slate-100">
                    {template.name}
                  </h3>
                  {template.description ? (
                    <p className="mb-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">
                      {template.description}
                    </p>
                  ) : null}

                  <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-300">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(template.totalDurationSec)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      {template.totalQuestions ?? 0} câu
                    </div>
                    <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                      Thi chính thức
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {hasGradedAttempt ? (
                      <Link
                        href={primaryHref}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600/40 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
                      >
                        <Play className="h-4 w-4" />
                        {primaryLabel}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openPrecheck(template)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 font-semibold text-white transition-colors hover:bg-violet-700"
                      >
                        <Play className="h-4 w-4" />
                        {primaryLabel}
                      </button>
                    )}

                    {latestAttempt ? (
                      <button
                        type="button"
                        onClick={() => openPrecheck(template)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600/40 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        Làm lại đề này
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {precheckOpen && precheckTemplate ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={closePrecheckModal}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Kiểm tra trước khi vào thi chính thức
                </h3>
                <div className="mt-3 px-1">
                  <div className="grid grid-cols-3">
                    {[
                      { index: 1, label: "Kiểm tra thông tin máy", active: activeStep === 1, done: networkOk },
                      { index: 2, label: "Kiểm tra âm thanh", active: activeStep === 2, done: audioPlayed },
                      { index: 3, label: "Xác minh Face ID", active: activeStep === 3, done: faceVerified },
                    ].map((step, idx, arr) => (
                      <div key={step.index} className="relative flex flex-col items-center">
                        {idx < arr.length - 1 ? (
                          <span
                            className={`absolute left-1/2 top-[14px] h-[3px] w-full ${
                              step.done ? "bg-violet-500" : "bg-slate-200"
                            }`}
                          />
                        ) : null}
                        <span
                          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                            step.done
                              ? "border-violet-600 bg-violet-600 text-white"
                              : step.active
                                ? "border-violet-500 bg-white text-violet-600"
                                : "border-slate-300 bg-white text-slate-400"
                          }`}
                        >
                          {step.index}
                        </span>
                        <span className="mt-2 text-center text-[11px] font-semibold text-slate-600">
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-1 text-slate-500 hover:text-slate-700"
                onClick={closePrecheckModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {activeStep === 1 ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Wifi className="h-4 w-4 text-violet-600" />
                    Kiểm tra thông tin máy
                  </p>
                  <p className="text-sm text-slate-600">
                    Hệ thống kiểm tra mạng, thiết bị và môi trường trình duyệt trước khi thi.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => void runNetworkCheck()}
                      disabled={networkChecking}
                    >
                      {networkChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {networkChecking ? "Đang kiểm tra..." : "Kiểm tra thông tin máy"}
                    </button>
                    {networkOk ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Kết nối ổn định
                      </span>
                    ) : null}
                  </div>
                  {networkMessage ? (
                    <div
                      className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                        networkOk
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {networkOk ? networkMessage : "Kết nối không ổn định"}
                    </div>
                  ) : null}
                  {deviceChecks.length > 0 ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {deviceChecks.map((item) => (
                        <div
                          key={item.label}
                          className={`rounded-lg border px-3 py-2 text-xs ${
                            item.ok
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          <p className="font-semibold">{item.label}</p>
                          <p className="mt-0.5 line-clamp-2">{item.detail || (item.ok ? "OK" : "Fail")}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeStep === 2 ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Volume2 className="h-4 w-4 text-violet-600" />
                    Kiểm tra âm thanh (10 giây)
                  </p>
                  <p className="text-sm text-slate-600">
                    Nhấn phát âm thanh kiểm tra. Nếu nghe rõ, xác nhận để tiếp tục.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <button type="button" className="btn-primary" onClick={() => void playAudioTest()} disabled={audioPlaying}>
                      {audioPlaying ? "Đang phát 10s..." : "Phát âm thanh kiểm tra"}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={audioPlaying}
                      onClick={() => {
                        setAudioHeard(true);
                        setAudioPlayed(true);
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        audioHeard === true
                          ? "bg-emerald-600 text-white"
                          : "border border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      Đã nghe được âm thanh
                    </button>
                    <button
                      type="button"
                      disabled={audioPlaying}
                      onClick={() => {
                        setAudioHeard(false);
                        setAudioPlayed(false);
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        audioHeard === false
                          ? "bg-rose-600 text-white"
                          : "border border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      Không nghe được âm thanh
                    </button>
                  </div>
                  {audioHeard === false ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      Vui lòng kiểm tra lại loa/tai nghe hoặc đổi thiết bị rồi thử lại.
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeStep === 3 ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Camera className="h-4 w-4 text-violet-600" />
                    Xác minh Face ID
                  </p>
                  <div className={`mt-3 grid gap-4 ${faceVerified ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                    <div className="flex justify-center">
                      <div className="relative h-56 w-56">
                        <div
                          className={`absolute inset-0 rounded-full border-4 ${
                            faceVerified
                              ? "border-emerald-300"
                              : faceError
                                ? "border-rose-300"
                                : "border-violet-300"
                          }`}
                        />
                        {faceChecking ? (
                          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
                        ) : null}
                        <div className="absolute inset-2 overflow-hidden rounded-full border border-slate-200 bg-slate-900">
                          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                        </div>
                        {faceVerified ? (
                          <div className="absolute inset-0 grid place-items-center">
                            <div className="rounded-full bg-emerald-500/25 p-3 text-emerald-600">
                              <CheckCircle2 className="h-10 w-10" />
                            </div>
                          </div>
                        ) : null}
                        {!faceVerified && faceError ? (
                          <div className="absolute inset-0 grid place-items-center">
                            <div className="rounded-full bg-rose-500/20 p-3 text-rose-600 text-4xl font-bold leading-none">×</div>
                          </div>
                        ) : null}
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    {faceVerified ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                        <p className="font-bold">Thông tin người đăng ký</p>
                        <p className="mt-1">Họ tên: {registrationProfile?.fullName || user?.name || "—"}</p>
                        <p>Số định danh: {registrationProfile?.identityNumber || "—"}</p>
                        <p>Ngày sinh: {registrationProfile?.birthday || "—"}</p>
                        <p>Số điện thoại: {registrationProfile?.phone || "—"}</p>
                        <p>Địa chỉ: {registrationProfile?.address || "—"}</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button type="button" className="btn-primary" disabled={!cameraReady || faceChecking} onClick={() => void handleFaceVerify()}>
                      {faceChecking ? "Đang quét Face ID..." : "Quét Face ID"}
                    </button>
                    {faceVerified ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Xác minh thành công
                      </span>
                    ) : null}
                  </div>
                  {faceError ? (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {faceError}
                    </div>
                  ) : null}
                  
                </div>
              ) : null}
            </div>

            <div className="flex justify-between gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))}
                disabled={activeStep === 1}
              >
                Quay lại
              </button>
              <div className="flex gap-2">
                {activeStep < 3 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setActiveStep((prev) => ((prev + 1) as 1 | 2 | 3))}
                    disabled={(activeStep === 1 && !networkOk) || (activeStep === 2 && audioHeard !== true)}
                  >
                    Tiếp tục
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={proceedToExam}
                    disabled={!(networkOk && audioHeard === true && faceVerified)}
                  >
                    Vào thi chính thức
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

