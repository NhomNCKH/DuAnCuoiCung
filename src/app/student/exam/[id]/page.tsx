// app/student/exam/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  AlertTriangle,
  Camera,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ProctoringCamera } from "@/components/proctoring/ProctoringCamera";

const MOCK_QUESTIONS = [
  {
    id: 1,
    text: "The committee _____ to approve the budget by the end of the week.",
    options: ["A. expect", "B. expects", "C. expecting", "D. expected"],
    correct: 1,
    part: 5,
  },
  {
    id: 2,
    text: "Please submit your application _____ the deadline to be considered.",
    options: ["A. before", "B. after", "C. during", "D. until"],
    correct: 0,
    part: 5,
  },
  {
    id: 3,
    text: "The new software update _____ several bugs in the previous version.",
    options: ["A. fix", "B. fixes", "C. fixed", "D. fixing"],
    correct: 2,
    part: 5,
  },
  {
    id: 4,
    text: "Ms. Johnson, _____ is our new marketing director, will give a presentation.",
    options: ["A. who", "B. whom", "C. which", "D. whose"],
    correct: 0,
    part: 5,
  },
  {
    id: 5,
    text: "The company's profits _____ significantly over the past three years.",
    options: ["A. increase", "B. increased", "C. increasing", "D. have increased"],
    correct: 3,
    part: 5,
  },
];

const MAX_CLIENT_WARNINGS = 3;
const VIOLATION_COOLDOWN_MS = 2000;

type Violation = {
  source?: "client" | "server";
  action?: string;
  message: string;
  timestamp?: string;
};

