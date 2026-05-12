"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { VerifyCredentialResponseData } from "@/lib/api-client";

interface PageProps {
  params: { token: string };
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

function shortHash(value?: string | null, length = 12) {
  if (!value) return "—";
  if (value.length <= length * 2 + 3) return value;
  return `${value.slice(0, length)}...${value.slice(-length)}`;
}

export default function VerifyCredentialPage({ params }: PageProps) {
  const { token } = params;
  const [data, setData] = useState<VerifyCredentialResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runVerify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.public_.credential.verify(token);
      setData(result);
    } catch (err: any) {
      setError(err?.message ?? "Không thể xác thực chứng chỉ.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void runVerify();
  }, [runVerify]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo/logo_website.svg"
              alt="TOEIC MASTER"
              width={140}
              height={32}
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Xác thực chứng chỉ TOEIC
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Mã xác thực: <span className="font-mono">{token}</span>
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-600">
              Đang xác thực chứng chỉ với hash on-chain + IPFS...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-rose-600" />
            <h2 className="mt-3 text-lg font-bold text-rose-900">
              Không thể xác thực
            </h2>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
            <button
              type="button"
              onClick={() => void runVerify()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
            >
              Thử lại
            </button>
          </div>
        ) : !data ? null : data.authentic ? (
          <VerifyAuthenticView data={data} />
        ) : (
          <VerifyFailView data={data} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} TOEIC MASTER · Hệ thống xác thực chứng chỉ
          không cần đăng nhập · Hash SHA-256 + IPFS Pinata
        </div>
      </footer>
    </div>
  );
}

function VerifyAuthenticView({
  data,
}: {
  data: VerifyCredentialResponseData;
}) {
  const cred = data.credential!;
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-emerald-300 bg-white shadow-md">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-10 w-10" />
            <div>
              <h2 className="text-xl font-extrabold">Chứng chỉ hợp lệ</h2>
              <p className="text-sm opacity-90">{data.message}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 px-6 py-5 md:grid-cols-2">
          <InfoField label="Họ tên học viên" value={cred.subject.name} bold />
          <InfoField label="Email" value={cred.subject.email} />
          <InfoField
            label="Tổng điểm"
            value={
              <span className="text-2xl font-black text-emerald-700">
                {cred.score.total}
              </span>
            }
          />
          <InfoField
            label="Ngưỡng đạt"
            value={`${cred.score.passThreshold} điểm`}
          />
          <InfoField label="Mã chứng chỉ" value={cred.serialNumber} mono />
          <InfoField
            label="Đề thi"
            value={cred.exam.templateName ?? cred.exam.templateCode ?? "—"}
          />
          <InfoField
            label="Ngày cấp"
            value={formatDateTime(cred.issuedAt)}
          />
          <InfoField
            label="Hiệu lực đến"
            value={cred.expiresAt ? formatDateTime(cred.expiresAt) : "Vĩnh viễn"}
          />
          <InfoField label="Nhà phát hành" value={cred.issuer.name} />
          <InfoField
            label="Trạng thái"
            value={
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                {cred.status}
              </span>
            }
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        <div className="border-b border-blue-200 bg-blue-50 px-6 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900">
            <ShieldCheck className="h-4 w-4" />
            Thông tin xác thực toàn vẹn
          </h3>
        </div>
        <div className="space-y-3 px-6 py-4 text-xs">
          <KvRow
            label="Phương thức"
            value={`${cred.integrity.mode} (${cred.integrity.hashAlgorithm.toUpperCase()})`}
          />
          <KvRow
            label="Payload Hash (DB)"
            value={shortHash(cred.integrity.payloadHash)}
            mono
          />
          <KvRow
            label="Chain Hash"
            value={shortHash(cred.integrity.chainHash)}
            mono
          />
          {cred.integrity.previousChainHash ? (
            <KvRow
              label="Previous Chain Hash"
              value={shortHash(cred.integrity.previousChainHash)}
              mono
            />
          ) : null}
          <KvRow
            label="IPFS payload khớp DB"
            value={
              cred.integrity.onChainPayloadMatchesDb === true ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Khớp - đã verify từ IPFS
                </span>
              ) : cred.integrity.onChainPayloadMatchesDb === false ? (
                <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                  <XCircle className="h-3 w-3" /> Không khớp - cảnh báo
                </span>
              ) : (
                <span className="text-slate-500">
                  Không thể fetch IPFS (kiểm tra hash DB)
                </span>
              )
            }
          />
          {cred.storage.ipfsCid ? (
            <KvRow
              label="IPFS CID"
              value={
                <span className="break-all font-mono">{cred.storage.ipfsCid}</span>
              }
            />
          ) : null}
          {cred.storage.ipfsGatewayUrl ? (
            <div className="pt-2">
              <a
                href={cred.storage.ipfsGatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Xem nguyên payload trên IPFS
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VerifyFailView({
  data,
}: {
  data: VerifyCredentialResponseData;
}) {
  const reason = data.reason ?? "unknown";
  const reasonLabelMap: Record<string, string> = {
    invalid_token: "Mã QR không hợp lệ",
    not_found: "Không tìm thấy chứng chỉ",
    revoked: "Chứng chỉ đã bị thu hồi",
    expired: "Chứng chỉ đã hết hiệu lực",
    payload_tampered: "Dữ liệu chứng chỉ bị chỉnh sửa",
    ipfs_mismatch: "IPFS không khớp - có dấu hiệu giả mạo",
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-rose-300 bg-white shadow-md">
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <ShieldX className="h-10 w-10" />
            <div>
              <h2 className="text-xl font-extrabold">Chứng chỉ KHÔNG hợp lệ</h2>
              <p className="text-sm opacity-90">
                {reasonLabelMap[reason] ?? reason}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 px-6 py-5 text-sm text-slate-700">
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-rose-900">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">{data.message}</p>
              <p className="mt-1 text-xs text-rose-700">
                Vui lòng liên hệ tổ chức đã cấp chứng chỉ để kiểm tra. Đây có thể
                là chứng chỉ giả mạo hoặc đã bị thu hồi.
              </p>
            </div>
          </div>

          {data.credential ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="font-bold text-slate-700">
                Thông tin chứng chỉ ghi nhận (chỉ tham khảo):
              </p>
              <p className="mt-2">
                <span className="font-semibold">Học viên:</span>{" "}
                {data.credential.subject.name}
              </p>
              <p>
                <span className="font-semibold">Serial:</span>{" "}
                <span className="font-mono">{data.credential.serialNumber}</span>
              </p>
              <p>
                <span className="font-semibold">Trạng thái:</span>{" "}
                {data.credential.status}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  bold = false,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div
        className={`mt-0.5 text-sm text-slate-900 ${
          bold ? "font-bold" : "font-medium"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function KvRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between md:gap-4">
      <span className="text-slate-500">{label}</span>
      <span
        className={`text-slate-900 ${mono ? "font-mono text-[11px]" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}
