// components/proctoring/ProctoringCamera.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiClient } from "@/lib/api-client";

const FRAME_CAPTURE_INTERVAL_MS = 1000;
const BROWSER_VIOLATION_COOLDOWN_MS = 4000;
const SPLIT_SCREEN_GRACE_MS = 1500;
const MIN_DESKTOP_WIDTH_FOR_SPLIT_CHECK = 1024;
const MIN_WINDOW_SCREEN_RATIO = 0.82;

interface ProctoringCameraProps {
  userId: string;
  examId: string;
  examAttemptId?: string;
  onViolation?: (violation: any) => void;
  onBlocked?: () => void;
  className?: string;
}

type ProctoringViolationPayload = {
  action?: string;
  message?: string;
  severity?: number;
  confidence?: number;
  timestamp?: string;
  snapshotImage?: string;
  screenshotUrl?: string;
};

export const ProctoringCamera = ({
  userId,
  examId,
  examAttemptId,
  onViolation,
  onBlocked,
  className = "",
}: ProctoringCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectedRef = useRef(false);
  const stoppedRef = useRef(false);
  const cameraRequestRef = useRef(0);
  const lastFrameDataUrlRef = useRef<string>("");
  const lastBrowserViolationAtRef = useRef<Record<string, number>>({});
  const splitScreenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [isReporting, setIsReporting] = useState(false);

  const wsUrl = useMemo(() => {
    const base = (
      process.env.NEXT_PUBLIC_YOLO_WS_URL || "ws://localhost:8001"
    ).replace(/\/$/, "");
    return `${base}/ws/${encodeURIComponent(userId)}/${encodeURIComponent(examId)}`;
  }, [examId, userId]);

  const { sendMessage, lastMessage, isConnected } = useWebSocket(wsUrl);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  const reportViolations = useCallback(
    async (violations: ProctoringViolationPayload[]) => {
      if (violations.length === 0) return;

      setIsReporting(true);
      try {
        await apiClient.admin.proctoring.reportViolation({
          userId,
          examId,
          examAttemptId,
          violations: violations.map((v) => ({
            action: v.action || "unknown",
            message: v.message,
            severity: v.severity || 1,
            confidence: v.confidence || 0,
            timestamp: v.timestamp || new Date().toISOString(),
            snapshotImage: v.snapshotImage || lastFrameDataUrlRef.current || undefined,
            screenshotUrl: v.screenshotUrl || v.snapshotImage || lastFrameDataUrlRef.current || undefined,
          })),
          timestamp: new Date().toISOString(),
        });

        violations.forEach((violation) => onViolation?.(violation));
      } catch (error) {
        console.error("Failed to report violations to backend:", error);
        onViolation?.({
          message: `Detected violation but failed to report: ${error}`,
        });
      } finally {
        setIsReporting(false);
      }
    },
    [examAttemptId, examId, onViolation, userId],
  );

  const captureCurrentFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return "";
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return "";

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.45);
    lastFrameDataUrlRef.current = imageData;
    return imageData;
  }, []);

  const reportBrowserViolation = useCallback(
    async (violation: ProctoringViolationPayload) => {
      const action = violation.action || "unknown";
      const now = Date.now();
      const last = lastBrowserViolationAtRef.current[action] ?? 0;

      if (now - last < BROWSER_VIOLATION_COOLDOWN_MS) return;
      lastBrowserViolationAtRef.current[action] = now;

      const snapshotImage = captureCurrentFrame() || lastFrameDataUrlRef.current || undefined;
      await reportViolations([
        {
          ...violation,
          timestamp: violation.timestamp || new Date().toISOString(),
          snapshotImage: violation.snapshotImage || snapshotImage,
          screenshotUrl: violation.screenshotUrl || snapshotImage,
        },
      ]);
    },
    [captureCurrentFrame, reportViolations],
  );

  // Handle violations from YOLO service and report to backend
  useEffect(() => {
    if (!lastMessage) return;

    const reportViolationsToBackend = async () => {
      try {
        const data = JSON.parse(lastMessage);

        // Report violations to backend API
        if (Array.isArray(data.violations) && data.violations.length > 0) {
          await reportViolations(data.violations);
        }

        // Update local warning count
        setWarningCount(Number(data.warning_count) || 0);

        // Handle blocked event
        if (data.is_blocked) {
          onBlocked?.();
        }
      } catch (error) {
        console.error("Invalid proctoring payload:", error);
      }
    };

    reportViolationsToBackend();
  }, [lastMessage, onBlocked, reportViolations]);

  const stopMonitoring = useCallback(() => {
    stoppedRef.current = true;
    cameraRequestRef.current += 1;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsMonitoring(false);
  }, []);

  const startCapturing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = setInterval(() => {
      if (!isConnectedRef.current) return;

      const imageData = captureCurrentFrame();
      if (!imageData) return;

      lastFrameDataUrlRef.current = imageData;
      sendMessage(JSON.stringify({ image: imageData.split(",")[1] }));
    }, FRAME_CAPTURE_INTERVAL_MS);
  }, [captureCurrentFrame, sendMessage]);

  const startCamera = useCallback(async () => {
    stoppedRef.current = false;
    const requestId = ++cameraRequestRef.current;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        await reportViolations([
          {
            action: "camera_unavailable",
            message: "Camera API is not available in this browser.",
            severity: 4,
            confidence: 1,
          },
        ]);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });

      if (stoppedRef.current || requestId !== cameraRequestRef.current || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);

      if (stoppedRef.current || requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) {
          streamRef.current = null;
        }
        if (videoRef.current?.srcObject === stream) {
          videoRef.current.srcObject = null;
        }
        return;
      }

      setIsMonitoring(true);
      startCapturing();
    } catch (error) {
      console.error("Camera error:", error);
      await reportViolations([
        {
          action: "camera_permission_denied",
          message: "Cannot access camera. Please grant camera permission.",
          severity: 5,
          confidence: 1,
        },
      ]);
      onBlocked?.();
    }
  }, [onBlocked, reportViolations, startCapturing]);

  useEffect(() => {
    startCamera();
    return () => stopMonitoring();
  }, [startCamera, stopMonitoring]);

  useEffect(() => {
    const reportTabHidden = () => {
      if (!document.hidden) return;
      void reportBrowserViolation({
        action: "tab_switch",
        message: "Người thi chuyển khỏi tab bài thi.",
        severity: 4,
        confidence: 1,
      });
    };

    const reportWindowBlur = () => {
      if (document.hidden) return;
      void reportBrowserViolation({
        action: "window_blur",
        message: "Cửa sổ bài thi mất tiêu điểm.",
        severity: 3,
        confidence: 0.9,
      });
    };

    const reportFullscreenExit = () => {
      if (!document.fullscreenElement) {
        void reportBrowserViolation({
          action: "fullscreen_exit",
          message: "Người thi thoát chế độ toàn màn hình.",
          severity: 4,
          confidence: 1,
        });
      }
    };

    const reportPageHide = () => {
      void reportBrowserViolation({
        action: "page_leave",
        message: "Người thi rời khỏi trang làm bài.",
        severity: 5,
        confidence: 1,
      });
    };

    const reportContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      void reportBrowserViolation({
        action: "context_menu",
        message: "Người thi mở menu chuột phải trong lúc làm bài.",
        severity: 2,
        confidence: 1,
      });
    };

    const reportForbiddenKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isClipboardShortcut =
        (event.ctrlKey || event.metaKey) && ["c", "v", "x", "a", "s", "p"].includes(key);
      const isForbiddenKey = event.key === "PrintScreen" || event.key === "F12";

      if (!isClipboardShortcut && !isForbiddenKey) return;

      event.preventDefault();
      void reportBrowserViolation({
        action: "forbidden_key",
        message: "Người thi dùng phím tắt không được phép.",
        severity: 3,
        confidence: 1,
      });
    };

    const isSplitScreenLikely = () => {
      if (window.screen.availWidth < MIN_DESKTOP_WIDTH_FOR_SPLIT_CHECK) return false;
      if (document.fullscreenElement) return false;

      const screenWidth = window.screen.availWidth || window.screen.width;
      const visibleWidth = Math.max(window.outerWidth || 0, window.innerWidth || 0);
      return visibleWidth > 0 && visibleWidth / screenWidth < MIN_WINDOW_SCREEN_RATIO;
    };

    const checkSplitScreen = () => {
      if (!isSplitScreenLikely()) {
        if (splitScreenTimerRef.current) {
          clearTimeout(splitScreenTimerRef.current);
          splitScreenTimerRef.current = null;
        }
        return;
      }

      if (splitScreenTimerRef.current) return;

      splitScreenTimerRef.current = setTimeout(() => {
        splitScreenTimerRef.current = null;
        if (!isSplitScreenLikely()) return;

        void reportBrowserViolation({
          action: "split_screen",
          message: "Phát hiện cửa sổ bài thi đang bị chia đôi hoặc thu nhỏ bất thường.",
          severity: 4,
          confidence: 0.85,
        });
      }, SPLIT_SCREEN_GRACE_MS);
    };

    document.addEventListener("visibilitychange", reportTabHidden);
    window.addEventListener("blur", reportWindowBlur);
    document.addEventListener("fullscreenchange", reportFullscreenExit);
    window.addEventListener("pagehide", reportPageHide);
    document.addEventListener("contextmenu", reportContextMenu);
    window.addEventListener("keydown", reportForbiddenKey);
    window.addEventListener("resize", checkSplitScreen);

    checkSplitScreen();

    return () => {
      document.removeEventListener("visibilitychange", reportTabHidden);
      window.removeEventListener("blur", reportWindowBlur);
      document.removeEventListener("fullscreenchange", reportFullscreenExit);
      window.removeEventListener("pagehide", reportPageHide);
      document.removeEventListener("contextmenu", reportContextMenu);
      window.removeEventListener("keydown", reportForbiddenKey);
      window.removeEventListener("resize", checkSplitScreen);

      if (splitScreenTimerRef.current) {
        clearTimeout(splitScreenTimerRef.current);
        splitScreenTimerRef.current = null;
      }
    };
  }, [reportBrowserViolation]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <div
        className={`relative aspect-video w-full overflow-hidden rounded-xl border border-blue-200 bg-black shadow-sm dark:border-blue-500/40 ${className}`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        <div className="absolute top-1 left-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          {isConnected ? "Monitoring" : "Disconnected"}
        </div>

        {warningCount > 0 && (
          <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-yellow-500 text-black text-xs rounded">
            Warning: {warningCount}/5
          </div>
        )}

        {isReporting && (
          <div className="absolute top-8 right-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
            Reporting...
          </div>
        )}

        {isMonitoring && (
          <div className="absolute top-1 right-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    </>
  );
};
