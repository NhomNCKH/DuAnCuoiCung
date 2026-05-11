// Copy assets cần thiết của @ricky0123/vad-web và onnxruntime-web ra public/vad
// để MicVAD load được trên trình duyệt khi chạy Next.js.
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const targetDir = join(projectRoot, "public", "vad");

const sources = [
  // VAD model + worklet
  ["node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js", "vad.worklet.bundle.min.js"],
  ["node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx", "silero_vad_legacy.onnx"],
  ["node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx", "silero_vad_v5.onnx"],
  // ONNX runtime WASM (default build, không cần JSEP/WebGPU)
  ["node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.wasm"],
  ["node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.mjs"],
];

mkdirSync(targetDir, { recursive: true });

let copied = 0;
let skipped = 0;
for (const [from, name] of sources) {
  const src = join(projectRoot, from);
  const dst = join(targetDir, name);
  if (!existsSync(src)) {
    console.warn(`[copy-vad-assets] SKIP (not found): ${from}`);
    skipped++;
    continue;
  }
  copyFileSync(src, dst);
  copied++;
  console.log(`[copy-vad-assets] OK  ${name}`);
}

console.log(`[copy-vad-assets] Done. Copied=${copied}, Skipped=${skipped}, Target=${targetDir}`);
