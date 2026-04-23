// components/proctoring/ProctoringCamera.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiClient } from "@/lib/api-client";

interface ProctoringCameraProps {
  userId: string;
  examId: string;
  examAttemptId?: string;
  onViolation?: (violation: any) => void;
  onBlocked?: () => void;
}

export const ProctoringCamera = ({
  userId,
  examId,
  examAttemptId,
  onViolation,
  onBlocked,
}: ProctoringCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectedRef = useRef(false);

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

  // Handle violations from YOLO service and report to backend
  useEffect(() => {
    if (!lastMessage) return;

    const reportViolationsToBackend = async () => {
      try {
        const data = JSON.parse(lastMessage);

        // Report violations to backend API
        if (Array.isArray(data.violations) && data.violations.length > 0) {
          setIsReporting(true);

          try {
            await apiClient.admin.proctoring.reportViolation({
              userId,
              examId,
              examAttemptId,
              violations: data.violations.map((v: any) => ({
                action: v.action || "unknown",
                message: v.message,
                severity: v.severity || 1,
                confidence: v.confidence || 0,
                timestamp: v.timestamp || new Date().toISOString(),
              })),
              timestamp: new Date().toISOString(),
            });

            // Call local handler after successful backend submission
            onViolation?.(data.violations[0]);
          } catch (error) {
            console.error("Failed to report violations to backend:", error);
            // Still call handler even if reporting fails
            onViolation?.({
              message: `Detected violation but failed to report: ${error}`,
            });
          } finally {
            setIsReporting(false);
          }
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
  }, [lastMessage, onBlocked, onViolation, userId, examId, examAttemptId]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
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
      if (!videoRef.current || !canvasRef.current || !isConnectedRef.current)
        return;
      if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      const imageData = canvas.toDataURL("image/jpeg", 0.5);
      sendMessage(JSON.stringify({ image: imageData.split(",")[1] }));
    }, 3000);
  }, [sendMessage]);

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        onViolation?.({
          message: "Camera API is not available in this browser.",
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });

      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
      setIsMonitoring(true);
      startCapturing();
    } catch (error) {
      console.error("Camera error:", error);
      onViolation?.({
        message: "Cannot access camera. Please grant camera permission.",
      });
      onBlocked?.();
    }
  }, [onBlocked, onViolation, startCapturing]);

  useEffect(() => {
    startCamera();
    return () => stopMonitoring();
  }, [startCamera, stopMonitoring]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <div className="fixed bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden shadow-lg z-50 border-2 border-blue-500">
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