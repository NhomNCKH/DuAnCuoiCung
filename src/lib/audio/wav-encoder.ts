// Encoder cho audio dạng PCM Float32 mono (đầu ra của @ricky0123/vad-web)
// thành WAV Blob 16-bit PCM mà Groq Whisper / Edge có thể nhận trực tiếp.
//
// MicVAD trả về Float32Array đã được resample về 16 kHz mono
// → ta nén thành WAV chuẩn (RIFF + fmt + data) ở 16-bit signed little-endian.

const DEFAULT_SAMPLE_RATE = 16000;

function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
}

function writeAsciiString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

export interface EncodeWavOptions {
  sampleRate?: number;
  numChannels?: number;
}

export function encodeWav(
  samples: Float32Array,
  options: EncodeWavOptions = {},
): Blob {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const numChannels = options.numChannels ?? 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAsciiString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAsciiString(view, 8, "WAVE");
  writeAsciiString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAsciiString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  floatTo16BitPCM(view, 44, samples);

  return new Blob([buffer], { type: "audio/wav" });
}

export function getWavDurationSec(
  samples: Float32Array,
  sampleRate = DEFAULT_SAMPLE_RATE,
): number {
  return samples.length / sampleRate;
}