export default function ExamPage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const { user } = useAuth();
  const examId = Array.isArray(params?.id) ? params.id[0] ?? "" : params?.id ?? "";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(3600);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [clientWarningCount, setClientWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState<{ message: string } | null>(null);

  const blockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClientViolationAtRef = useRef<Record<string, number>>({});

  const totalQuestions = MOCK_QUESTIONS.length;
  const currentQuestion = MOCK_QUESTIONS[currentIndex];
  const answeredCount = Object.keys(answers).length;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (questionId: number, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const showWarningToast = useCallback((message: string) => {
    setShowWarning({ message });
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(null);
    }, 3000);
  }, []);

  const handleBlocked = useCallback(() => {
    setIsBlocked((prev) => {
      if (prev || isSubmitted) return prev;
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
      }
      blockTimeoutRef.current = setTimeout(() => {
        router.push(`/student/exam/result/${examId}?blocked=true`);
      }, 1500);
      return true;
    });
  }, [examId, isSubmitted, router]);

  const handleViolation = useCallback(
    (violation: Violation) => {
      const message =
        typeof violation?.message === "string" && violation.message.trim()
          ? violation.message
          : "Suspicious behavior detected.";
      setViolations((prev) => [...prev, { ...violation, source: "server" }]);
      showWarningToast(message);
    },
    [showWarningToast]
  );

  const registerClientViolation = useCallback(
    (action: string, message: string) => {
      const now = Date.now();
      const last = lastClientViolationAtRef.current[action] ?? 0;
      if (now - last < VIOLATION_COOLDOWN_MS) return;
      lastClientViolationAtRef.current[action] = now;

      setViolations((prev) => [
        ...prev,
        {
          source: "client",
          action,
          message,
          timestamp: new Date().toISOString(),
        },
      ]);

      setClientWarningCount((prev) => {
        const next = prev + 1;
        if (next >= MAX_CLIENT_WARNINGS) {
          handleBlocked();
        }
        return next;
      });

      showWarningToast(message);
    },
    [handleBlocked, showWarningToast]
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitted || isBlocked) return;

    let score = 0;
    MOCK_QUESTIONS.forEach((question) => {
      if (answers[question.id] === question.correct) {
        score++;
      }
    });

    const percentage = (score / totalQuestions) * 100;

    const result = {
      examId,
      userId: user?.id,
      answers,
      score: percentage,
      correctCount: score,
      totalQuestions,
      submittedAt: new Date().toISOString(),
      violations: violations.length,
      status: isBlocked ? "blocked" : "completed",
    };

    localStorage.setItem(`exam_result_${examId}`, JSON.stringify(result));

    setIsSubmitted(true);
    router.push(`/student/exam/result/${examId}?score=${Math.round(percentage)}`);
  }, [answers, examId, isBlocked, isSubmitted, router, totalQuestions, user?.id, violations.length]);

  useEffect(() => {
    if (isSubmitted || isBlocked) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleSubmit, isBlocked, isSubmitted]);

  useEffect(() => {
    if (isSubmitted || isBlocked) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        registerClientViolation("tab_hidden", "You switched away from the exam tab.");
      }
    };

    const onWindowBlur = () => {
      registerClientViolation("window_blur", "Exam window lost focus.");
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        registerClientViolation("fullscreen_exit", "You exited fullscreen mode.");
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      registerClientViolation("context_menu", "Right click is disabled during the exam.");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isClipboardShortcut =
        (event.ctrlKey || event.metaKey) && ["c", "v", "x", "a", "s", "p"].includes(key);
      const isForbiddenKey = event.key === "PrintScreen";
      if (!isClipboardShortcut && !isForbiddenKey) return;
      event.preventDefault();
      registerClientViolation("forbidden_key", "Forbidden keyboard shortcut detected.");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isBlocked, isSubmitted, registerClientViolation]);

  useEffect(() => {
    if (isSubmitted || isBlocked) return;
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen?.().catch(() => {
      // Browser can reject this if no user gesture is available yet.
    });
  }, [isBlocked, isSubmitted]);

  useEffect(() => {
    return () => {
      if (blockTimeoutRef.current) clearTimeout(blockTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  if (isBlocked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Ban da bi dinh chi thi</h2>
          <p className="text-red-600 mb-4">Phat hien hanh vi gian lan nhieu lan. Vui long lien he giam thi.</p>
          <button
            onClick={() => router.push("/student/dashboard")}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Ve trang chu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProctoringCamera
        userId={user?.id || "test-user"}
        examId={examId}
        onViolation={handleViolation}
        onBlocked={handleBlocked}
      />

      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-4 right-4 z-50 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded shadow-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800 font-medium">{showWarning.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800">TOEIC Practice Test</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Flag className="w-4 h-4" />
                <span>Part {currentQuestion?.part || 5}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  timeLeft < 300 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
              </div>

              <div className="p-2 rounded-lg bg-green-50" title="Camera monitoring is mandatory during the exam.">
                <Camera className="w-5 h-5 text-green-600" />
              </div>

              <button
                onClick={() => setIsSoundOn(!isSoundOn)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isSoundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setShowConfirm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Nop bai
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Tien do: {answeredCount}/{totalQuestions} cau</span>
              <span>
                {Math.round((answeredCount / totalQuestions) * 100)}% | Client warnings: {clientWarningCount}/{MAX_CLIENT_WARNINGS}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  Cau {currentIndex + 1}/{totalQuestions}
                </span>
              </div>
              <p className="text-lg font-medium text-gray-800">{currentQuestion?.text}</p>
            </div>

            <div className="space-y-3">
              {currentQuestion?.options.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(currentQuestion.id, idx)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-blue-500 bg-blue-500" : "border-gray-400"
                        }`}
                      >
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className={isSelected ? "text-blue-700 font-medium" : "text-gray-700"}>{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Cau truoc
          </button>

          <div className="flex gap-2">
            {MOCK_QUESTIONS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  currentIndex === idx
                    ? "bg-blue-600 text-white"
                    : answers[MOCK_QUESTIONS[idx].id] !== undefined
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            disabled={currentIndex === totalQuestions - 1}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cau sau
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold mb-2">Xac nhan nop bai</h3>
            <p className="text-gray-600 mb-4">
              Ban da tra loi {answeredCount}/{totalQuestions} cau hoi.
              {totalQuestions - answeredCount > 0 && ` Con ${totalQuestions - answeredCount} cau chua tra loi.`}
              {"\n"}Ban co chac muon nop bai khong?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Huy
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Nop bai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
