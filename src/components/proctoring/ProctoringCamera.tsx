// components/proctoring/ProctoringCamera.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiClient } from "@/lib/api-client";

const FRAME_CAPTURE_INTERVAL_MS = 1000;
const FACE_VERIFICATION_INITIAL_DELAY_MS = 2500;
const FACE_VERIFICATION_INTERVAL_MS = 5 * 60 * 1000;
const BROWSER_VIOLATION_COOLDOWN_MS = 4000;
const SPLIT_SCREEN_GRACE_MS = 1500;
const MIN_DESKTOP_WIDTH_FOR_SPLIT_CHECK = 1024;
const MIN_WINDOW_SCREEN_RATIO = 0.82;

interface ProctoringCameraProps {
  userId: string;
  examId: string;
  examAttemptId?: string;
  faceVerificationExamTemplateId?: string;
  enableFaceVerification?: boolean;
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
  faceVerificationExamTemplateId,
  enableFaceVerification = false,
  onViolation,
  onBlocked,
  className = "",
}: ProctoringCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceVerificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectedRef = useRef(false);
  const stoppedRef = useRef(false);
  const cameraRequestRef = useRef(0);
  const faceVerificationInFlightRef = useRef(false);
  const lastFrameDataUrlRef = useRef<string>("");
  const lastBrowserViolationAtRef = useRef<Record<string, number>>({});
  const splitScreenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [isReporting, setIsReporting] = useState(false);
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false);
  const [lastIdentitySimilarity, setLastIdentitySimilarity] = useState<number | null>(null);
  const debugLogsEnabled =
    process.env.NEXT_PUBLIC_PROCTORING_DEBUG_LOGS !== "false";

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

  const logDebugEvent = useCallback(
    async (
      event: string,
      options?: {
        level?: "debug" | "info" | "warn" | "error";
        message?: string;
        metadata?: Record<string, unknown>;
      },
    ) => {
      if (!debugLogsEnabled) return;

      try {
        await apiClient.admin.proctoring.logDebugEvent({
          examId,
          examAttemptId,
          source: "frontend",
          event,
          level: options?.level ?? "debug",
          message: options?.message,
          metadata: options?.metadata,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.debug("Failed to write proctoring debug log:", error);
      }
    },
    [debugLogsEnabled, examAttemptId, examId],
  );

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

        void logDebugEvent("violation_reported", {
          level: "warn",
          message: "Frontend reported proctoring violations to backend",
          metadata: {
            violationCount: violations.length,
            actions: violations.map((item) => item.action || "unknown"),
          },
        });

        violations.forEach((violation) => onViolation?.(violation));
      } catch (error) {
        console.error("Failed to report violations to backend:", error);
        void logDebugEvent("violation_report_failed", {
          level: "error",
          message: "Frontend failed to report proctoring violations",
          metadata: {
            error: error instanceof Error ? error.message : String(error),
            violationCount: violations.length,
          },
        });
        onViolation?.({
          message: `Detected violation but failed to report: ${error}`,
        });
      } finally {
        setIsReporting(false);
      }
    },
    [examAttemptId, examId, logDebugEvent, onViolation, userId],
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

      void logDebugEvent("browser_violation_detected", {
        level: "warn",
        message: "Browser-side proctoring rule was triggered",
        metadata: {
          action,
          severity: violation.severity ?? null,
        },
      });

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
    [captureCurrentFrame, logDebugEvent, reportViolations],
  );

  const verifyFaceIdentity = useCallback(
    async (checkpoint: string) => {
      if (!enableFaceVerification) return;
      if (faceVerificationInFlightRef.current) return;
      if (!examAttemptId && !faceVerificationExamTemplateId) return;

      const webcamImageBase64 = captureCurrentFrame() || lastFrameDataUrlRef.current;
      if (!webcamImageBase64) return;

      faceVerificationInFlightRef.current = true;
      setIsVerifyingIdentity(true);

      void logDebugEvent("face_verification_started", {
        level: "info",
        message: "Frontend started face verification checkpoint",
        metadata: {
          checkpoint,
          hasExamAttemptId: Boolean(examAttemptId),
          hasExamTemplateId: Boolean(faceVerificationExamTemplateId),
        },
      });

      try {
        const response = await apiClient.admin.proctoring.verifyFaceIdentity({
          examTemplateId: faceVerificationExamTemplateId,
          examAttemptId,
          webcamImageBase64,
          checkpoint,
          webcamSnapshotUrl: webcamImageBase64,
        });
        const result = response.data;

        setLastIdentitySimilarity(
          typeof result?.similarity === "number" ? result.similarity : null,
        );

        void logDebugEvent(
          result?.verified
            ? "face_verification_passed"
            : "face_verification_failed",
          {
            level: result?.verified ? "info" : "warn",
            message: "Frontend received face verification result",
            metadata: {
              checkpoint,
              verified: Boolean(result?.verified),
              similarity: result?.similarity ?? null,
              threshold: result?.threshold ?? null,
            },
          },
        );

        if (result && !result.verified) {
          const violation = {
            action: "face_mismatch",
            message: "Webcam face does not match the official registration image.",
            severity: 5,
            confidence: Math.max(0, Math.min(1, 1 - Number(result.similarity ?? 0))),
            timestamp: result.checkedAt || new Date().toISOString(),
            snapshotImage: webcamImageBase64,
            screenshotUrl: webcamImageBase64,
          };

          onViolation?.(violation);
          onBlocked?.();
        }
      } catch (error: any) {
        console.error("Face verification failed:", error);
        void logDebugEvent("face_verification_request_failed", {
          level: "error",
          message: "Frontend failed to call face verification endpoint",
          metadata: {
            checkpoint,
            error: error?.message || String(error),
          },
        });
        onViolation?.({
          action: "face_verification_failed",
          message:
            error?.message ||
            "Cannot verify identity from webcam frame. Please check camera and retry.",
          severity: 3,
          confidence: 1,
          timestamp: new Date().toISOString(),
        });
      } finally {
        faceVerificationInFlightRef.current = false;
        setIsVerifyingIdentity(false);
      }
    },
    [
      captureCurrentFrame,
      enableFaceVerification,
      examAttemptId,
      faceVerificationExamTemplateId,
      logDebugEvent,
      onBlocked,
      onViolation,
    ],
  );

  // Handle violations from YOLO service and report to backend
  useEffect(() => {
    if (!lastMessage) return;

    const reportViolationsToBackend = async () => {
      try {
        const data = JSON.parse(lastMessage);

        // Report violations to backend API
        if (Array.isArray(data.violations) && data.violations.length > 0) {
          void logDebugEvent("yolo_violations_received", {
            level: "warn",
            message: "Frontend received YOLO violations from websocket",
            metadata: {
              violationCount: data.violations.length,
              warningCount: Number(data.warning_count) || 0,
              blocked: Boolean(data.is_blocked),
              actions: data.violations.map((item: any) => item?.action || "unknown"),
            },
          });
          await reportViolations(data.violations);
        }

        // Update local warning count
        setWarningCount(Number(data.warning_count) || 0);

        // Handle blocked event
        if (data.is_blocked) {
          void logDebugEvent("yolo_blocked_received", {
            level: "error",
            message: "Frontend received blocked status from YOLO websocket",
            metadata: {
              warningCount: Number(data.warning_count) || 0,
            },
          });
          onBlocked?.();
        }
      } catch (error) {
        console.error("Invalid proctoring payload:", error);
        void logDebugEvent("yolo_payload_invalid", {
          level: "error",
          message: "Frontend could not parse YOLO websocket payload",
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    };

    reportViolationsToBackend();
  }, [lastMessage, logDebugEvent, onBlocked, reportViolations]);

  const stopMonitoring = useCallback(() => {
    stoppedRef.current = true;
    cameraRequestRef.current += 1;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (faceVerificationIntervalRef.current) {
      clearInterval(faceVerificationIntervalRef.current);
      faceVerificationIntervalRef.current = null;
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
    void logDebugEvent("camera_stopped", {
      level: "info",
      message: "Proctoring camera stopped",
    });
  }, [logDebugEvent]);

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

    void logDebugEvent("camera_start_requested", {
      level: "info",
      message: "Browser requested camera access for proctoring",
      metadata: {
        requestId,
      },
    });

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        void logDebugEvent("camera_unavailable", {
          level: "error",
          message: "Camera API is not available in this browser",
        });
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
      void logDebugEvent("camera_started", {
        level: "info",
        message: "Proctoring camera stream started",
        metadata: {
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
        },
      });
    } catch (error) {
      console.error("Camera error:", error);
      void logDebugEvent("camera_permission_denied", {
        level: "error",
        message: "Browser denied or failed camera access",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
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
  }, [logDebugEvent, onBlocked, reportViolations, startCapturing]);

  useEffect(() => {
    startCamera();
    return () => stopMonitoring();
  }, [startCamera, stopMonitoring]);

  useEffect(() => {
    if (!enableFaceVerification || !isMonitoring) return;

    const initialTimeout = setTimeout(() => {
      void verifyFaceIdentity("exam_start");
    }, FACE_VERIFICATION_INITIAL_DELAY_MS);

    faceVerificationIntervalRef.current = setInterval(() => {
      void verifyFaceIdentity("periodic_check");
    }, FACE_VERIFICATION_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (faceVerificationIntervalRef.current) {
        clearInterval(faceVerificationIntervalRef.current);
        faceVerificationIntervalRef.current = null;
      }
    };
  }, [enableFaceVerification, isMonitoring, verifyFaceIdentity]);

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

        {enableFaceVerification && (
          <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-slate-900/80 text-white text-xs rounded">
            {isVerifyingIdentity
              ? "Verifying ID..."
              : lastIdentitySimilarity !== null
                ? `ID ${lastIdentitySimilarity.toFixed(2)}`
                : "ID check"}
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
