"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Eye,
  Layers3,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  Repeat,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
  Headphones,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";

type SpeakingResult = {
  overallScore?: number;
  criteria?: {
    pronunciation?: number;
    fluency?: number;
    grammar?: number;
    vocabulary?: number;
    relevance?: number;
  };
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  evidence?: string[];
  actionPlan?: string[];
  improvements?: string[];
  betterAnswer?: string;
};

type SpeakingTask = {
  id: string;
  code?: string;
  title?: string;
  prompt?: string;
  taskType?: string;
  targetSeconds?: number | null;
  tips?: string[];
};

type SpeakingSetItem = {
  id: string;
  sortOrder?: number;
  task?: SpeakingTask;
};

type SpeakingSetDetail = {
  id: string;
  code?: string;
  title?: string;
  totalQuestions?: number;
  timeLimitSec?: number | null;
  items?: SpeakingSetItem[];
};

type ItemFeedback = {
  loading: boolean;
  rawText: string | null;
  parsed: SpeakingResult | null;
};

function extractList(raw: any): any[] {
  const data = raw?.data?.data ?? raw?.data ?? raw;
  return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
}

function extractData(raw: any): any {
  return raw?.data?.data ?? raw?.data ?? raw;
}

type ShadowingItem = {
  id: string;
  title: string;
  youtubeId?: string;
  level?: string;
  topics?: string[];
  durationSec?: number;
  practiceCount?: number;
  segmentCount?: number;
  thumbnailUrl?: string | null;
};

type ShadowingSegment = {
  order: number;
  startSec: number;
  endSec: number;
  textEn: string;
  textVi?: string | null;
  ipa?: string | null;
};

function unwrapShadowingList(payload: any): { items: ShadowingItem[]; total: number; page: number; limit: number } {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  const items = (data?.items ?? data?.data ?? []) as ShadowingItem[];
  const total = Number(data?.total ?? items.length ?? 0) || 0;
  const page = Number(data?.page ?? 1) || 1;
  const limit = Number(data?.limit ?? 12) || 12;
  return { items, total, page, limit };
}

