// Wrapper quanh @ricky0123/vad-web để dùng cho Timi.
// - Chỉ chạy phía client (lazy dynamic import)
// - Tự cấu hình baseAssetPath / onnxWASMBasePath theo public/vad
// - Cung cấp callbacks gọn cho component sử dụng
//
// VAD trả về Float32Array PCM 16 kHz mono. Component sẽ encode WAV
// rồi gửi BE qua /timi/sessions/:id/turns/audio như cũ.

export interface TimiVadInstance {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  destroy: () => Promise<void>;
  isListening: () => boolean;
}

export interface TimiVadCallbacks {
  /**
   * Tentative — VAD vừa thấy frame có giọng. Chưa biết có phải tiếng nói
   * thật sự hay chỉ noise. Dùng cho audio ducking nhẹ.
   */
  onSpeechStart?: () => void;
  /**
   * Confirmed — đoạn nói đã vượt minSpeechMs, chắc chắn không phải misfire.
   * Dùng cho action mạnh: pause hẳn audio đang phát, bật UI "đang nghe".
   */
  onRealSpeechStart?: () => void;
  /** Khi user dừng (im lặng đủ redemptionMs). Trả về PCM Float32. */
  onSpeechEnd?: (audio: Float32Array) => void;
  /** Khi nói quá ngắn (bị coi là noise / misfire). */
  onMisfire?: () => void;
  /** Lỗi không khởi tạo được. */
  onError?: (err: Error) => void;
}

export interface TimiVadOptions extends TimiVadCallbacks {
  /** Mặc định "legacy" — nhẹ hơn (1.8MB), đủ chính xác cho hội thoại tiếng Anh. */
  model?: "legacy" | "v5";
  /** Ngưỡng coi là có giọng nói. Mặc định 0.6 (cao hơn = ít nhạy với noise). */
  positiveSpeechThreshold?: number;
  /** Ngưỡng dưới để coi là im lặng. Nên thấp hơn positive ~0.15. */
  negativeSpeechThreshold?: number;
  /** Khoảng im lặng trước khi đóng segment (ms). Mặc định ~800ms. */
  redemptionMs?: number;
  /** Thời gian nói tối thiểu để KHÔNG bị coi là misfire (ms). Mặc định ~300ms. */
  minSpeechMs?: number;
  /** Pad audio trước khi đoạn nói bắt đầu (ms) để tránh cắt mất chữ đầu. */
  preSpeechPadMs?: number;
}

const DEFAULT_OPTIONS: Required<
  Omit<TimiVadOptions, keyof TimiVadCallbacks>
> = {
  model: "legacy",
  positiveSpeechThreshold: 0.6,
  negativeSpeechThreshold: 0.45,
  redemptionMs: 800,
  minSpeechMs: 300,
  preSpeechPadMs: 200,
};

/**
 * Khởi tạo MicVAD và bắt đầu listen ngay.
 * Caller phải gọi destroy() khi unmount để giải phóng mic + AudioContext.
 */
export async function createTimiVad(
  options: TimiVadOptions,
): Promise<TimiVadInstance> {
  if (typeof window === "undefined") {
    throw new Error("createTimiVad chỉ chạy được trong môi trường browser");
  }

  const merged = { ...DEFAULT_OPTIONS, ...options };

  const mod = await import("@ricky0123/vad-web");
  const MicVAD = mod.MicVAD;

  let listening = false;

  try {
    const vad = await MicVAD.new({
      model: merged.model,
      positiveSpeechThreshold: merged.positiveSpeechThreshold,
      negativeSpeechThreshold: merged.negativeSpeechThreshold,
      redemptionMs: merged.redemptionMs,
      minSpeechMs: merged.minSpeechMs,
      preSpeechPadMs: merged.preSpeechPadMs,
      baseAssetPath: "/vad/",
      onnxWASMBasePath: "/vad/",
      onSpeechStart: () => options.onSpeechStart?.(),
      onSpeechRealStart: () => options.onRealSpeechStart?.(),
      onSpeechEnd: (audio) => options.onSpeechEnd?.(audio),
      onVADMisfire: () => options.onMisfire?.(),
    });

    return {
      start: async () => {
        await vad.start();
        listening = true;
      },
      pause: async () => {
        await vad.pause();
        listening = false;
      },
      destroy: async () => {
        try {
          await vad.destroy();
        } finally {
          listening = false;
        }
      },
      isListening: () => listening,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    options.onError?.(error);
    throw error;
  }
}
