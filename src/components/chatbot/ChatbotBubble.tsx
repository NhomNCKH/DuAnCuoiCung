"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import lottie, { AnimationItem } from "lottie-web";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, Square, X } from "lucide-react";

import animationData from "@/app/animations/12345.json";
import { apiClient, type TimiTurnResponseData } from "@/lib/api-client";
import { getStoredAccessToken } from "@/lib/auth-session";
import { encodeWav } from "@/lib/audio/wav-encoder";
import { createTimiVad, type TimiVadInstance } from "@/lib/audio/timi-vad";

const STORAGE_KEY = "toeic_chatbot_bubble_pos_v1";
const SESSION_KEY = "toeic_timi_session_id";
const BUBBLE_SIZE = 96;
const DRAG_THRESHOLD_PX = 5;
const DIALOG_WIDTH = 380;
const DIALOG_HEIGHT = 540;
const SAFE_MARGIN = 16;
const HINT_TEXT = "Luyện nói với Timi nhé !!!";
const HINT_INTERVAL_MS = 5000;
const HINT_VISIBLE_MS = 3000;

type Role = "user" | "bot";

interface MicroCorrection {
  wrong: string;
  right: string;
  tip: string;
}

interface Message {
  id: string;
  role: Role;
  content: string;
  microCorrection?: MicroCorrection | null;
  audioDataUrl?: string | null;
  ts: number;
}

interface Position {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getDefaultPosition = (): Position => {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: window.innerWidth - BUBBLE_SIZE - 24,
    y: window.innerHeight - BUBBLE_SIZE - 24,
  };
};

const loadPersistedPosition = (): Position | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position;
    if (
      typeof parsed?.x !== "number" ||
      typeof parsed?.y !== "number" ||
      Number.isNaN(parsed.x) ||
      Number.isNaN(parsed.y)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const dataUrlFromBase64 = (base64: string, mime: string) =>
  `data:${mime};base64,${base64}`;

// Phát hiện ý định kết thúc hội thoại từ transcript của user.
// Ưu tiên các cách nói goodbye phổ biến trong tiếng Anh hội thoại,
// kèm cả vài cách nói tiếng Việt phòng khi học viên buột miệng.
const GOODBYE_EN_PATTERN =
  /\b(good\s*bye|goodbye|bye[-\s]*bye|byebye|bye|see\s+(you|ya)(\s+(later|soon|tomorrow))?|talk\s+to\s+you\s+later|catch\s+you\s+later|gotta\s+go|i\s+(have\s+to|gotta|need\s+to)\s+go|i['’]?m\s+done|that['’]?s\s+(all|enough|it)(\s+for\s+(now|today))?|end\s+(the\s+)?(session|conversation))\b/i;
const GOODBYE_VI_PATTERN =
  /(t[aạ]m\s*bi[eệ]t|ch[aà]o\s*t[aạ]m\s*bi[eệ]t|h[eẹ]n\s*g[aặ]p\s*l[aạ]i|k[eế]t\s*th[uú]c)/i;

const isGoodbyeIntent = (text: string): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  return GOODBYE_EN_PATTERN.test(trimmed) || GOODBYE_VI_PATTERN.test(trimmed);
};

type ListenMode = "off" | "loading" | "active";