function fmtDuration(sec?: number): string {
  const s = Math.max(0, Math.floor(Number(sec ?? 0) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function parseAiJson(text: string): SpeakingResult | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function toPercent(score?: number): number {
  const n = Number(score ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round((n / 200) * 100)));
}

const SPEAKING_PART_LABEL: Record<string, string> = {
  read_aloud: "Part 1 - Read aloud",
  describe_picture: "Part 2 - Describe a picture",
  respond_to_questions: "Part 3 - Respond to questions",
  respond_using_info: "Part 4 - Respond using info",
  express_opinion: "Part 5 - Express an opinion",
  respond_to_question: "Part 6 - Respond to question",
};
const SPEAKING_BAR_COUNT = 140;
const SPEAKING_BAR_MIN = 0;

function formatCountdown(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SpeakingPage() {
  const { notify } = useToast();

  const [skillTab, setSkillTab] = useState<"speaking" | "shadowing">("speaking");
  const [setsLoading, setSetsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sets, setSets] = useState<SpeakingSetDetail[]>([]);
  const [viewMode, setViewMode] = useState<"sets" | "practice">("sets");
  const [setKeyword, setSetKeyword] = useState("");
  const [setId, setSetId] = useState("");
  const [setDetail, setSetDetail] = useState<SpeakingSetDetail | null>(null);
  const [itemId, setItemId] = useState("");
  const [timerSetId, setTimerSetId] = useState("");
  const [examRemainingSec, setExamRemainingSec] = useState<number | null>(null);

  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startAtRef = useRef<number | null>(null);
  const recogRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [audioBars, setAudioBars] = useState<number[]>(
    () => Array.from({ length: SPEAKING_BAR_COUNT }, () => SPEAKING_BAR_MIN),
  );

  const [transcriptByItem, setTranscriptByItem] = useState<Record<string, string>>({});
  const [feedbackByItem, setFeedbackByItem] = useState<Record<string, ItemFeedback>>({});
  const activeItemIdRef = useRef("");
  const timeUpNotifiedRef = useRef(false);

  const [shadowKeyword, setShadowKeyword] = useState("");
  const [shadowLevel, setShadowLevel] = useState("");
  const [shadowSort, setShadowSort] = useState("most-practiced");
  const [shadowTopic, setShadowTopic] = useState("");
  const [shadowPage, setShadowPage] = useState(1);
  const [shadowLoading, setShadowLoading] = useState(false);
  const [shadowError, setShadowError] = useState<string | null>(null);
  const [shadowItems, setShadowItems] = useState<ShadowingItem[]>([]);
  const [shadowTotal, setShadowTotal] = useState(0);
  const shadowLimit = 12;
  const [shadowView, setShadowView] = useState<"list" | "detail">("list");
  const [shadowSelectedId, setShadowSelectedId] = useState("");
  const [shadowDetailLoading, setShadowDetailLoading] = useState(false);
  const [shadowContent, setShadowContent] = useState<ShadowingItem | null>(null);
  const [shadowSegments, setShadowSegments] = useState<ShadowingSegment[]>([]);
  const [shadowShowIpa, setShadowShowIpa] = useState(true);
  const [shadowShowVi, setShadowShowVi] = useState(true);
  const [shadowAutoPlay, setShadowAutoPlay] = useState(false);
  const [shadowSpeed, setShadowSpeed] = useState("1x");
  const [shadowShowMedia, setShadowShowMedia] = useState(true);
  const [shadowActiveSeg, setShadowActiveSeg] = useState(0);
  const [shadowSegPage, setShadowSegPage] = useState(1);
  const shadowSegPageSize = 10;
  const [shadowRecRecording, setShadowRecRecording] = useState(false);
  const [shadowRecTranscript, setShadowRecTranscript] = useState("");
  const [shadowRecAudioUrl, setShadowRecAudioUrl] = useState<string | null>(null);
  const [shadowRecScoring, setShadowRecScoring] = useState(false);
  const [shadowRecScore, setShadowRecScore] = useState<number | null>(null);
  const [shadowRecDetailOpen, setShadowRecDetailOpen] = useState(false);
  const [shadowRecAiSummary, setShadowRecAiSummary] = useState<string | null>(null);
  const [shadowWordAnalysis, setShadowWordAnalysis] = useState<
    Array<{ word: string; refWord: string; ok: boolean; refIpa?: string | null; userIpa?: string | null; accuracy: number }>
  >([]);

  const shadowMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const shadowMediaChunksRef = useRef<BlobPart[]>([]);
  const shadowSpeechRef = useRef<any>(null);
  const shadowYtPlayerRef = useRef<any>(null);
  const shadowYtReadyRef = useRef(false);
  const shadowYtTickRef = useRef<number | null>(null);
  const shadowActiveSegRef = useRef(0);
  const shadowAutoPlayRef = useRef(false);
  const shadowSpeedRef = useRef("1x");

  useEffect(() => {
    shadowActiveSegRef.current = shadowActiveSeg;
  }, [shadowActiveSeg]);

  useEffect(() => {
    shadowAutoPlayRef.current = shadowAutoPlay;
  }, [shadowAutoPlay]);

  useEffect(() => {
    shadowSpeedRef.current = shadowSpeed;
    const player = shadowYtPlayerRef.current;
    if (!player || !shadowYtReadyRef.current) return;
    const rate = Number(String(shadowSpeed).replace("x", "")) || 1;
    try {
      player.setPlaybackRate(rate);
    } catch {}
  }, [shadowSpeed]);

  function ensureYoutubeApi(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    const w = window as any;
    if (w.YT?.Player) return Promise.resolve();
    if (w.__ytApiPromise) return w.__ytApiPromise;
    w.__ytApiPromise = new Promise<void>((resolve) => {
      const existing = document.querySelector("script[data-yt-iframe-api]");
      if (existing) {
        const t = window.setInterval(() => {
          if ((window as any).YT?.Player) {
            window.clearInterval(t);
            resolve();
          }
        }, 50);
        return;
      }
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.dataset.ytIframeApi = "1";
      (document.head || document.body).appendChild(s);
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        try {
          prev?.();
        } catch {}
        resolve();
      };
    });
    return w.__ytApiPromise;
  }

  function clearYtTick() {
    if (shadowYtTickRef.current != null) {
      window.clearInterval(shadowYtTickRef.current);
      shadowYtTickRef.current = null;
    }
  }

  function playSegmentOnly(index: number) {
    const player = shadowYtPlayerRef.current;
    const seg = shadowSegments[index];
    if (!player || !seg) return;
    clearYtTick();
    const rate = Number(String(shadowSpeedRef.current).replace("x", "")) || 1;
    try {
      player.setPlaybackRate(rate);
    } catch {}
    try {
      player.seekTo(Math.max(0, seg.startSec), true);
      player.playVideo();
    } catch {}
    // Pause exactly at endSec
    shadowYtTickRef.current = window.setInterval(() => {
      try {
        const t = Number(player.getCurrentTime?.() ?? 0) || 0;
        if (t >= Math.max(seg.startSec + 0.15, seg.endSec - 0.05)) {
          player.pauseVideo?.();
          clearYtTick();
        }
      } catch {}
    }, 120);
  }

  function playSegmentAuto(index: number) {
    const player = shadowYtPlayerRef.current;
    const seg = shadowSegments[index];
    if (!player || !seg) return;
    clearYtTick();
    const rate = Number(String(shadowSpeedRef.current).replace("x", "")) || 1;
    try {
      player.setPlaybackRate(rate);
    } catch {}
    try {
      player.seekTo(Math.max(0, seg.startSec), true);
      player.playVideo();
    } catch {}
    shadowYtTickRef.current = window.setInterval(() => {
      try {
        const t = Number(player.getCurrentTime?.() ?? 0) || 0;
        if (t >= Math.max(seg.startSec + 0.15, seg.endSec - 0.05)) {
          const next = index + 1;
          if (!shadowAutoPlayRef.current) {
            player.pauseVideo?.();
            clearYtTick();
            return;
          }
          if (next >= shadowSegments.length) {
            player.pauseVideo?.();
            clearYtTick();
            return;
          }
          setShadowActiveSeg(next);
          // next tick will be handled by effect below
          clearYtTick();
        }
      } catch {}
    }, 120);
  }

  function normWords(text: string): string[] {
    return String(text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);
  }

  function alignWords(ref: string[], hyp: string[]) {
    const n = ref.length;
    const m = hyp.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    const bt: Array<Array<"eq" | "sub" | "ins" | "del">> = Array.from({ length: n + 1 }, () =>
      Array(m + 1).fill("eq"),
    );
    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
        const del = dp[i - 1][j] + 1;
        const ins = dp[i][j - 1] + 1;
        const sub = dp[i - 1][j - 1] + cost;
        const best = Math.min(del, ins, sub);
        dp[i][j] = best;
        bt[i][j] = best === sub ? (cost === 0 ? "eq" : "sub") : best === del ? "del" : "ins";
      }
    }
    const pairs: Array<{ ref?: string; hyp?: string; ok: boolean }> = [];
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      const step = bt[i][j];
      if (i > 0 && j > 0 && (step === "eq" || step === "sub")) {
        pairs.push({ ref: ref[i - 1], hyp: hyp[j - 1], ok: step === "eq" });
        i--;
        j--;
      } else if (i > 0 && (j === 0 || step === "del")) {
        pairs.push({ ref: ref[i - 1], hyp: undefined, ok: false });
        i--;
      } else {
        pairs.push({ ref: undefined, hyp: hyp[j - 1], ok: false });
        j--;
      }
    }
    pairs.reverse();
    return pairs;
  }

  function splitIpaWords(ipa?: string | null): string[] {
    const t = String(ipa ?? "").trim();
    if (!t) return [];
    return t.split(/\s+/).filter(Boolean);
  }

  async function startShadowRecording() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    setShadowRecTranscript("");
    setShadowRecAiSummary(null);
    setShadowRecScore(null);
    setShadowWordAnalysis([]);

    // Stop previous
    try {
      shadowSpeechRef.current?.stop?.();
    } catch {}
    try {
      shadowMediaRecorderRef.current?.stop?.();
    } catch {}

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    shadowMediaRecorderRef.current = recorder;
    shadowMediaChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) shadowMediaChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(shadowMediaChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setShadowRecAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    };
    recorder.start();

    // Speech recognition (transcript)
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recog = new SR();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";
      recog.onresult = (event: any) => {
        let text = "";
        for (let k = 0; k < event.results.length; k++) text += `${event.results[k]?.[0]?.transcript ?? ""} `;
        setShadowRecTranscript(text.trim());
      };
      shadowSpeechRef.current = recog;
      try {
        recog.start();
      } catch {}
    }

    setShadowRecRecording(true);
  }

  async function stopShadowRecording() {
    try {
      shadowSpeechRef.current?.stop?.();
    } catch {}
    try {
      shadowMediaRecorderRef.current?.stop?.();
    } catch {}
    setShadowRecRecording(false);
  }

  async function scoreShadowRecording(referenceText: string) {
    const transcript = shadowRecTranscript.trim();
    if (!transcript) {
      notify({ variant: "warning", title: "Chưa có transcript", message: "Hãy ghi âm lại để có transcript trước khi chấm." });
      return;
    }
    setShadowRecScoring(true);
    try {
      const res = await apiClient.learner.ai.gradeSpeaking({
        prompt: referenceText,
        transcript,
        language: "en",
        taskType: "shadowing",
      });
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? res;
      const result = data?.result ?? null;
      const scoreRaw = Number(result?.criteria?.pronunciation ?? result?.overallScore ?? 0) || 0;
      const score100 = Math.max(0, Math.min(100, Math.round((scoreRaw / 200) * 100 || scoreRaw)));
      setShadowRecScore(score100);
      setShadowRecAiSummary(String(result?.summary ?? "").trim() || null);

      // Word-level analysis (heuristic) to match sample UI
      const refWords = normWords(referenceText);
      const hypWords = normWords(transcript);
      const pairs = alignWords(refWords, hypWords);
      const refIpaWords = splitIpaWords((shadowSegments[shadowActiveSeg] as any)?.ipa ?? null);
      const items = pairs
        .filter((p) => p.ref || p.hyp)
        .map((p, idx) => {
          const refWord = p.ref ?? "";
          const word = p.hyp ?? "";
          const ok = Boolean(p.ok);
          const refIpa = refIpaWords[idx] ?? null;
          const accuracy = ok ? 100 : word && refWord ? 60 : 0;
          return { word: word || "(trống)", refWord: refWord || "(thiếu)", ok, refIpa, userIpa: null, accuracy };
        });
      setShadowWordAnalysis(items);
      setShadowRecDetailOpen(true);
    } catch (e: any) {
      notify({ variant: "error", title: "Chấm thất bại", message: e?.message ?? "Vui lòng thử lại." });
    } finally {
      setShadowRecScoring(false);
    }
  }

  useEffect(() => {
    if (skillTab === "shadowing") {
      stopRecord();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillTab]);

  async function loadShadowing(nextPage = shadowPage) {
    setShadowLoading(true);
    setShadowError(null);
    try {
      const res = await apiClient.learner.shadowing.list({
        page: nextPage,
        limit: shadowLimit,
        keyword: shadowKeyword.trim() || undefined,
        level: shadowLevel || undefined,
        topic: shadowTopic || undefined,
        sort: shadowSort || undefined,
      });
      const unwrapped = unwrapShadowingList(res);
      setShadowItems(unwrapped.items ?? []);
      setShadowTotal(unwrapped.total ?? 0);
      setShadowPage(unwrapped.page ?? nextPage);
    } catch (e: any) {
      setShadowItems([]);
      setShadowTotal(0);
      setShadowError(e?.message ?? "Không tải được danh sách Shadowing.");
    } finally {
      setShadowLoading(false);
    }
  }

  async function loadShadowingDetail(contentId: string) {
    if (!contentId) return;
    setShadowDetailLoading(true);
    setShadowError(null);
    try {
      const res = await apiClient.learner.shadowing.getDetail(contentId);
      const data = extractData(res);
      const c = (data?.content ?? data) as any;
      const segs = (data?.segments ?? []) as any[];
      setShadowContent({
        id: String(c?.id ?? contentId),
        title: String(c?.title ?? "Shadowing"),
        youtubeId: c?.youtubeId ? String(c.youtubeId) : undefined,
        level: c?.level ? String(c.level) : undefined,
        topics: Array.isArray(c?.topics) ? c.topics : [],
        durationSec: Number(c?.durationSec ?? 0) || 0,
        practiceCount: Number(c?.practiceCount ?? 0) || 0,
        segmentCount: Number(c?.segmentCount ?? 0) || 0,
        thumbnailUrl: c?.thumbnailUrl ?? null,
      });
      setShadowSegments(
        segs
          .map((s) => ({
            order: Number(s.order) || 0,
            startSec: Number(s.startSec) || 0,
            endSec: Number(s.endSec) || 0,
            textEn: String(s.textEn ?? ""),
            textVi: s.textVi == null ? null : String(s.textVi),
            ipa: s.ipa == null ? null : String(s.ipa),
          }))
          .filter((x) => x.order > 0)
          .sort((a, b) => a.order - b.order),
      );
      setShadowSegPage(1);
      setShadowActiveSeg(0);
    } catch (e: any) {
      setShadowContent(null);
      setShadowSegments([]);
      setShadowError(e?.message ?? "Không tải được chi tiết Shadowing.");
    } finally {
      setShadowDetailLoading(false);
    }
  }

  useEffect(() => {
    if (skillTab !== "shadowing") return;
    setShadowPage(1);
    void loadShadowing(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillTab, shadowKeyword, shadowLevel, shadowSort, shadowTopic]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skillTab !== "shadowing" || shadowView !== "detail") return;
    if (!shadowContent?.youtubeId) return;

    let cancelled = false;
    void (async () => {
      await ensureYoutubeApi();
      if (cancelled) return;
      const w = window as any;
      const mountId = "shadowing-yt-player";
      const el = document.getElementById(mountId);
      if (!el) return;

      // Create once per content
      if (shadowYtPlayerRef.current) return;
      shadowYtReadyRef.current = false;
      shadowYtPlayerRef.current = new w.YT.Player(mountId, {
        videoId: shadowContent.youtubeId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            shadowYtReadyRef.current = true;
            const rate = Number(String(shadowSpeedRef.current).replace("x", "")) || 1;
            try {
              shadowYtPlayerRef.current?.setPlaybackRate?.(rate);
            } catch {}
          },
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [skillTab, shadowView, shadowContent?.youtubeId]);

  useEffect(() => {
    if (skillTab !== "shadowing" || shadowView !== "detail") return;
    if (!shadowYtReadyRef.current || !shadowYtPlayerRef.current) return;
    const idx = shadowActiveSeg;
    if (idx < 0 || idx >= shadowSegments.length) return;
    if (shadowAutoPlay) {
      playSegmentAuto(idx);
    }
  }, [skillTab, shadowView, shadowActiveSeg, shadowAutoPlay, shadowSegments.length]);

  useEffect(() => {
    if (skillTab !== "shadowing" || shadowView !== "detail") return;
    return () => {
      if (typeof window !== "undefined") {
        clearYtTick();
      }
      try {
        shadowYtPlayerRef.current?.destroy?.();
      } catch {}
      shadowYtPlayerRef.current = null;
      shadowYtReadyRef.current = false;
    };
  }, [skillTab, shadowView]);

  const sortedItems = useMemo(() => {
    const items = (setDetail?.items ?? []).slice();
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return items;
  }, [setDetail]);

  const itemOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    sortedItems.forEach((it, idx) => {
      map[it.id] = idx + 1;
    });
    return map;
  }, [sortedItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, SpeakingSetItem[]> = {};
    for (const it of sortedItems) {
      const key = String(it.task?.taskType || "other");
      if (!groups[key]) groups[key] = [];
      groups[key].push(it);
    }
    return Object.entries(groups);
  }, [sortedItems]);

  const activeItem = useMemo(
    () => sortedItems.find((x) => x.id === itemId) ?? sortedItems[0] ?? null,
    [sortedItems, itemId],
  );

  const activeTask = activeItem?.task ?? null;
  const activeTranscript = itemId ? (transcriptByItem[itemId] ?? "") : "";
  const activeFeedback = itemId ? feedbackByItem[itemId] : undefined;

  const doneCount = useMemo(
    () =>
      sortedItems.filter((it) => {
        const key = it.id;
        return Boolean(feedbackByItem[key]?.parsed || transcriptByItem[key]?.trim());
      }).length,
    [sortedItems, feedbackByItem, transcriptByItem],
  );
  const isTimeUp = examRemainingSec !== null && examRemainingSec <= 0;

  const filteredSets = useMemo(() => {
    const kw = setKeyword.trim().toLowerCase();
    if (!kw) return sets;
    return sets.filter((s) => {
      const title = String(s.title ?? "").toLowerCase();
      const code = String(s.code ?? "").toLowerCase();
      return title.includes(kw) || code.includes(kw);
    });
  }, [sets, setKeyword]);

  const setsTotalQuestions = useMemo(
    () => filteredSets.reduce((sum, s) => sum + Number(s.totalQuestions ?? 0), 0),
    [filteredSets],
  );

  useEffect(() => {
    activeItemIdRef.current = itemId;
  }, [itemId]);

  useEffect(() => {
    if (viewMode !== "practice" || !setDetail?.id) return;
    const limit = Number(setDetail.timeLimitSec ?? 0) || 0;
    if (limit <= 0) {
      setExamRemainingSec(null);
      return;
    }
    if (timerSetId !== setDetail.id) {
      setTimerSetId(setDetail.id);
      setExamRemainingSec(limit);
      timeUpNotifiedRef.current = false;
      return;
    }
    if (isTimeUp) return;
    const timer = window.setInterval(() => {
      setExamRemainingSec((prev) => {
        if (prev == null) return prev;
        return Math.max(0, prev - 1);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [viewMode, setDetail?.id, setDetail?.timeLimitSec, timerSetId, isTimeUp]);

  useEffect(() => {
    if (!isTimeUp || timeUpNotifiedRef.current) return;
    timeUpNotifiedRef.current = true;
    stopRecord();
    notify({
      variant: "warning",
      title: "Hết thời gian làm bài",
      message: "Bạn đã hết thời gian. Có thể xem lại nội dung đã làm và kết quả hiện có.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeUp]);

  useEffect(() => {
    if (!listening || startAtRef.current == null) return;
    const timer = window.setInterval(() => {
      if (startAtRef.current == null) return;
      setElapsedSec(Math.max(0, Math.round((Date.now() - startAtRef.current) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [listening]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";

    recog.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += `${event.results[i]?.[0]?.transcript ?? ""} `;
      }
      const currentItemId = activeItemIdRef.current;
      if (!currentItemId) return;
      setTranscriptByItem((prev) => ({ ...prev, [currentItemId]: text.trim() }));
    };

    recog.onerror = () => {
      stopVisualizer();
      setListening(false);
    };
    recog.onend = () => {
      stopVisualizer();
      setListening(false);
    };

    recogRef.current = recog;
    return () => {
      try {
        recog.stop();
      } catch {}
      stopVisualizer();
    };
  }, []);

  async function loadSets() {
    setSetsLoading(true);
    try {
      const res = await apiClient.learner.skillTasks.listSpeakingSets({ page: 1, limit: 50 });
      const list = extractList(res) as SpeakingSetDetail[];
      setSets(list);
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được bộ đề Speaking", message: e?.message });
    } finally {
      setSetsLoading(false);
    }
  }

  async function loadSetDetail(targetSetId: string) {
    if (!targetSetId) {
      setSetDetail(null);
      setItemId("");
      return;
    }
    setDetailLoading(true);
    try {
      const res = await apiClient.learner.skillTasks.getSpeakingSet(targetSetId);
      const detail = extractData(res) as SpeakingSetDetail;
      setSetDetail(detail);
      const firstItemId = (detail?.items ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.id ?? "";
      setItemId((prev) => (prev && (detail?.items ?? []).some((x) => x.id === prev) ? prev : firstItemId));
    } catch (e: any) {
      notify({ variant: "error", title: "Không tải được chi tiết bộ đề", message: e?.message });
      setSetDetail(null);
      setItemId("");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!setId) return;
    void loadSetDetail(setId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  function startPractice(targetSetId: string) {
    if (!targetSetId) return;
    setTimerSetId("");
    setExamRemainingSec(null);
    timeUpNotifiedRef.current = false;
    setSetId(targetSetId);
    setViewMode("practice");
  }

  function setTranscriptValue(value: string) {
    if (!itemId) return;
    setTranscriptByItem((prev) => ({ ...prev, [itemId]: value }));
  }

  function resetVisualizer() {
    setAudioBars(Array.from({ length: SPEAKING_BAR_COUNT }, () => SPEAKING_BAR_MIN));
  }

  function stopVisualizer() {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    resetVisualizer();
  }

  async function startVisualizer() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    stopVisualizer();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.74;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      micStreamRef.current = stream;

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        const node = analyserRef.current;
        if (!node) return;
        node.getByteFrequencyData(freqData);
        const binsPerBar = Math.max(1, Math.floor(freqData.length / SPEAKING_BAR_COUNT));
        const nextBars = new Array<number>(SPEAKING_BAR_COUNT).fill(SPEAKING_BAR_MIN);
        for (let i = 0; i < SPEAKING_BAR_COUNT; i++) {
          const start = i * binsPerBar;
          const end = Math.min(freqData.length, start + binsPerBar);
          let sum = 0;
          let peak = 0;
          for (let j = start; j < end; j++) {
            const v = freqData[j];
            sum += v;
            if (v > peak) peak = v;
          }
          const avg = end > start ? sum / (end - start) : 0;
          const normalized = Math.max(avg / 255, (peak / 255) * 0.75);
          const boosted = Math.min(1, Math.pow(normalized, 0.8) * 1.9);
          nextBars[i] = Math.max(SPEAKING_BAR_MIN, boosted);
        }
        setAudioBars(nextBars);
        rafRef.current = window.requestAnimationFrame(tick);
      };
      tick();
    } catch {
      resetVisualizer();
    }
  }

  function startRecord() {
    if (!supported || !recogRef.current || !itemId) return;
    setFeedbackByItem((prev) => ({
      ...prev,
      [itemId]: { loading: false, rawText: null, parsed: null },
    }));
    startAtRef.current = Date.now();
    setElapsedSec(0);
    try {
      recogRef.current.start();
      void startVisualizer();
      setListening(true);
    } catch {}
  }

  function stopRecord() {
    try {
      recogRef.current?.stop();
    } catch {}
    stopVisualizer();
    setListening(false);
  }

  async function grade() {
    if (!itemId || !activeTask?.prompt) return;
    const transcript = (transcriptByItem[itemId] ?? "").trim();
    if (!transcript) {
      notify({ variant: "warning", title: "Chưa có transcript", message: "Hãy ghi âm hoặc nhập transcript trước khi chấm." });
      return;
    }

    setFeedbackByItem((prev) => ({
      ...prev,
      [itemId]: { loading: true, rawText: null, parsed: null },
    }));
    try {
      const durationSeconds =
        startAtRef.current != null ? Math.max(0, Math.round((Date.now() - startAtRef.current) / 1000)) : undefined;
      const res = await apiClient.learner.ai.gradeSpeaking({
        prompt: activeTask.prompt ?? "",
        transcript,
        durationSeconds,
        language: "vi",
        taskType: activeTask.taskType,
      });
      const text = (res as any)?.data?.text ?? (res as any)?.text ?? "";
      const parsedFromPayload = ((res as any)?.data?.result ?? (res as any)?.result ?? null) as SpeakingResult | null;
      const parsed = parsedFromPayload ?? (text ? parseAiJson(text) : null);
      setFeedbackByItem((prev) => ({
        ...prev,
        [itemId]: { loading: false, rawText: text || "", parsed },
      }));
      notify({ variant: "success", title: "Đã chấm xong", message: "Đã nhận feedback cho câu hiện tại." });
    } catch (e: any) {
      setFeedbackByItem((prev) => ({
        ...prev,
        [itemId]: { loading: false, rawText: null, parsed: null },
      }));
      notify({ variant: "error", title: "Chấm thất bại", message: e?.message || "Vui lòng thử lại." });
    }
  }

  function speakPrompt() {
    if (!activeTask?.prompt || typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(activeTask.prompt);
    u.lang = "en-US";
    synth.cancel();
    synth.speak(u);
  }

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-10">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                <Mic className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="heading-lg">{skillTab === "speaking" ? "Luyện nói" : "Luyện Shadowing"}</h1>
                {skillTab === "shadowing" && shadowView === "detail" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShadowView("list");
                      setShadowSelectedId("");
                      setShadowContent(null);
                      setShadowSegments([]);
                    }}
                    className="mt-2 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-blue-800 dark:text-[#7aa2ff] dark:hover:text-[#9bb8ff]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Quay lại
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {skillTab === "speaking" && viewMode === "practice" ? (
            <div className="relative w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white/80 px-2 py-1 sm:w-[300px] lg:w-[360px] dark:border-slate-700/60 dark:bg-slate-950/35">
              <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t border-dotted border-red-400/70" />
              <div className="grid h-14 w-full grid-cols-[repeat(140,minmax(0,1fr))] items-center gap-px">
                {audioBars.map((v, idx) => (
                  <span
                    key={idx}
                    className={`rounded-[2px] transition-all duration-75 ${listening ? "bg-red-500/95" : "bg-transparent"}`}
                    style={{ height: `${Math.max(1, Math.round(34 * v))}px` }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700/60 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => setSkillTab("speaking")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  skillTab === "speaking"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/50"
                }`}
              >
                Luyện nói
              </button>
              <button
                type="button"
                onClick={() => setSkillTab("shadowing")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  skillTab === "shadowing"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/50"
                }`}
              >
                Luyện Shadowing
              </button>
            </div>
            <span className="chip inline-flex items-center gap-1.5">
              <BookOpenCheck className="h-4 w-4" />
              {skillTab === "speaking"
                ? viewMode === "sets"
                  ? `${filteredSets.length} bộ đề`
                  : `${doneCount}/${sortedItems.length || 0} câu`
                : "0 bài"}
            </span>
            <span className="chip inline-flex items-center gap-1.5">
              {viewMode === "sets" ? <Layers3 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              {skillTab === "speaking"
                ? viewMode === "sets"
                  ? `${setsTotalQuestions} câu hỏi`
                  : examRemainingSec !== null
                    ? `Còn lại ${formatCountdown(examRemainingSec)}`
                    : listening
                      ? `${elapsedSec}s`
                      : "Sẵn sàng"
                : "Đang phát triển"}
            </span>
          </div>
        </div>
      </motion.div>

      {skillTab === "speaking" && !supported ? (
        <div className="surface mb-4 p-4 text-sm text-slate-700 dark:text-slate-200">
          Trình duyệt chưa hỗ trợ SpeechRecognition. Bạn vẫn có thể nhập transcript thủ công.
        </div>
      ) : null}

      {skillTab === "shadowing" ? (
        <section className="surface p-4">
          {shadowView === "list" ? (
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Chọn video để luyện Shadowing</p>
              <button type="button" onClick={() => void loadShadowing(1)} className="btn-secondary inline-flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4" />
                Tải lại
              </button>
            </div>
          ) : null}

          {shadowView === "list" ? (
            <>
              <div className="mb-3 grid grid-cols-1 gap-2 xl:grid-cols-[minmax(260px,1fr)_200px_220px_220px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" />
                  <input
                    value={shadowKeyword}
                    onChange={(e) => {
                      setShadowKeyword(e.target.value);
                      setShadowPage(1);
                    }}
                    placeholder="Tìm theo tên video..."
                    className="input-modern w-full pl-9"
                  />
                </div>

                <select
                  value={shadowLevel}
                  onChange={(e) => {
                    setShadowLevel(e.target.value);
                    setShadowPage(1);
                  }}
                  className="input-modern w-full"
                >
                  <option value="">Tất cả level</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                </select>

                <select
                  value={shadowSort}
                  onChange={(e) => {
                    setShadowSort(e.target.value);
                    setShadowPage(1);
                  }}
                  className="input-modern w-full"
                >
                  <option value="most-practiced">Luyện tập nhiều nhất</option>
                  <option value="newest">Mới nhất</option>
                  <option value="shortest">Ngắn nhất</option>
                </select>

                <select
                  value={shadowTopic}
                  onChange={(e) => {
                    setShadowTopic(e.target.value);
                    setShadowPage(1);
                  }}
                  className="input-modern w-full"
                >
                  <option value="">Tất cả chủ đề</option>
                  <option value="daily">Giao tiếp hằng ngày</option>
                  <option value="work">Công việc</option>
                  <option value="toeic">TOEIC</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setShadowKeyword("");
                    setShadowLevel("");
                    setShadowSort("most-practiced");
                    setShadowTopic("");
                    setShadowPage(1);
                    void loadShadowing(1);
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                >
                  ✕ Xóa bộ lọc
                </button>
              </div>

              {shadowError ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {shadowError}
                </div>
              ) : null}

              {shadowLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải...
                </div>
              ) : shadowItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200">
                  <p className="font-semibold">Chưa có video Shadowing</p>
                  <p className="mt-1 text-xs text-muted">Hãy quay lại sau khi admin đã publish nội dung.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {shadowItems.map((it) => {
                    const questionCount = Number((it as any)?.segmentCount ?? 0) || 0;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={async () => {
                          setShadowSelectedId(it.id);
                          setShadowView("detail");
                          await loadShadowingDetail(it.id);
                        }}
                        className="group overflow-hidden rounded-2xl border border-rose-200/80 bg-white text-left shadow-sm transition hover:shadow-md dark:border-rose-400/20 dark:bg-slate-950/30"
                      >
                        <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-900/60">
                          {it.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                          ) : null}
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />

                          <div className="absolute left-3 top-3 inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-black/60 px-3 py-2 text-[12px] font-extrabold text-white shadow-sm">
                              <Headphones className="h-4 w-4 text-yellow-300" />
                              {Number(it.practiceCount ?? 0) || 0}
                            </span>
                          </div>
                          <div className="absolute right-3 top-3">
                            <span className="rounded-xl bg-red-500 px-3 py-2 text-[12px] font-extrabold text-white shadow-sm">
                              {String(it.level ?? "A1")}
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          <p className="line-clamp-2 text-[1.05rem] font-extrabold leading-[1.2] text-slate-900 dark:text-slate-100">
                            {it.title}
                          </p>

                          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                                ≡
                              </span>
                              <span className="font-semibold">Level Category</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                                  ▶
                                </span>
                                <span className="font-extrabold text-blue-700 dark:text-blue-300">Youtube</span>
                              </div>

                              {questionCount > 0 ? (
                                <span className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-extrabold text-rose-600 dark:bg-rose-500/10 dark:text-rose-200">
                                  <span className="grid h-5 w-5 place-items-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200">
                                    ☰
                                  </span>
                                  {questionCount} câu
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-extrabold text-slate-600 dark:bg-slate-900/50 dark:text-slate-200">
                                  {fmtDuration(it.durationSec)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-sm text-muted">
                <span>Hiển thị {shadowItems.length} video</span>
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700/60 dark:bg-slate-950/30">
                  <button
                    type="button"
                    className="btn-secondary h-9 w-9 px-0"
                    aria-label="Trang trước"
                    disabled={shadowPage <= 1}
                    onClick={() => {
                      const next = Math.max(1, shadowPage - 1);
                      setShadowPage(next);
                      void loadShadowing(next);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{shadowPage}</span>
                  <button
                    type="button"
                    className="btn-secondary h-9 w-9 px-0"
                    aria-label="Trang sau"
                    disabled={shadowPage * shadowLimit >= shadowTotal}
                    onClick={() => {
                      const next = shadowPage + 1;
                      setShadowPage(next);
                      void loadShadowing(next);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            (() => {
              const active = shadowSegments[shadowActiveSeg] ?? null;

              // Transcript panel (right) should scroll full list like the sample.
              const totalSegPages = Math.max(1, Math.ceil(shadowSegments.length / shadowSegPageSize));
              const safeSegPage = Math.min(Math.max(1, shadowSegPage), totalSegPages);
              const pageSegs = shadowSegments;

              const fmt = (sec: number) =>
                `${Math.floor(sec / 60)}:${String(Math.max(0, sec % 60)).padStart(2, "0")}`;

              return (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(520px,1fr)_minmax(360px,0.85fr)]">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-950/30">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {shadowContent?.title ?? "Shadowing"}
                        </p>
                        <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                          <span className="font-semibold">{shadowSpeed}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
                            {shadowSegments.length} câu
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900/40">
                        {shadowDetailLoading ? (
                          <div className="flex items-center gap-2 p-4 text-sm text-slate-600 dark:text-slate-200">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải video...
                          </div>
                        ) : shadowContent?.youtubeId ? (
                          <div className="aspect-video w-full">
                            <div id="shadowing-yt-player" className="h-full w-full" />
                          </div>
                        ) : (
                          <div className="p-4 text-sm text-slate-600 dark:text-slate-200">Không có video.</div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <span className={`h-5 w-9 rounded-full p-0.5 transition ${shadowAutoPlay ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}>
                            <span className={`block h-4 w-4 rounded-full bg-white transition ${shadowAutoPlay ? "translate-x-4" : "translate-x-0"}`} />
                          </span>
                          Tự động phát
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={shadowAutoPlay}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setShadowAutoPlay(checked);
                              if (!checked) {
                                // In manual mode, stop free-running and wait for user click / Play
                                try {
                                  shadowYtPlayerRef.current?.pauseVideo?.();
                                } catch {}
                                clearYtTick();
                              } else {
                                // Start auto from current line
                                window.setTimeout(() => {
                                  playSegmentAuto(shadowActiveSegRef.current);
                                }, 0);
                              }
                            }}
                          />
                        </label>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn-secondary h-10 w-10 px-0"
                            aria-label="Câu trước"
                            title="Câu trước"
                            disabled={shadowActiveSeg <= 0}
                            onClick={() => setShadowActiveSeg((i) => Math.max(0, i - 1))}
                          >
                            <SkipBack className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary h-10 w-10 px-0"
                            aria-label="Phát"
                            title="Phát"
                            onClick={() => {
                              const idx = shadowActiveSegRef.current;
                              if (shadowAutoPlayRef.current) {
                                playSegmentAuto(idx);
                              } else {
                                playSegmentOnly(idx);
                              }
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary h-10 w-10 px-0"
                            aria-label="Dừng"
                            title="Dừng"
                            onClick={() => {
                              try {
                                shadowYtPlayerRef.current?.pauseVideo?.();
                              } catch {}
                              clearYtTick();
                            }}
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary h-10 w-10 px-0"
                            aria-label="Lặp"
                            title="Lặp"
                            onClick={() => {
                              // UI-only placeholder; without YT Player API we can't loop precisely.
                            }}
                          >
                            <Repeat className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary h-10 w-10 px-0"
                            aria-label="Câu tiếp theo"
                            title="Câu tiếp theo"
                            disabled={shadowActiveSeg >= shadowSegments.length - 1}
                            onClick={() => setShadowActiveSeg((i) => Math.min(shadowSegments.length - 1, i + 1))}
                          >
                            <SkipForward className="h-4 w-4" />
                          </button>

                          <div className="ml-1 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-200">
                            <span className="font-semibold">Tốc độ:</span>
                            <select value={shadowSpeed} onChange={(e) => setShadowSpeed(e.target.value)} className="input-modern h-10 w-[84px] py-0">
                              <option value="0.75x">0.75x</option>
                              <option value="1x">1x</option>
                              <option value="1.25x">1.25x</option>
                              <option value="1.5x">1.5x</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            className="btn-secondary inline-flex h-10 items-center gap-2 px-3"
                            onClick={() => setShadowShowMedia((v) => !v)}
                            aria-label="Show Media"
                            title="Show Media"
                          >
                            <Eye className="h-4 w-4" />
                            Show Media
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10">
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-center text-[1.02rem] font-extrabold leading-[1.35] text-slate-900 dark:text-slate-100">
                            {active?.textEn ?? "—"}
                          </p>
                          {shadowShowIpa && (active?.ipa ?? "").trim() ? (
                            <p className="mt-2 text-center text-[0.98rem] font-semibold leading-[1.35] text-sky-700 dark:text-sky-200">
                              {active?.ipa}
                            </p>
                          ) : null}
                          {shadowShowVi && (active?.textVi ?? "").trim() ? (
                            <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-200">{active?.textVi}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="btn-secondary inline-flex items-center gap-2 px-3"
                          onClick={() => setShadowShowIpa((v) => !v)}
                          aria-label="IPA"
                          title="IPA"
                        >
                          IPA
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          className="btn-primary inline-flex items-center gap-2"
                          aria-label="Phát câu"
                          onClick={() => {
                            // If the browser supports speech synthesis, read the reference sentence.
                            const text = String(active?.textEn ?? "").trim();
                            if (!text || typeof window === "undefined") return;
                            const synth = window.speechSynthesis;
                            if (!synth) return;
                            const u = new SpeechSynthesisUtterance(text);
                            u.lang = "en-US";
                            synth.cancel();
                            synth.speak(u);
                          }}
                        >
                          <Play className="h-4 w-4" />
                          PHÁT CÂU
                        </button>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                            shadowRecRecording ? "bg-red-600 hover:bg-red-500" : "bg-red-500 hover:bg-red-400"
                          }`}
                          aria-label="Ghi âm"
                          disabled={shadowRecScoring}
                          onClick={() => {
                            void (async () => {
                              if (shadowRecScoring) return;
                              const refText = String(active?.textEn ?? "").trim();
                              if (!refText) return;
                              if (!shadowRecRecording) {
                                setShadowRecTranscript("");
                                setShadowRecAudioUrl(null);
                                setShadowRecScore(null);
                                setShadowWordAnalysis([]);
                                setShadowRecAiSummary("");
                                await startShadowRecording();
                                return;
                              }
                              await stopShadowRecording();
                              await scoreShadowRecording(refText);
                            })();
                          }}
                        >
                          <Mic className="h-4 w-4" />
                          {shadowRecScoring ? "ĐANG CHẤM..." : shadowRecRecording ? "ĐANG GHI..." : "GHI ÂM"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary inline-flex items-center gap-2 border border-blue-200 bg-blue-100/70 text-blue-800 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-100"
                          onClick={() => setShadowActiveSeg((i) => Math.min(shadowSegments.length - 1, i + 1))}
                          aria-label="Câu tiếp theo"
                        >
                          <SkipForward className="h-4 w-4" />
                          CÂU TIẾP THEO
                        </button>
                      </div>

                      {shadowRecScore !== null || shadowRecTranscript.trim() ? (
                        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200">
                            <p className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Phát âm của bạn:</p>
                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-900/50 dark:text-slate-100">
                              {shadowRecTranscript.trim() || "—"}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-950/30">
                            <div className="text-center">
                              <p className="text-3xl font-extrabold text-red-500">
                                {shadowRecScore ?? 0}%
                              </p>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                                disabled={!shadowRecAudioUrl}
                                onClick={() => {
                                  if (!shadowRecAudioUrl) return;
                                  const a = new Audio(shadowRecAudioUrl);
                                  void a.play();
                                }}
                              >
                                <Play className="h-4 w-4" />
                                Nghe lại
                              </button>
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={shadowRecScore === null}
                                onClick={() => setShadowRecDetailOpen(true)}
                              >
                                Chi tiết
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-2xl border border-blue-200 bg-white/70 p-3 text-xs text-slate-600 dark:border-blue-500/20 dark:bg-slate-950/30 dark:text-slate-200">
                        <p className="mb-2 text-center font-extrabold tracking-wide text-slate-700 dark:text-slate-100">
                          PHÍM TẮT NHANH
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-900/50">
                            <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">P</p>
                            <p className="mt-1 font-semibold">Phát câu</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-900/50">
                            <p className="text-base font-extrabold text-red-600 dark:text-red-300">R</p>
                            <p className="mt-1 font-semibold">Ghi âm</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-900/50">
                            <p className="text-base font-extrabold text-blue-600 dark:text-blue-300">N</p>
                            <p className="mt-1 font-semibold">Câu tiếp theo</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Result modal */}
                    {shadowRecDetailOpen ? (
                      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
                        <button className="absolute inset-0 bg-black/45" onClick={() => setShadowRecDetailOpen(false)} aria-label="close result" />
                        <div className="relative flex w-full max-w-[980px] max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-950/95">
                          <div className="sticky top-0 z-10 flex items-center justify-between bg-blue-700 px-4 py-3 text-white">
                            <div className="flex items-center gap-2 font-extrabold">
                              <span className="text-lg">Kết quả phát âm</span>
                            </div>
                            <button type="button" className="text-white/90 hover:text-white" onClick={() => setShadowRecDetailOpen(false)} aria-label="close">
                              ✕
                            </button>
                          </div>

                          <div className="min-h-0 flex-1 overflow-auto p-4">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
                              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-950/30">
                                <div className="grid place-items-center">
                                  <div className="grid h-28 w-28 place-items-center rounded-full bg-blue-600 text-white">
                                    <div className="text-center">
                                      <div className="text-4xl font-extrabold">{shadowRecScore ?? 0}</div>
                                      <div className="text-xs font-bold opacity-90">/100</div>
                                    </div>
                                  </div>
                                  <p className="mt-3 text-center text-lg font-extrabold text-red-500">
                                    {shadowRecScore != null && shadowRecScore >= 80 ? "Rất tốt" : "Cần luyện tập nhiều hơn"}
                                  </p>
                                  <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-300">Điểm phát âm của bạn</p>
                                </div>
                              </div>

                              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-950/30">
                                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Độ chính xác:</p>
                                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900/50">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"
                                    style={{ width: `${shadowRecScore ?? 0}%` }}
                                  />
                                </div>
                                <p className="mt-2 text-right text-sm font-bold text-slate-600 dark:text-slate-200">
                                  {shadowRecScore ?? 0}%
                                </p>
                                {shadowRecAiSummary ? (
                                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Nhận xét</p>
                                    <p className="mt-1 max-h-20 overflow-auto text-xs leading-relaxed text-slate-600 dark:text-slate-200">
                                      {shadowRecAiSummary}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-4">
                              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">So sánh văn bản và phiên âm</p>
                              <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-950/30">
                                  <p className="font-extrabold text-emerald-600">Văn bản gốc</p>
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {normWords(String(active?.textEn ?? "")).map((w, i) => {
                                      const ok = shadowWordAnalysis.find((x) => x.refWord === w)?.ok ?? true;
                                      const cls = ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
                                      return (
                                        <span key={`${w}-${i}`} className={`rounded-md px-2 py-1 text-xs font-bold ${cls}`}>
                                          {w}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  {shadowShowIpa && (active?.ipa ?? "").trim() ? (
                                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200">
                                      [{active?.ipa}]
                                    </div>
                                  ) : null}
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-950/30">
                                  <p className="font-extrabold text-sky-600">Phát âm của bạn</p>
                                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-100">
                                    {shadowRecTranscript.trim() || "—"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-950/30">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Phân tích từng từ</p>
                              </div>
                              <div className="mt-3 space-y-2">
                                {shadowWordAnalysis.slice(0, 40).map((row, idx) => (
                                  <div key={idx} className="grid grid-cols-[40px_1fr_1fr_1fr] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700/60 dark:bg-slate-950/30">
                                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <p className="font-extrabold text-slate-900 dark:text-slate-100">{row.refWord}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-300">Chuẩn</p>
                                    </div>
                                    <div>
                                      <p className={`font-extrabold ${row.ok ? "text-emerald-600" : "text-rose-600"}`}>{row.word}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-300">Bạn phát âm</p>
                                    </div>
                                    <div className="justify-self-end">
                                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-100">
                                        IPA: {row.refIpa ?? "—"}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 flex items-center justify-end gap-2">
                                <button type="button" className="btn-secondary" onClick={() => setShadowRecDetailOpen(false)}>
                                  Đóng
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-950/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
                          CC
                        </span>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Transcript</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={`btn-secondary inline-flex items-center gap-2 px-3 ${shadowShowIpa ? "" : "opacity-80"}`}
                          onClick={() => setShadowShowIpa((v) => !v)}
                        >
                          Tắt phiên âm
                        </button>
                        <button
                          type="button"
                          className={`btn-secondary inline-flex items-center gap-2 px-3 ${shadowShowVi ? "" : "opacity-80"}`}
                          onClick={() => setShadowShowVi((v) => !v)}
                        >
                          Dịch tiếng Việt
                        </button>
                      </div>
                    </div>

                    {shadowDetailLoading ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-200">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải captions...
                      </div>
                    ) : shadowSegments.length === 0 ? (
                      <div className="mt-3 text-sm text-slate-600 dark:text-slate-200">Chưa có captions.</div>
                    ) : (
                      <>
                        <div className="mt-3 max-h-[620px] space-y-2 overflow-auto pr-1">
                          {pageSegs.map((seg) => {
                            const index = shadowSegments.findIndex((x) => x.order === seg.order);
                            const isActive = index === shadowActiveSeg;
                            return (
                              <button
                                key={seg.order}
                                type="button"
                                onClick={() => {
                                  const nextIdx = index >= 0 ? index : 0;
                                  setShadowActiveSeg(nextIdx);
                                  // Only play 1 line when autoPlay is OFF
                                  if (!shadowAutoPlayRef.current) {
                                    // delay a tick to allow state settle
                                    window.setTimeout(() => playSegmentOnly(nextIdx), 0);
                                  }
                                }}
                                className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                                  isActive
                                    ? "border-blue-300 bg-blue-50 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/10"
                                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/55"
                                }`}
                              >
                                <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                                  <span className="font-semibold">#{seg.order}</span>
                                  <span>
                                    {fmt(seg.startSec)} → {fmt(seg.endSec)}
                                  </span>
                                </div>
                                <p className={`leading-relaxed ${isActive ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-800 dark:text-slate-100"}`}>
                                  {seg.textEn}
                                </p>
                                {shadowShowIpa && (seg.ipa || "").trim() ? (
                                  <p className="mt-1 text-xs font-semibold text-sky-700 dark:text-sky-200">{seg.ipa}</p>
                                ) : null}
                                {shadowShowVi && (seg.textVi || "").trim() ? (
                                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-200">
                                    {seg.textVi}
                                  </p>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>

                        {/* pagination removed; transcript uses scroll like sample */}
                      </>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </section>
      ) : viewMode === "sets" ? (
        <section className="surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Chọn bộ đề Speaking đã xuất bản</p>
              <p className="text-xs text-muted">Learner chọn bộ đề trước, sau đó vào làm từng câu theo part.</p>
            </div>
            <button type="button" onClick={() => void loadSets()} className="btn-secondary inline-flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(260px,1fr)_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" />
              <input
                value={setKeyword}
                onChange={(e) => setSetKeyword(e.target.value)}
                placeholder="Tìm theo tên bộ đề hoặc mã đề"
                className="input-modern w-full pl-9"
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200">
              {filteredSets.length} bộ đề
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200">
              {setsTotalQuestions} câu hỏi
            </div>
          </div>

          {setsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải bộ đề...
            </div>
          ) : sets.length === 0 ? (
            <p className="text-sm text-muted">Hiện chưa có bộ đề Speaking nào ở trạng thái published.</p>
          ) : filteredSets.length === 0 ? (
            <p className="text-sm text-muted">Không tìm thấy bộ đề phù hợp từ khóa.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSets.map((s) => (
                <div key={s.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-950/30">
                  <div className="h-1 w-full bg-gradient-to-r from-violet-400 via-indigo-500 to-blue-500" />
                  <div className="p-2.5">
                  <p className="truncate font-mono text-xs text-muted">{s.code || "SPEAKING SET"}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{s.title || "Bộ đề Speaking"}</p>
                  <p className="mt-2 text-xs text-muted">
                    {(s.totalQuestions ?? 0)} câu • {Math.round((Number(s.timeLimitSec ?? 0) || 0) / 60)} phút
                  </p>
                  <div className="mt-3">
                    <button type="button" onClick={() => startPractice(s.id)} className="btn-primary inline-flex w-full items-center justify-center gap-2 py-1.5 text-sm">
                      Vào làm bài
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {skillTab === "speaking" && viewMode === "practice" ? (
      <>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px,1fr]">
        <aside className="surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{setDetail?.title || "Bộ đề TOEIC Speaking"}</p>
            <button type="button" onClick={() => setViewMode("sets")} className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" />
              Bộ đề
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải câu hỏi...
              </div>
            ) : sortedItems.length === 0 ? (
              <p className="text-sm text-muted">Bộ đề này chưa có câu hỏi.</p>
            ) : (
              <div className="space-y-3">
                {groupedItems.map(([partKey, items]) => (
                  <div key={partKey}>
                    <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      {SPEAKING_PART_LABEL[partKey] || partKey.replaceAll("_", " ")} ({items.length})
                    </p>
                    <div className="space-y-2">
                      {items.map((it) => {
                        const active = it.id === itemId;
                        const done = Boolean((transcriptByItem[it.id] ?? "").trim() || feedbackByItem[it.id]?.parsed);
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => {
                              stopRecord();
                              setItemId(it.id);
                              setElapsedSec(0);
                            }}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                              active
                                ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-950/30 dark:text-slate-200 dark:hover:bg-slate-900/30"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-semibold">
                                Câu {itemOrderMap[it.id] || "-"}: {it.task?.title || it.task?.taskType || "Speaking task"}
                              </span>
                              {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                            </div>
                            <p className="mt-1 truncate text-xs opacity-80">{it.task?.code || it.task?.taskType || "TOEIC Speaking"}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">Đề bài</p>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="chip">Target: {activeTask?.targetSeconds ?? 0}s</span>
                <button type="button" onClick={speakPrompt} className="btn-secondary inline-flex items-center gap-2" disabled={!activeTask?.prompt}>
                  <Volume2 className="h-4 w-4" />
                  Nghe đề
                </button>
                {!listening ? (
                  <button type="button" onClick={startRecord} disabled={!supported || !itemId || isTimeUp} className="btn-primary inline-flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Ghi âm
                  </button>
                ) : (
                  <button type="button" onClick={stopRecord} className="btn-secondary inline-flex items-center gap-2">
                    <MicOff className="h-4 w-4" />
                    Dừng
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
              {activeTask?.prompt || "Chọn câu hỏi để bắt đầu."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Transcript</p>
                <span className="text-xs text-muted">
                  {activeTranscript.trim() ? `${activeTranscript.trim().split(/\s+/).length} từ` : "0 từ"}
                </span>
              </div>
              <textarea
                value={activeTranscript}
                onChange={(e) => setTranscriptValue(e.target.value)}
                rows={11}
                placeholder="Transcript sẽ xuất hiện ở đây hoặc bạn nhập thủ công..."
                disabled={isTimeUp}
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-500/30 focus:ring-2 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-100"
              />
              <div className="mt-3">
                <button type="button" onClick={grade} disabled={Boolean(activeFeedback?.loading) || !itemId || isTimeUp} className="btn-primary inline-flex items-center gap-2">
                  {activeFeedback?.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Chấm bằng AI
                </button>
              </div>
            </div>

            <div className="surface p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Kết quả AI</p>
              {!activeFeedback?.rawText && !activeFeedback?.loading ? (
                <p className="mt-2 text-sm text-muted">Chấm xong sẽ hiển thị điểm và feedback của câu hiện tại.</p>
              ) : null}

              {activeFeedback?.parsed ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                      Overall: {activeFeedback.parsed.overallScore ?? "—"}/200
                    </span>
                  </div>
                  {activeFeedback.parsed.summary ? (
                    <p className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                      {activeFeedback.parsed.summary}
                    </p>
                  ) : null}
                  {activeFeedback.parsed.criteria ? (
                    <div className="space-y-2">
                      {[
                        { key: "pronunciation", label: "Phát âm", value: activeFeedback.parsed.criteria.pronunciation },
                        { key: "fluency", label: "Độ trôi chảy", value: activeFeedback.parsed.criteria.fluency },
                        { key: "grammar", label: "Ngữ pháp", value: activeFeedback.parsed.criteria.grammar },
                        { key: "vocabulary", label: "Từ vựng", value: activeFeedback.parsed.criteria.vocabulary },
                        { key: "relevance", label: "Đúng trọng tâm", value: activeFeedback.parsed.criteria.relevance },
                      ].map((row) => (
                        <div key={row.key}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                            <span>{row.label}</span>
                            <span>{row.value ?? "—"}/200</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${toPercent(row.value)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {Array.isArray(activeFeedback.parsed.strengths) && activeFeedback.parsed.strengths.length ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Điểm mạnh</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                        {activeFeedback.parsed.strengths.slice(0, 5).map((x, idx) => (
                          <li key={idx}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Array.isArray(activeFeedback.parsed.weaknesses) && activeFeedback.parsed.weaknesses.length ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">Cần cải thiện</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                        {activeFeedback.parsed.weaknesses.slice(0, 6).map((x, idx) => (
                          <li key={idx}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Array.isArray(activeFeedback.parsed.evidence) && activeFeedback.parsed.evidence.length ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">Bằng chứng từ bài nói</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                        {activeFeedback.parsed.evidence.slice(0, 6).map((x, idx) => (
                          <li key={idx}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Array.isArray(activeFeedback.parsed.actionPlan) && activeFeedback.parsed.actionPlan.length ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/40">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Kế hoạch luyện tập</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                        {activeFeedback.parsed.actionPlan.slice(0, 6).map((x, idx) => (
                          <li key={idx}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {activeFeedback.parsed.betterAnswer ? (
                    <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-100">
                      {activeFeedback.parsed.betterAnswer}
                    </div>
                  ) : null}
                </div>
              ) : activeFeedback?.rawText ? (
                <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-100">
                  {activeFeedback.rawText}
                </pre>
              ) : null}
            </div>
          </div>
        </section>
      </div>
      </>
      ) : null}
    </div>
  );
}