export default function ChatbotBubble() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [showHint, setShowHint] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initStatus, setInitStatus] = useState<
    "idle" | "loading" | "error" | "ready" | "anonymous"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [listenMode, setListenMode] = useState<ListenMode>("off");
  const [speaking, setSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  // Cờ "Timi đang nói" — dùng để tạm pause VAD, tránh barge-in / feedback
  // (mic thu chính tiếng loa Timi rồi gửi STT vòng lặp).
  const [audioPlaying, setAudioPlaying] = useState(false);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const lottieContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const vadRef = useRef<TimiVadInstance | null>(null);
  const listenModeRef = useRef<ListenMode>("off");
  const sendingRef = useRef(false);

  const dragStateRef = useRef({
    pointerId: null as number | null,
    startClientX: 0,
    startClientY: 0,
    pointerOffsetX: 0,
    pointerOffsetY: 0,
    moved: false,
  });

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = loadPersistedPosition();
    const fallback = getDefaultPosition();
    const initial = persisted ?? fallback;
    setPos({
      x: clamp(initial.x, 0, window.innerWidth - BUBBLE_SIZE),
      y: clamp(initial.y, 0, window.innerHeight - BUBBLE_SIZE),
    });
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    setMounted(true);
    try {
      const stored = window.sessionStorage.getItem(SESSION_KEY);
      if (stored) setSessionId(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setPos((prev) => ({
        x: clamp(prev.x, 0, window.innerWidth - BUBBLE_SIZE),
        y: clamp(prev.y, 0, window.innerHeight - BUBBLE_SIZE),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos, mounted]);

  useEffect(() => {
    if (!mounted || !lottieContainerRef.current) return;
    const animation = lottie.loadAnimation({
      container: lottieContainerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData,
    });
    animationRef.current = animation;
    return () => {
      animation.destroy();
      animationRef.current = null;
    };
  }, [mounted]);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages, sending, speaking]);

  useEffect(() => {
    listenModeRef.current = listenMode;
  }, [listenMode]);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  // Single source of truth cho trạng thái "Timi đang/sắp nói": dựa vào
  // audio element thực tế thay vì React state/ref (vốn bị lag 1-2 frame
  // so với VAD callback). Logic:
  //   - ref == null      → không có audio nào → false.
  //   - audio.ended      → đã chạy xong       → false.
  //   - các case còn lại → đang play HOẶC vừa được gán chuẩn bị play
  //                        → true (an toàn, ưu tiên không cắt Timi).
  // stopAudio() và play().catch() cùng có trách nhiệm clear ref về null
  // để function này không kẹt trạng thái true vĩnh viễn.
  const isBotSpeakingNow = useCallback((): boolean => {
    const a = audioPlayerRef.current;
    return !!a && !a.ended;
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (open || dragging) {
      setShowHint(false);
      return;
    }
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setShowHint(true);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setShowHint(false), HINT_VISIBLE_MS);
    }, HINT_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [mounted, open, dragging]);

  const playAudioBase64 = useCallback(
    (base64?: string | null, mime = "audio/mpeg") => {
      if (!base64 || voiceMuted) return;
      try {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.src = "";
        }
        const audio = new Audio(dataUrlFromBase64(base64, mime));
        audio.volume = 1.0;
        // QUAN TRỌNG: gán audioPlayerRef SYNC trước mọi thứ khác để
        // isBotSpeakingNow() trả về true ngay lập tức (kể cả callback
        // VAD đang fire ở frame này). Đây là chìa khoá chống race.
        audioPlayerRef.current = audio;
        // Đồng thời pause VAD ngay (không qua effect/setState) để bus
        // worklet ngừng đẩy frame mới. Frame đã trong buffer sẽ được
        // guard bởi isBotSpeakingNow() trong callbacks.
        const vad = vadRef.current;
        if (vad?.isListening()) {
          void vad.pause();
        }
        setAudioPlaying(true);

        const clearPlaying = () => {
          // Clear ref TRƯỚC khi resume VAD để isBotSpeakingNow() trả về
          // false ngay tại frame VAD callback fire sau khi resume.
          if (audioPlayerRef.current === audio) {
            audioPlayerRef.current = null;
          }
          setAudioPlaying(false);
          // Resume VAD SYNC ngay khi audio kết thúc, không đợi effect.
          const v = vadRef.current;
          if (
            listenModeRef.current === "active" &&
            !sendingRef.current &&
            v &&
            !v.isListening()
          ) {
            void v.start();
          }
        };
        audio.addEventListener("ended", clearPlaying, { once: true });
        audio.addEventListener("error", clearPlaying, { once: true });
        // Lưu ý: không listen "pause" — pause có thể do code chủ động
        // (vd. stopAudio khi user đóng dialog) — clearPlaying sẽ được
        // gọi riêng trong stopAudio.
        audio.play().catch(() => {
          // Browser block autoplay hoặc lỗi load → coi như không phát.
          clearPlaying();
        });
      } catch {
        audioPlayerRef.current = null;
        setAudioPlaying(false);
      }
    },
    [voiceMuted],
  );

  const stopAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setAudioPlaying(false);
  }, []);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    const token = getStoredAccessToken();
    if (!token) {
      setInitStatus("anonymous");
      return null;
    }
    setInitStatus("loading");
    setError(null);
    try {
      const res = await apiClient.learner.timi.createSession({
        persona: "casual",
      });
      const data = res?.data ?? (res as any);
      const newId: string = data.sessionId;
      setSessionId(newId);
      try {
        window.sessionStorage.setItem(SESSION_KEY, newId);
      } catch {
        /* ignore */
      }
      const greeting = data.greeting;
      const greetMsg: Message = {
        id: greeting.turnId,
        role: "bot",
        content: greeting.text,
        audioDataUrl: dataUrlFromBase64(
          greeting.audioBase64,
          greeting.audioMime || "audio/mpeg",
        ),
        ts: Date.now(),
      };
      setMessages([greetMsg]);
      setInitStatus("ready");
      playAudioBase64(greeting.audioBase64, greeting.audioMime);
      return newId;
    } catch (err: any) {
      setInitStatus("error");
      setError(err?.message ?? "Không thể bắt đầu phiên với Timi");
      return null;
    }
  }, [sessionId, playAudioBase64]);

  useEffect(() => {
    if (!open || !mounted) return;
    if (sessionId || initStatus === "loading") return;
    void ensureSession();
  }, [open, mounted, sessionId, initStatus, ensureSession]);

  const endConversationRef = useRef<(() => Promise<void>) | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleEndAfterAudio = useCallback(() => {
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
    const fire = () => {
      endTimerRef.current = null;
      void endConversationRef.current?.();
    };

    const audio = audioPlayerRef.current;
    if (audio && !audio.paused) {
      const onEnded = () => {
        if (endTimerRef.current) {
          clearTimeout(endTimerRef.current);
          endTimerRef.current = null;
        }
        fire();
      };
      audio.addEventListener("ended", onEnded, { once: true });
      // Safety: nếu vì lý do nào đó audio không bắn 'ended' (mất stream),
      // vẫn đóng phiên sau 10s.
      endTimerRef.current = setTimeout(fire, 10_000);
    } else {
      // Không có audio đang phát (vd voice muted) — đóng sau 1.2s.
      endTimerRef.current = setTimeout(fire, 1200);
    }
  }, []);

  const appendTurnFromResponse = useCallback(
    (payload: TimiTurnResponseData, userTextOverride?: string) => {
      const userText = userTextOverride ?? payload.userTranscript ?? "";
      const userMsg: Message | null = userText
        ? {
            id: payload.turnId,
            role: "user",
            content: userText,
            ts: Date.now(),
          }
        : null;
      const botMsg: Message = {
        id: `${payload.turnId}-bot`,
        role: "bot",
        content: payload.reply.text,
        microCorrection: payload.reply.microCorrection ?? null,
        audioDataUrl: dataUrlFromBase64(
          payload.reply.audioBase64,
          payload.reply.audioMime || "audio/mpeg",
        ),
        ts: Date.now(),
      };
      setMessages((prev) => [
        ...prev,
        ...(userMsg ? [userMsg] : []),
        botMsg,
      ]);
      playAudioBase64(payload.reply.audioBase64, payload.reply.audioMime);

      if (isGoodbyeIntent(userText)) {
        scheduleEndAfterAudio();
      }
    },
    [playAudioBase64, scheduleEndAfterAudio],
  );

  const handleAudioBlob = useCallback(
    async (blob: Blob) => {
      // Last-line-of-defence: nếu Timi vẫn đang nói lúc flushPendingSegments
      // chạy (vd. user dừng nói rất sớm rồi Timi mới reply đến), DISCARD
      // segment để tránh feedback loop "mic ăn tiếng Timi → gửi STT".
      if (isBotSpeakingNow()) return;
      const id = await ensureSession();
      if (!id) return;
      setSending(true);
      setError(null);
      try {
        const res = await apiClient.learner.timi.submitAudioTurn(
          id,
          blob,
          "speech.wav",
        );
        const data = res?.data ?? (res as any);
        appendTurnFromResponse(data);
      } catch (err: any) {
        setError(err?.message ?? "Không gửi được audio cho Timi");
      } finally {
        setSending(false);
      }
    },
    [ensureSession, appendTurnFromResponse, isBotSpeakingNow],
  );

  const handleAudioBlobRef = useRef(handleAudioBlob);
  useEffect(() => {
    handleAudioBlobRef.current = handleAudioBlob;
  }, [handleAudioBlob]);

  // Lớp gộp segment giữa các pause để tránh cắt khi user nghĩ giữa câu.
  // Khi VAD bắn onSpeechEnd, ta KHÔNG gửi ngay mà chờ POST_END_DELAY_MS;
  // nếu user nói tiếp trong khoảng đó, hai segment được nối lại với
  // 1 đoạn silence ngắn để giữ nhịp tự nhiên rồi mới gửi như 1 lượt.
  // VAD đã có `redemptionMs: 1500` ở `timi-vad.ts` đảm bảo silence thực
  // sự 1.5s trước khi bắn onSpeechEnd; cộng thêm 800ms ở đây là vừa đủ
  // an toàn (~2.3s tolerance pause) mà vẫn cho Timi phản hồi sớm 700ms.
  const POST_END_DELAY_MS = 800;
  const SEGMENT_GAP_SAMPLES = 8000; // ~0.5s @ 16 kHz
  const pendingSegmentsRef = useRef<Float32Array[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelFlushTimer = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const flushPendingSegments = useCallback(() => {
    flushTimerRef.current = null;
    const segments = pendingSegmentsRef.current;
    pendingSegmentsRef.current = [];
    if (!segments.length) return;
    // Nếu Timi bắt đầu nói trong khoảng POST_END_DELAY_MS (vd. response BE
    // về kịp), DISCARD luôn segment — chắc chắn không gửi câu thu trong
    // lúc loa đang phát Timi.
    if (isBotSpeakingNow()) return;

    let total = 0;
    for (let i = 0; i < segments.length; i++) {
      total += segments[i].length;
      if (i < segments.length - 1) total += SEGMENT_GAP_SAMPLES;
    }
    const merged = new Float32Array(total);
    let offset = 0;
    for (let i = 0; i < segments.length; i++) {
      merged.set(segments[i], offset);
      offset += segments[i].length;
      if (i < segments.length - 1) offset += SEGMENT_GAP_SAMPLES;
    }

    const blob = encodeWav(merged);
    if (blob.size > 0) {
      void handleAudioBlobRef.current(blob);
    }
  }, [isBotSpeakingNow]);

  const ensureVad = useCallback(async (): Promise<TimiVadInstance | null> => {
    if (vadRef.current) return vadRef.current;
    try {
      const instance = await createTimiVad({
        model: "legacy",
        // Hơi tăng ngưỡng để chống nhiễu lúc user thở/nuốt nước bọt.
        positiveSpeechThreshold: 0.65,
        // Giữ negative thấp xa positive để khi vào trạng thái "đang nói"
        // thì rất khó bị kéo về "im lặng" bởi 1-2 frame yếu giữa câu.
        negativeSpeechThreshold: 0.35,
        // Tăng dung sai im lặng giữa câu lên ~1.5s — đủ cho học viên
        // hít hơi, lưỡng lự vài tiếng "uhm..." mà vẫn coi là chung 1 lượt.
        redemptionMs: 1500,
        // Lọc click chuột / tiếng động ngắn dưới ~500ms.
        minSpeechMs: 500,
        // Pad nhiều hơn để không cắt mất phụ âm đầu (P/T/K) khi user mới nói.
        preSpeechPadMs: 300,
        // === Half-duplex (KHÔNG có barge-in) ===
        // Guard dùng isBotSpeakingNow() — đọc thẳng audio element thực tế,
        // KHÔNG dùng React state/ref (vốn bị lag 1-2 frame so với callback
        // VAD). Đây là điểm fix triệt để cho 2 bug:
        //   - Timi bị cắt giữa câu khi user thở (race ref/state)
        //   - Echo loop (mic ăn tiếng Timi rồi gửi đi)
        onSpeechStart: () => {
          if (sendingRef.current || isBotSpeakingNow()) return;
        },
        onRealSpeechStart: () => {
          if (sendingRef.current || isBotSpeakingNow()) return;
          setSpeaking(true);
          cancelFlushTimer();
        },
        onSpeechEnd: (audio) => {
          setSpeaking(false);
          // 3 lớp phòng vệ: sending, bot đang nói, segment rỗng.
          if (sendingRef.current || isBotSpeakingNow()) return;
          if (!audio?.length) return;
          pendingSegmentsRef.current.push(audio);
          cancelFlushTimer();
          flushTimerRef.current = setTimeout(
            flushPendingSegments,
            POST_END_DELAY_MS,
          );
        },
        onMisfire: () => {
          setSpeaking(false);
        },
        onError: (err) =>
          setError(err?.message ?? "Không khởi tạo được trình nhận giọng nói"),
      });
      vadRef.current = instance;
      return instance;
    } catch {
      return null;
    }
  }, [cancelFlushTimer, flushPendingSegments, isBotSpeakingNow]);

  const startListening = useCallback(async () => {
    if (listenModeRef.current !== "off") return;
    setError(null);
    setListenMode("loading");
    const instance = await ensureVad();
    if (!instance) {
      setListenMode("off");
      return;
    }
    try {
      await instance.start();
      setListenMode("active");
    } catch (err: any) {
      setError(
        err?.name === "NotAllowedError"
          ? "Bạn cần cấp quyền micro cho trình duyệt"
          : err?.message ?? "Không thể bật micro",
      );
      setListenMode("off");
    }
  }, [ensureVad]);

  const stopListening = useCallback(async () => {
    setListenMode("off");
    setSpeaking(false);
    // User chủ động tắt mic = đã nói xong → flush ngay câu đang chờ.
    cancelFlushTimer();
    flushPendingSegments();
    if (vadRef.current) {
      try {
        await vadRef.current.pause();
      } catch {
        /* ignore */
      }
    }
  }, [cancelFlushTimer, flushPendingSegments]);

  const toggleListening = useCallback(() => {
    if (listenMode === "loading") return;
    if (listenMode === "active") {
      void stopListening();
    } else {
      void startListening();
    }
  }, [listenMode, startListening, stopListening]);

  // Half-duplex gate (backup layer): điều khiển VAD instance theo trạng
  // thái React. Lớp pause/resume SYNC chính nằm trong `playAudioBase64`
  // và `clearPlaying`. Effect này chạy lại khi state đổi, đảm bảo lần
  // sau kiểm tra vẫn nhất quán.
  useEffect(() => {
    const vad = vadRef.current;
    if (!vad) return;
    const shouldMute = sending || audioPlaying;
    if (shouldMute && vad.isListening()) {
      void vad.pause();
      setSpeaking(false);
    } else if (
      !shouldMute &&
      listenMode === "active" &&
      !vad.isListening()
    ) {
      void vad.start();
    }
  }, [sending, audioPlaying, listenMode]);

  // Khi đóng dialog, tự động dừng nghe.
  useEffect(() => {
    if (!open && listenMode === "active") {
      void stopListening();
    }
  }, [open, listenMode, stopListening]);

  // Kết thúc hoàn toàn 1 phiên: dừng VAD, tắt audio, đóng session ở BE,
  // xoá sessionId để lần mở sau là phiên mới, và đóng dialog.
  const endConversation = useCallback(async () => {
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
    cancelFlushTimer();
    pendingSegmentsRef.current = [];
    setListenMode("off");
    setSpeaking(false);

    const vad = vadRef.current;
    vadRef.current = null;
    if (vad) {
      try {
        await vad.destroy();
      } catch {
        /* ignore */
      }
    }
    stopAudio();

    const idToClose = sessionId;
    setSessionId(null);
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setMessages([]);
    setInitStatus("idle");
    setOpen(false);

    if (idToClose) {
      try {
        await apiClient.learner.timi.closeSession(idToClose);
      } catch {
        /* best-effort, không cần báo user */
      }
    }
  }, [sessionId, stopAudio, cancelFlushTimer]);

  useEffect(() => {
    endConversationRef.current = endConversation;
  }, [endConversation]);

  useEffect(() => {
    return () => {
      const vad = vadRef.current;
      vadRef.current = null;
      if (vad) {
        void vad.destroy();
      }
      stopAudio();
      if (endTimerRef.current) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingSegmentsRef.current = [];
    };
  }, [stopAudio]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      pointerOffsetX: e.clientX - rect.left,
      pointerOffsetY: e.clientY - rect.top,
      moved: false,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const state = dragStateRef.current;
    if (state.pointerId === null) return;
    const dx = e.clientX - state.startClientX;
    const dy = e.clientY - state.startClientY;
    if (!state.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      state.moved = true;
      setDragging(true);
    }
    if (state.moved) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPos({
        x: clamp(e.clientX - state.pointerOffsetX, 0, w - BUBBLE_SIZE),
        y: clamp(e.clientY - state.pointerOffsetY, 0, h - BUBBLE_SIZE),
      });
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const state = dragStateRef.current;
    if (state.pointerId === null) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const wasMoved = state.moved;
    dragStateRef.current = {
      pointerId: null,
      startClientX: 0,
      startClientY: 0,
      pointerOffsetX: 0,
      pointerOffsetY: 0,
      moved: false,
    };
    setDragging(false);
    if (!wasMoved) {
      setOpen((prev) => !prev);
    }
  }, []);

  const dialogPos = (() => {
    if (!mounted || viewport.w === 0) {
      return { left: 0, top: 0, width: DIALOG_WIDTH, height: DIALOG_HEIGHT };
    }
    const isMobile = viewport.w < 480;
    const width = isMobile ? viewport.w - SAFE_MARGIN * 2 : DIALOG_WIDTH;
    const height = isMobile
      ? Math.min(DIALOG_HEIGHT, viewport.h - SAFE_MARGIN * 2 - BUBBLE_SIZE - 12)
      : DIALOG_HEIGHT;

    const GAP = 6;
    const bubbleCenterX = pos.x + BUBBLE_SIZE / 2;
    const bubbleCenterY = pos.y + BUBBLE_SIZE / 2;

    let left =
      bubbleCenterX > viewport.w / 2 ? pos.x + BUBBLE_SIZE - width : pos.x;
    let top =
      bubbleCenterY > viewport.h / 2
        ? pos.y - height - GAP
        : pos.y + BUBBLE_SIZE + GAP;

    left = clamp(left, SAFE_MARGIN, viewport.w - width - SAFE_MARGIN);
    top = clamp(top, SAFE_MARGIN, viewport.h - height - SAFE_MARGIN);

    return { left, top, width, height };
  })();

  if (!mounted) return null;

  const hintOnLeft = pos.x + BUBBLE_SIZE / 2 > viewport.w / 2;
  const isAnonymous = initStatus === "anonymous";

  return (
    <>
      <div
        ref={bubbleRef}
        role="button"
        aria-label={open ? "Đóng cửa sổ chat" : "Mở cửa sổ chat"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
          zIndex: 2147483646,
          touchAction: "none",
          cursor: dragging ? "grabbing" : "pointer",
          userSelect: "none",
          transition: dragging ? "none" : "transform 0.18s ease",
          transform: dragging ? "scale(1.08)" : "scale(1)",
          background: "transparent",
        }}
      >
        <div
          ref={lottieContainerRef}
          className="w-full h-full pointer-events-none"
        />

        <AnimatePresence>
          {showHint && !open && !dragging && (
            <motion.div
              key="chatbot-hint"
              initial={{ opacity: 0, scale: 0.85, x: hintOnLeft ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: hintOnLeft ? 8 : -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: "22%",
                ...(hintOnLeft
                  ? { right: BUBBLE_SIZE - 6 }
                  : { left: BUBBLE_SIZE - 6 }),
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
              className="rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.18)] ring-1 ring-black/5 dark:bg-slate-800 dark:text-slate-100 dark:ring-white/10"
            >
              {HINT_TEXT}
              <span
                aria-hidden
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-white ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10"
                style={
                  hintOnLeft
                    ? {
                        right: -6,
                        clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                      }
                    : { left: -6, clipPath: "polygon(0 0, 100% 0, 0 100%)" }
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: dialogPos.left,
              top: dialogPos.top,
              width: dialogPos.width,
              height: dialogPos.height,
              zIndex: 2147483645,
            }}
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <header className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-base font-semibold">
                T
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">
                  Timi - Cô Trai IT
                </p>
                <p className="text-xs opacity-80">
                  Luyện Speaking theo chủ đề với Timi cute nhé !!!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVoiceMuted((v) => !v)}
                className="rounded-lg px-2 py-1 text-xs transition hover:bg-white/15"
                title={voiceMuted ? "Bật giọng nói" : "Tắt giọng nói"}
              >
                {voiceMuted ? "🔇" : "🔊"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 transition hover:bg-white/15"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-3 dark:bg-slate-800/40">
              {isAnonymous && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
                  Bạn cần đăng nhập để bắt đầu trò chuyện cùng Timi.
                </div>
              )}

              {initStatus === "loading" && messages.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                  <Loader2 className="animate-spin" size={16} /> Timi đang chuẩn
                  bị...
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "rounded-br-sm bg-blue-600 text-white"
                          : "rounded-bl-sm border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      }`}
                    >
                      {m.content}
                    </div>

                    {m.role === "bot" && m.audioDataUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (audioPlayerRef.current) {
                            audioPlayerRef.current.pause();
                          }
                          const audio = new Audio(m.audioDataUrl!);
                          audioPlayerRef.current = audio;
                          // Đồng bộ cờ audioPlaying để VAD half-duplex
                          // gate cũng pause mic trong lúc user "Nghe lại".
                          setAudioPlaying(true);
                          const clearPlaying = () => setAudioPlaying(false);
                          audio.addEventListener("ended", clearPlaying, {
                            once: true,
                          });
                          audio.addEventListener("error", clearPlaying, {
                            once: true,
                          });
                          void audio.play().catch(() => {
                            setAudioPlaying(false);
                          });
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-300"
                      >
                        🔊 Nghe lại
                      </button>
                    )}

                    {m.microCorrection && (
                      <div className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100">
                        <span className="line-through opacity-70">
                          {m.microCorrection.wrong}
                        </span>{" "}
                        →{" "}
                        <span className="font-semibold">
                          {m.microCorrection.right}
                        </span>
                        {m.microCorrection.tip && (
                          <div className="mt-0.5 italic opacity-90">
                            {m.microCorrection.tip}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {(sending || speaking || listenMode !== "off") && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {sending ? (
                      <>
                        <Loader2 className="animate-spin" size={12} />
                        Timi đang suy nghĩ...
                      </>
                    ) : speaking ? (
                      <>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                        Đang nghe bạn nói...
                      </>
                    ) : listenMode === "loading" ? (
                      <>
                        <Loader2 className="animate-spin" size={12} />
                        Đang chuẩn bị micro...
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                        Timi đang chờ — cứ nói tự nhiên
                      </>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="flex flex-col items-center justify-center gap-2 border-t border-slate-200 bg-white px-3 py-4 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={toggleListening}
                disabled={isAnonymous || listenMode === "loading"}
                className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  listenMode === "active"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
                aria-label={
                  listenMode === "active"
                    ? "Tắt micro"
                    : listenMode === "loading"
                    ? "Đang bật micro"
                    : "Bật micro để nói với Timi"
                }
                title={
                  listenMode === "active"
                    ? "Đang nghe — bấm để tắt"
                    : listenMode === "loading"
                    ? "Đang bật micro..."
                    : "Bấm để bật micro (nói tự do, dừng tự gửi)"
                }
              >
                {listenMode === "active" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />
                )}
                {listenMode === "loading" ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : listenMode === "active" ? (
                  <Square size={26} />
                ) : (
                  <Mic size={28} />
                )}
              </button>
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                {isAnonymous
                  ? "Đăng nhập để bắt đầu nói với Timi"
                  : listenMode === "active"
                  ? speaking
                    ? "Đang nghe... cứ nói thoải mái"
                    : "Cứ nói — Timi sẽ tự gửi khi bạn dừng"
                  : listenMode === "loading"
                  ? "Đang bật micro..."
                  : "Bấm để bắt đầu nói"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
