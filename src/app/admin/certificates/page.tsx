// app/admin/certificates/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  Loader2,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { IssuedCredentialInfoData } from "@/lib/api-client";
import type { AdminOfficialExamResultItem, AdminExamRegistrationItem } from "@/types/admin-dashboard";
import { getSignedMediaUrl } from "@/lib/media-url";
import { useToast } from "@/hooks/useToast";
import { AdminCard, AdminEmptyState } from "@/components/admin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { EnhancedStatCard } from "@/components/ui/EnhancedStatCard";
import { SharedDropdown } from "@/components/ui/shared-dropdown";
import { SharedTable, SharedTableBody, SharedTableHead } from "@/components/ui/shared-table";
import html2canvas from "html2canvas";

// Tem chong hang gia - dat trong /public/icon -> Next.js serve same-origin,
// khong gay CORS khi html2canvas chup, KHONG can crossOrigin attribute.
const ANTI_COUNTERFEIT_SEAL_SRC = "/icon/anti-counterfeit-seal.png";

type ActiveTab = "results" | "issuance" | "registrations";

type ResultStatus = "graded" | "in_progress" | "submitted" | "abandoned" | "cancelled";
type IssueStatus = "not_issued" | "issued";

interface OfficialExamResultRow {
  id: string;
  userId: string;
  examTemplateId: string;
  studentName: string;
  studentEmail: string;
  examName: string;
  totalScore: number;
  listeningScore: number;
  readingScore: number;
  startedAt: string;
  submittedAt?: string | null;
  status: ResultStatus;
  passThreshold: number;
  isEligible: boolean;
  issueStatus: IssueStatus;
  hasViolation: boolean;
  violationCount: number;
  // Snapshot dang ki + thong tin user de in len chung chi
  profileFullName: string | null;
  profileIdentityNumber: string | null;
  profileBirthday: string | null;
  profileAvatarUrl: string | null;
  profileAvatarS3Key: string | null;
}

interface OfficialExamTemplateOption {
  value: string;
  label: string;
}

type RegistrationStatus = "registered" | "cancelled";

interface RegistrationRow {
  id: string;
  userId: string;
  examTemplateId: string;
  studentName: string;
  studentEmail: string;
  examName: string;
  examCode: string;
  status: RegistrationStatus;
  examDate: string;
  registeredAt: string;
  confirmationSentAt: string | null;
  reminderSentAt: string | null;
  metadata: Record<string, unknown>;
}

const DEFAULT_PASS_THRESHOLD = 500;
const PAGE_SIZE = 10;
const CERTIFICATE_TABS: Array<{
  key: ActiveTab;
  label: string;
  icon: typeof FileCheck2;
}> = [
    { key: "results", label: "Kết quả", icon: FileCheck2 },
    { key: "issuance", label: "Cấp chứng chỉ", icon: ShieldCheck },
    { key: "registrations", label: "Lịch sử đăng ký", icon: CalendarDays },
  ];

function toResultStatus(status: string): ResultStatus {
  if (status === "graded") return "graded";
  if (status === "submitted") return "submitted";
  if (status === "abandoned") return "abandoned";
  if (status === "cancelled") return "cancelled";
  return "in_progress";
}

function getResultStatusLabel(status: ResultStatus) {
  switch (status) {
    case "graded":
      return "Đã chấm";
    case "submitted":
      return "Đã nộp";
    case "abandoned":
      return "Bỏ dở";
    case "cancelled":
      return "Đã hủy";
    default:
      return "Đang làm";
  }
}

function getResultStatusClass(status: ResultStatus) {
  switch (status) {
    case "graded":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "submitted":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "in_progress":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "abandoned":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    case "cancelled":
      return "border border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getIssueStatusLabel(status: IssueStatus) {
  return status === "issued" ? "Đã cấp" : "Chưa cấp";
}

function getIssueStatusClass(status: IssueStatus) {
  return status === "issued"
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-amber-200 bg-amber-50 text-amber-700";
}

function StatusBadge({
  label,
  toneClassName,
}: {
  label: string;
  toneClassName: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClassName}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa nộp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

function formatDateYmd(value?: string | null) {
  if (!value) return "----/--/--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "----/--/--";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function addYearsToYmd(value?: string | null, years = 2) {
  if (!value) return "----/--/--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "----/--/--";
  date.setFullYear(date.getFullYear() + years);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function getRegStatusLabel(status: RegistrationStatus) {
  return status === "registered" ? "Đã đăng ký" : "Đã hủy";
}

function getRegStatusClass(status: RegistrationStatus) {
  return status === "registered"
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-rose-200 bg-rose-50 text-rose-700";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatCertificateCode(attemptId: string) {
  return `TM-${attemptId.slice(0, 8).toUpperCase()}`;
}

function formatBirthdayYmd(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.split("T")[0].split("-");
    return `${y}/${m}/${d}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${y}/${m.padStart(2, "0")}/${d.padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return `${parsed.getFullYear()}/${String(parsed.getMonth() + 1).padStart(
    2,
    "0",
  )}/${String(parsed.getDate()).padStart(2, "0")}`;
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors", cache: "no-cache" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function estimateToeicDomainScores(totalScore: number) {
  const listening = Math.max(5, Math.min(495, Math.round(totalScore * 0.52)));
  const reading = Math.max(5, Math.min(495, totalScore - listening));
  return { listening, reading };
}

export default function AdminCertificatesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resultsSearchTerm, setResultsSearchTerm] = useState("");
  const [issuanceSearchTerm, setIssuanceSearchTerm] = useState("");
  const [selectedResultStatus, setSelectedResultStatus] = useState("all");
  const [selectedIssuanceStatus, setSelectedIssuanceStatus] = useState("all");
  const [selectedResultExamTemplate, setSelectedResultExamTemplate] =
    useState("all");
  const [selectedIssuanceExamTemplate, setSelectedIssuanceExamTemplate] =
    useState("all");
  const [resultsPage, setResultsPage] = useState(1);
  const [issuancePage, setIssuancePage] = useState(1);
  const [rows, setRows] = useState<OfficialExamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issuingAttemptId, setIssuingAttemptId] = useState<string | null>(null);
  const [bulkIssuing, setBulkIssuing] = useState(false);
  const [previewRow, setPreviewRow] = useState<OfficialExamResultRow | null>(null);
  const [confirmIssueRow, setConfirmIssueRow] =
    useState<OfficialExamResultRow | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [credentialInfoMap, setCredentialInfoMap] = useState<
    Record<string, IssuedCredentialInfoData>
  >({});
  const [loadingCredentialFor, setLoadingCredentialFor] = useState<string | null>(
    null,
  );
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [previewAvatarDataUrl, setPreviewAvatarDataUrl] = useState<string | null>(
    null,
  );
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string | null>(null);
  const [previewAssetsLoading, setPreviewAssetsLoading] = useState(false);
  const certificateNodeRef = useRef<HTMLDivElement | null>(null);
  const toast = useToast();

  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSearchTerm, setRegSearchTerm] = useState("");
  const [selectedRegStatus, setSelectedRegStatus] = useState("all");
  const [selectedRegExamTemplate, setSelectedRegExamTemplate] = useState("all");
  const [regPage, setRegPage] = useState(1);
  const [previewRegistration, setPreviewRegistration] = useState<RegistrationRow | null>(null);
  const [previewRegistrationAvatarUrl, setPreviewRegistrationAvatarUrl] = useState<string>("");

  const activeTab: ActiveTab =
    searchParams?.get("tab") === "issuance"
      ? "issuance"
      : searchParams?.get("tab") === "registrations"
        ? "registrations"
        : "results";

  const hydrateRowsFromApi = (
    items: AdminOfficialExamResultItem[],
  ): OfficialExamResultRow[] => {
    return items.map((attempt) => {
      const totalScore = Number(attempt.totalScore ?? 0);
      const passThreshold = Number(attempt.passThreshold ?? DEFAULT_PASS_THRESHOLD);
      const isEligible = totalScore >= passThreshold;
      const profile = attempt.registrationProfile ?? null;
      const profileFullName =
        profile?.fullName && profile.fullName.trim() !== ""
          ? profile.fullName.trim()
          : null;
      const profileIdentityNumber =
        profile?.identityNumber && profile.identityNumber.trim() !== ""
          ? profile.identityNumber.trim()
          : null;
      const profileBirthday =
        profile?.birthday && profile.birthday.trim() !== ""
          ? profile.birthday.trim()
          : attempt.user?.birthday ?? null;
      const profileAvatarUrl =
        (profile?.avatarUrl && profile.avatarUrl.trim() !== ""
          ? profile.avatarUrl.trim()
          : null) ??
        (attempt.user?.avatarUrl && attempt.user.avatarUrl.trim() !== ""
          ? attempt.user.avatarUrl.trim()
          : null);
      const profileAvatarS3Key =
        (profile?.avatarS3Key && profile.avatarS3Key.trim() !== ""
          ? profile.avatarS3Key.trim()
          : null) ??
        (attempt.user?.avatarS3Key && attempt.user.avatarS3Key.trim() !== ""
          ? attempt.user.avatarS3Key.trim()
          : null);

      return {
        id: attempt.id,
        userId: attempt.user?.id ?? "",
        examTemplateId: attempt.template?.id ?? "",
        studentName: profileFullName ?? attempt.user?.name ?? "Chưa có tên",
        studentEmail: attempt.user?.email ?? "N/A",
        examName: attempt.template?.name ?? "Đề thi chính thức",
        totalScore,
        listeningScore: Number(attempt.listeningScore ?? 0),
        readingScore: Number(attempt.readingScore ?? 0),
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        status: toResultStatus(attempt.status),
        passThreshold,
        isEligible,
        issueStatus: attempt.issueStatus ?? "not_issued",
        hasViolation: Boolean(attempt.hasViolation),
        violationCount: Number(attempt.violationCount ?? 0),
        profileFullName,
        profileIdentityNumber,
        profileBirthday,
        profileAvatarUrl,
        profileAvatarS3Key,
      };
    });
  };

  const fetchOfficialResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.admin.dashboard.listOfficialResults({
        page: 1,
        limit: 100,
      });
      const payload: any = response;
      const candidates = [
        payload?.data?.items,
        payload?.data?.data?.items,
        payload?.data?.data?.data?.items,
        payload?.items,
      ];
      const items = (candidates.find((value) => Array.isArray(value)) ??
        []) as AdminOfficialExamResultItem[];
      setRows(hydrateRowsFromApi(items));
    } catch (err: any) {
      setRows([]);
      setError(err?.message ?? "Không thể tải dữ liệu kết quả thi chính thức.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOfficialResults();
  }, [fetchOfficialResults]);

  const hydrateRegistrationsFromApi = (items: AdminExamRegistrationItem[]): RegistrationRow[] => {
    return items.map((reg) => {
      const meta: any = reg.metadata ?? {};
      const profile: any = meta?.certificateProfile ?? null;
      const snapshotName =
        profile && typeof profile.fullName === "string" ? profile.fullName.trim() : "";

      return {
        id: reg.id,
        userId: reg.user?.id ?? "",
        examTemplateId: reg.template?.id ?? "",
        studentName: snapshotName || reg.user?.name || "Chưa có tên",
        studentEmail: reg.user?.email ?? "N/A",
        examName: reg.template?.name ?? "Đề thi chính thức",
        examCode: reg.template?.code ?? "",
        status: reg.status,
        examDate: reg.examDate,
        registeredAt: reg.registeredAt,
        confirmationSentAt: reg.confirmationSentAt,
        reminderSentAt: reg.reminderSentAt,
        metadata: (reg.metadata ?? {}) as Record<string, unknown>,
      };
    });
  };

  const fetchRegistrations = useCallback(async () => {
    setRegLoading(true);
    setRegError(null);
    try {
      const response = await apiClient.admin.dashboard.listRegistrations({
        page: 1,
        limit: 100,
      });
      const payload: any = response;
      const candidates = [
        payload?.data?.items,
        payload?.data?.data?.items,
        payload?.items,
      ];
      const items = (candidates.find((v) => Array.isArray(v)) ?? []) as AdminExamRegistrationItem[];
      setRegistrations(hydrateRegistrationsFromApi(items));
    } catch (err: any) {
      setRegistrations([]);
      setRegError(err?.message ?? "Không thể tải dữ liệu lịch sử đăng ký.");
    } finally {
      setRegLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "registrations") {
      void fetchRegistrations();
    }
  }, [activeTab, fetchRegistrations]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!previewRegistration) {
        setPreviewRegistrationAvatarUrl("");
        return;
      }

      const meta: any = previewRegistration.metadata ?? {};
      const profile = meta?.certificateProfile ?? null;
      const avatarUrl =
        profile && typeof profile.avatarUrl === "string" ? profile.avatarUrl.trim() : "";
      const avatarS3Key =
        profile && typeof profile.avatarS3Key === "string" ? profile.avatarS3Key.trim() : "";

      // Prefer signed URL if we have s3Key; fallback to avatarUrl.
      if (avatarS3Key) {
        try {
          const signed = await getSignedMediaUrl(avatarS3Key);
          if (!cancelled) {
            setPreviewRegistrationAvatarUrl(signed || avatarUrl || "");
          }
          return;
        } catch {
          // ignore and fallback
        }
      }

      if (!cancelled) {
        setPreviewRegistrationAvatarUrl(avatarUrl || "");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [previewRegistration]);

  const officialExamOptions = useMemo<OfficialExamTemplateOption[]>(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (!row.examTemplateId) continue;
      if (!map.has(row.examTemplateId)) {
        map.set(row.examTemplateId, row.examName);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [rows]);

  const registrationExamOptions = useMemo<OfficialExamTemplateOption[]>(() => {
    const map = new Map<string, string>();
    for (const row of registrations) {
      if (!row.examTemplateId) continue;
      if (!map.has(row.examTemplateId)) {
        map.set(row.examTemplateId, row.examName);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [registrations]);

  const normalizedRegSearch = regSearchTerm.trim().toLowerCase();

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((row) => {
      const matchesSearch =
        normalizedRegSearch.length === 0 ||
        row.studentName.toLowerCase().includes(normalizedRegSearch) ||
        row.studentEmail.toLowerCase().includes(normalizedRegSearch) ||
        row.examName.toLowerCase().includes(normalizedRegSearch) ||
        row.examCode.toLowerCase().includes(normalizedRegSearch);
      const matchesStatus =
        selectedRegStatus === "all" || row.status === selectedRegStatus;
      const matchesExamTemplate =
        selectedRegExamTemplate === "all" ||
        row.examTemplateId === selectedRegExamTemplate;
      return matchesSearch && matchesStatus && matchesExamTemplate;
    });
  }, [registrations, normalizedRegSearch, selectedRegStatus, selectedRegExamTemplate]);

  const regStats = useMemo(() => {
    const total = registrations.length;
    const registered = registrations.filter((r) => r.status === "registered").length;
    const cancelled = registrations.filter((r) => r.status === "cancelled").length;
    const confirmedEmail = registrations.filter((r) => r.confirmationSentAt !== null).length;
    return { total, registered, cancelled, confirmedEmail };
  }, [registrations]);

  const regTotalPages = Math.max(1, Math.ceil(filteredRegistrations.length / PAGE_SIZE));

  const paginatedRegistrations = useMemo(() => {
    const start = (regPage - 1) * PAGE_SIZE;
    return filteredRegistrations.slice(start, start + PAGE_SIZE);
  }, [filteredRegistrations, regPage]);

  const normalizedResultsSearch = resultsSearchTerm.trim().toLowerCase();
  const normalizedIssuanceSearch = issuanceSearchTerm.trim().toLowerCase();

  const filteredResults = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        normalizedResultsSearch.length === 0 ||
        row.studentName.toLowerCase().includes(normalizedResultsSearch) ||
        row.studentEmail.toLowerCase().includes(normalizedResultsSearch) ||
        row.examName.toLowerCase().includes(normalizedResultsSearch);

      const matchesStatus =
        selectedResultStatus === "all" || row.status === selectedResultStatus;
      const matchesExamTemplate =
        selectedResultExamTemplate === "all" ||
        row.examTemplateId === selectedResultExamTemplate;

      return matchesSearch && matchesStatus && matchesExamTemplate;
    });
  }, [
    rows,
    normalizedResultsSearch,
    selectedResultStatus,
    selectedResultExamTemplate,
  ]);

  const filteredIssuanceRows = useMemo(() => {
    return rows.filter((row) => {
      if (!row.isEligible) return false;

      const matchesSearch =
        normalizedIssuanceSearch.length === 0 ||
        row.studentName.toLowerCase().includes(normalizedIssuanceSearch) ||
        row.studentEmail.toLowerCase().includes(normalizedIssuanceSearch) ||
        row.examName.toLowerCase().includes(normalizedIssuanceSearch);

      const matchesIssueStatus =
        selectedIssuanceStatus === "all" ||
        (selectedIssuanceStatus === "issued" && row.issueStatus === "issued") ||
        (selectedIssuanceStatus === "not_issued" && row.issueStatus === "not_issued");
      const matchesExamTemplate =
        selectedIssuanceExamTemplate === "all" ||
        row.examTemplateId === selectedIssuanceExamTemplate;

      return matchesSearch && matchesIssueStatus && matchesExamTemplate;
    });
  }, [
    rows,
    normalizedIssuanceSearch,
    selectedIssuanceStatus,
    selectedIssuanceExamTemplate,
  ]);

  const stats = useMemo(() => {
    const totalResults = rows.length;
    const gradedCount = rows.filter((row) => row.status === "graded").length;
    const eligibleCount = rows.filter((row) => row.isEligible).length;
    const issuedCount = rows.filter((row) => row.issueStatus === "issued").length;
    const issueRate = eligibleCount > 0 ? Math.round((issuedCount / eligibleCount) * 100) : 0;

    return {
      totalResults,
      gradedCount,
      eligibleCount,
      issueRate,
    };
  }, [rows]);

  const resultsTotalPages = Math.max(
    1,
    Math.ceil(filteredResults.length / PAGE_SIZE),
  );
  const issuanceTotalPages = Math.max(
    1,
    Math.ceil(filteredIssuanceRows.length / PAGE_SIZE),
  );

  const paginatedResults = useMemo(() => {
    const start = (resultsPage - 1) * PAGE_SIZE;
    return filteredResults.slice(start, start + PAGE_SIZE);
  }, [filteredResults, resultsPage]);

  const paginatedIssuanceRows = useMemo(() => {
    const start = (issuancePage - 1) * PAGE_SIZE;
    return filteredIssuanceRows.slice(start, start + PAGE_SIZE);
  }, [filteredIssuanceRows, issuancePage]);

  const handleChangeTab = (nextTab: ActiveTab) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setResultsPage(1);
  }, [resultsSearchTerm, selectedResultStatus, selectedResultExamTemplate]);

  useEffect(() => {
    setIssuancePage(1);
  }, [issuanceSearchTerm, selectedIssuanceStatus, selectedIssuanceExamTemplate]);

  useEffect(() => {
    if (resultsPage > resultsTotalPages) {
      setResultsPage(resultsTotalPages);
    }
  }, [resultsPage, resultsTotalPages]);

  useEffect(() => {
    if (issuancePage > issuanceTotalPages) {
      setIssuancePage(issuanceTotalPages);
    }
  }, [issuancePage, issuanceTotalPages]);

  useEffect(() => {
    setRegPage(1);
  }, [regSearchTerm, selectedRegStatus, selectedRegExamTemplate]);

  useEffect(() => {
    if (regPage > regTotalPages) {
      setRegPage(regTotalPages);
    }
  }, [regPage, regTotalPages]);

  const markRowAsIssued = useCallback((attemptId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === attemptId ? { ...row, issueStatus: "issued" } : row,
      ),
    );
  }, []);

  const performIssueCertificate = useCallback(
    async (row: OfficialExamResultRow) => {
      if (row.issueStatus === "issued" || !row.isEligible || issuingAttemptId) {
        return;
      }

      setIssuingAttemptId(row.id);
      setError(null);
      try {
        const response =
          await apiClient.admin.dashboard.issueOfficialResultCertificate(row.id);
        const data: any = response?.data ?? response;
        markRowAsIssued(row.id);
        if (data?.credentialId) {
          setCredentialInfoMap((prev) => ({
            ...prev,
            [row.id]: {
              credentialId: data.credentialId,
              serialNumber: data.serialNumber ?? "",
              status: "issued",
              issuedAt: new Date().toISOString(),
              expiresAt: null,
              ipfsCid: data.ipfsCid ?? null,
              storageUri: data.storageUri ?? null,
              ipfsGatewayUrl: data.ipfsGatewayUrl ?? null,
              qrToken: data.qrToken ?? "",
              qrUrl: data.qrUrl ?? null,
              qrImageUrl: data.qrImageUrl ?? null,
              qrImageS3Key: data.qrImageS3Key ?? null,
              payloadHash: data.payloadHash ?? null,
              chainHash: data.chainHash ?? null,
              issueStatus: "issued",
            },
          }));
        }
        toast.notify({
          variant: "success",
          title: "Đã cấp chứng chỉ",
          message: `Cấp thành công chứng chỉ cho ${row.studentName}. Serial: ${
            data?.serialNumber ?? "(đang đồng bộ)"
          }`,
        });
      } catch (err: any) {
        const msg = err?.message ?? "Cấp chứng chỉ thất bại. Vui lòng thử lại.";
        setError(msg);
        toast.notify({
          variant: "error",
          title: "Cấp chứng chỉ thất bại",
          message: msg,
        });
      } finally {
        setIssuingAttemptId(null);
      }
    },
    [issuingAttemptId, markRowAsIssued, toast],
  );

  const handleIssueCertificate = useCallback(
    (row: OfficialExamResultRow) => {
      if (row.issueStatus === "issued" || !row.isEligible || issuingAttemptId) {
        return;
      }
      setConfirmIssueRow(row);
    },
    [issuingAttemptId],
  );

  const handleConfirmIssue = useCallback(async () => {
    if (!confirmIssueRow) return;
    const row = confirmIssueRow;
    setConfirmIssueRow(null);
    await performIssueCertificate(row);
  }, [confirmIssueRow, performIssueCertificate]);

  const handleBulkIssue = useCallback(() => {
    if (bulkIssuing || issuingAttemptId) return;
    const targets = filteredIssuanceRows.filter(
      (row) => row.issueStatus === "not_issued" && row.isEligible,
    );
    if (targets.length === 0) return;
    setConfirmBulkOpen(true);
  }, [bulkIssuing, filteredIssuanceRows, issuingAttemptId]);

  const performBulkIssue = useCallback(async () => {
    if (bulkIssuing || issuingAttemptId) return;
    const targets = filteredIssuanceRows.filter(
      (row) => row.issueStatus === "not_issued" && row.isEligible,
    );
    if (targets.length === 0) return;

    setBulkIssuing(true);
    setError(null);
    let successCount = 0;
    let failedCount = 0;
    try {
      for (const row of targets) {
        try {
          const response =
            await apiClient.admin.dashboard.issueOfficialResultCertificate(
              row.id,
            );
          const data: any = response?.data ?? response;
          markRowAsIssued(row.id);
          if (data?.credentialId) {
            setCredentialInfoMap((prev) => ({
              ...prev,
              [row.id]: {
                credentialId: data.credentialId,
                serialNumber: data.serialNumber ?? "",
                status: "issued",
                issuedAt: new Date().toISOString(),
                expiresAt: null,
                ipfsCid: data.ipfsCid ?? null,
                storageUri: data.storageUri ?? null,
                ipfsGatewayUrl: data.ipfsGatewayUrl ?? null,
                qrToken: data.qrToken ?? "",
                qrUrl: data.qrUrl ?? null,
                qrImageUrl: data.qrImageUrl ?? null,
                qrImageS3Key: data.qrImageS3Key ?? null,
                payloadHash: data.payloadHash ?? null,
                chainHash: data.chainHash ?? null,
                issueStatus: "issued",
              },
            }));
          }
          successCount += 1;
        } catch (err: any) {
          failedCount += 1;
        }
      }
      toast.notify({
        variant: failedCount === 0 ? "success" : "warning",
        title: failedCount === 0 ? "Cấp hàng loạt thành công" : "Cấp hàng loạt hoàn tất",
        message: `Thành công: ${successCount}. Thất bại: ${failedCount}.`,
      });
    } finally {
      setBulkIssuing(false);
      setConfirmBulkOpen(false);
    }
  }, [
    bulkIssuing,
    filteredIssuanceRows,
    issuingAttemptId,
    markRowAsIssued,
    toast,
  ]);

  // Phim Esc -> dong modal preview certificate (vi da bo nut X).
  useEffect(() => {
    if (!previewRow) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewRow(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewRow]);

  // Khi mở modal preview cho row đã cấp -> auto fetch credential info nếu chưa cache.
  // CHU Y: KHONG dua `loadingCredentialFor` vao deps -> tranh re-run effect khi
  // ta vua call setLoadingCredentialFor (gay race condition `cancelled = true` truoc
  // khi promise resolve, dan toi setCredentialInfoMap khong bao gio chay).
  useEffect(() => {
    if (!previewRow) return;
    if (previewRow.issueStatus !== "issued") return;
    if (credentialInfoMap[previewRow.id]) return;

    const targetId = previewRow.id;
    let cancelled = false;
    setLoadingCredentialFor(targetId);
    apiClient.admin.dashboard
      .getOfficialResultCredential(targetId)
      .then((response: any) => {
        if (cancelled) return;
        // Phong khi BE tra ve 2 dang: { data: {...} } hoac { data: { data: {...} } }
        const raw = response?.data ?? response ?? null;
        const info: IssuedCredentialInfoData | null =
          raw && typeof raw === "object" && "credentialId" in raw
            ? raw
            : raw?.data && typeof raw.data === "object" && "credentialId" in raw.data
            ? raw.data
            : null;
        if (info && info.credentialId) {
          setCredentialInfoMap((prev) => ({ ...prev, [targetId]: info }));
        }
      })
      .catch(() => {
        /* swallow - tab dong gay cancel la binh thuong */
      })
      .finally(() => {
        setLoadingCredentialFor((current) =>
          current === targetId ? null : current,
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewRow?.id, previewRow?.issueStatus]);

  // Pre-load anh QR + anh avatar duoi dang base64 dataURL khi mo modal preview.
  // Ly do: html2canvas khong ve duoc img cross-origin tu S3 du da co `useCORS`,
  // nen phai convert truoc thanh dataURL de luc render PNG vat ly van co QR + avatar.
  useEffect(() => {
    if (!previewRow) {
      setPreviewAvatarDataUrl(null);
      setPreviewQrDataUrl(null);
      setPreviewAssetsLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewAssetsLoading(true);

    const credInfo = credentialInfoMap[previewRow.id] ?? null;
    const avatarSourceUrl = previewRow.profileAvatarUrl ?? null;
    const avatarS3Key = previewRow.profileAvatarS3Key ?? null;
    const qrSourceUrl = credInfo?.qrImageUrl ?? null;
    const qrS3Key = credInfo?.qrImageS3Key ?? null;

    // Uu tien proxy qua BE de tranh hoan toan CORS/403 cua S3.
    // Fallback ve fetch truc tiep neu khong co s3Key (truong hop legacy).
    const loadViaBackend = async (s3Key: string): Promise<string | null> => {
      try {
        const resp = await apiClient.media.getMediaDataUrl({ s3Key });
        return resp?.data?.dataUrl ?? null;
      } catch {
        return null;
      }
    };

    const loadAvatar = async (): Promise<string | null> => {
      if (avatarS3Key) {
        const viaBackend = await loadViaBackend(avatarS3Key);
        if (viaBackend) return viaBackend;
      }
      if (avatarSourceUrl) {
        return await urlToDataUrl(avatarSourceUrl);
      }
      return null;
    };

    const loadQr = async (): Promise<string | null> => {
      if (qrS3Key) {
        const viaBackend = await loadViaBackend(qrS3Key);
        if (viaBackend) return viaBackend;
      }
      if (qrSourceUrl) {
        return await urlToDataUrl(qrSourceUrl);
      }
      return null;
    };

    void Promise.all([loadAvatar(), loadQr()])
      .then(([avatarData, qrData]) => {
        if (cancelled) return;
        setPreviewAvatarDataUrl(avatarData);
        setPreviewQrDataUrl(qrData);
      })
      .finally(() => {
        if (cancelled) return;
        setPreviewAssetsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    previewRow?.id,
    previewRow?.profileAvatarUrl,
    previewRow?.profileAvatarS3Key,
    credentialInfoMap[previewRow?.id ?? ""]?.qrImageUrl,
    credentialInfoMap[previewRow?.id ?? ""]?.qrImageS3Key,
  ]);

  const handleDownloadCertificate = useCallback(async () => {
    if (!certificateNodeRef.current || !previewRow) return;
    const original = certificateNodeRef.current;

    // Triet ly:
    // - Giu nguyen ti le tu nhien cua template, KHONG ep vao khung A4 (gay
    //   nhieu khoang trang xau xi).
    // - Lock width 1600px (high-DPI), height auto theo content tu nhien.
    // - Scale x2 -> output PNG ~3200px ngang, du sac net cho moi nhu cau
    //   (xem online / in chung chi).
    const RENDER_WIDTH_PX = 1600;
    const RENDER_SCALE = 2;

    const wrapper = document.createElement("div");
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-99999px";
    wrapper.style.top = "0";
    wrapper.style.width = `${RENDER_WIDTH_PX}px`;
    wrapper.style.padding = "0";
    wrapper.style.margin = "0";
    wrapper.style.background = "#f8f4ea";
    wrapper.style.pointerEvents = "none";

    const clone = original.cloneNode(true) as HTMLElement;
    clone.style.width = `${RENDER_WIDTH_PX}px`;
    clone.style.maxWidth = `${RENDER_WIDTH_PX}px`;
    clone.style.boxShadow = "none";
    clone.style.transform = "none";

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      setDownloadingCert(true);

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );

      const images = Array.from(clone.querySelectorAll("img"));
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
              }
              const done = () => {
                img.removeEventListener("load", done);
                img.removeEventListener("error", done);
                resolve();
              };
              img.addEventListener("load", done);
              img.addEventListener("error", done);
            }),
        ),
      );

      const canvas = await html2canvas(clone, {
        scale: RENDER_SCALE,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#f8f4ea",
        width: RENDER_WIDTH_PX,
        windowWidth: RENDER_WIDTH_PX,
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeName = previewRow.studentName.replace(/[^A-Za-z0-9_-]+/g, "_");
      link.href = dataUrl;
      link.download = `TOEIC-Certificate-${safeName}-${previewRow.id.slice(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.notify({
        variant: "success",
        title: "Đã tải xuống chứng chỉ",
        message: `${link.download} (${canvas.width}×${canvas.height} px)`,
      });
    } catch (err: any) {
      toast.notify({
        variant: "error",
        title: "Không thể tải chứng chỉ",
        message: err?.message ?? "Lỗi không xác định",
      });
    } finally {
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      setDownloadingCert(false);
    }
  }, [previewRow, toast]);

  return (
    <div className="space-y-6">
      <div>
        <nav
          className="border-b border-slate-200 admin-dark:border-[var(--admin-border)]"
          aria-label="Tabs chứng chỉ"
        >
          <div className="-mb-px flex flex-wrap items-end gap-1 sm:gap-2">
            {CERTIFICATE_TABS.map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleChangeTab(tab.key)}
                  className={`relative flex h-11 items-center gap-2 px-2.5 text-sm font-bold transition-colors sm:px-3 ${active
                    ? "text-blue-600 admin-dark:text-[var(--admin-accent)]"
                    : "text-slate-400 hover:text-slate-600 admin-dark:text-[var(--admin-muted)] admin-dark:hover:text-[var(--admin-text)]"
                    }`}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  {tab.label}
                  {active ? (
                    <motion.span
                      layoutId="admin-certificate-tab-underline"
                      className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-blue-600 admin-dark:bg-[var(--admin-accent)]"
                      transition={{ type: "spring", stiffness: 480, damping: 38 }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {activeTab === "registrations" ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <EnhancedStatCard
              icon={CalendarDays}
              label="Tổng đăng ký"
              value={formatNumber(regStats.total)}
              color="from-blue-500 to-indigo-600"
              bgColor="bg-white"
              compact
              tone="blue"
            />
            <EnhancedStatCard
              icon={CheckCircle2}
              label="Đang đăng ký"
              value={formatNumber(regStats.registered)}
              color="from-emerald-500 to-teal-600"
              bgColor="bg-white"
              compact
              tone="green"
            />
            <EnhancedStatCard
              icon={XCircle}
              label="Đã hủy"
              value={formatNumber(regStats.cancelled)}
              color="from-rose-500 to-pink-600"
              bgColor="bg-white"
              compact
              tone="red"
            />
            <EnhancedStatCard
              icon={Users}
              label="Đã xác nhận email"
              value={formatNumber(regStats.confirmedEmail)}
              color="from-amber-500 to-orange-600"
              bgColor="bg-white"
              compact
              tone="yellow"
            />
          </motion.div>

          <AdminCard title="Lịch sử đăng ký thi chính thức">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={regSearchTerm}
                  onChange={(event) => setRegSearchTerm(event.target.value)}
                  placeholder="Tìm theo học viên, email, đề thi..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <SharedDropdown
                value={selectedRegStatus}
                onChange={setSelectedRegStatus}
                className="w-full min-w-[190px] lg:w-[220px]"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "registered", label: "Đã đăng ký" },
                  { value: "cancelled", label: "Đã hủy" },
                ]}
              />
              <SharedDropdown
                value={selectedRegExamTemplate}
                onChange={setSelectedRegExamTemplate}
                className="w-full min-w-[220px] lg:w-[320px]"
                options={[
                  { value: "all", label: "Tất cả đề thi chính thức" },
                  ...registrationExamOptions,
                ]}
              />
            </div>

            {regError ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <Clock3 className="h-4 w-4" />
                {regError}
              </div>
            ) : null}

            {regLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-600">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải lịch sử đăng ký...
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <AdminEmptyState
                icon={CalendarDays}
                title="Chưa có lịch sử đăng ký"
                description="Hệ thống sẽ hiển thị tại đây các học viên đã đăng ký thi chính thức."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <SharedTable>
                    <SharedTableHead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Học viên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Đề thi
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Ngày thi
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Ngày đăng ký
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Xác nhận email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Trạng thái
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Thao tác
                        </th>
                      </tr>
                    </SharedTableHead>
                    <SharedTableBody>
                      {paginatedRegistrations.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-semibold text-slate-800">{row.studentName}</p>
                            <p className="text-xs text-slate-500">{row.studentEmail}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-medium text-slate-800">{row.examName}</p>
                            {row.examCode ? (
                              <p className="text-xs text-slate-500">Mã: {row.examCode}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 align-top text-sm text-slate-700">
                            {formatDateTime(row.examDate)}
                          </td>
                          <td className="px-4 py-3 align-top text-sm text-slate-700">
                            {formatDateTime(row.registeredAt)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {row.confirmationSentAt ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {formatDateTime(row.confirmationSentAt)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                <Clock3 className="h-3.5 w-3.5" />
                                Chưa gửi
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge
                              toneClassName={getRegStatusClass(row.status)}
                              label={getRegStatusLabel(row.status)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <button
                              type="button"
                              className="btn-secondary px-3 py-1.5 text-xs"
                              onClick={() => setPreviewRegistration(row)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </SharedTableBody>
                  </SharedTable>
                </div>
              </div>
            )}

            {!regLoading && filteredRegistrations.length > 0 ? (
              <AdminPagination
                className="mt-4"
                page={regPage}
                totalPages={regTotalPages}
                total={filteredRegistrations.length}
                limit={PAGE_SIZE}
                onPageChange={setRegPage}
                itemLabel="đăng ký"
              />
            ) : null}
          </AdminCard>
        </>
      ) : activeTab === "results" ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <EnhancedStatCard
              icon={FileCheck2}
              label="Kết quả thi chính thức"
              value={formatNumber(stats.totalResults)}
              color="from-blue-500 to-indigo-600"
              bgColor="bg-white"
              compact
              tone="blue"
            />
            <EnhancedStatCard
              icon={CheckCircle2}
              label="Bài đã chấm"
              value={formatNumber(stats.gradedCount)}
              color="from-emerald-500 to-teal-600"
              bgColor="bg-white"
              compact
              tone="green"
            />
            <EnhancedStatCard
              icon={Users}
              label="Đủ điều kiện cấp"
              value={formatNumber(stats.eligibleCount)}
              color="from-amber-500 to-orange-600"
              bgColor="bg-white"
              compact
              tone="yellow"
            />
            <EnhancedStatCard
              icon={Award}
              label="Tỉ lệ đã cấp"
              value={`${stats.issueRate}%`}
              color="from-purple-500 to-pink-600"
              bgColor="bg-white"
              compact
              tone="red"
            />
          </motion.div>

          <AdminCard title="Kết quả thi chính thức">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={resultsSearchTerm}
                  onChange={(event) => setResultsSearchTerm(event.target.value)}
                  placeholder="Tìm theo học viên, email, đề thi..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <SharedDropdown
                value={selectedResultStatus}
                onChange={setSelectedResultStatus}
                className="w-full min-w-[190px] lg:w-[220px]"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "graded", label: "Đã chấm" },
                  { value: "submitted", label: "Đã nộp" },
                  { value: "in_progress", label: "Đang làm" },
                  { value: "abandoned", label: "Bỏ dở" },
                  { value: "cancelled", label: "Đã hủy" },
                ]}
              />
              <SharedDropdown
                value={selectedResultExamTemplate}
                onChange={setSelectedResultExamTemplate}
                className="w-full min-w-[220px] lg:w-[320px]"
                options={[
                  { value: "all", label: "Tất cả đề thi chính thức" },
                  ...officialExamOptions,
                ]}
              />
            </div>

            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <Clock3 className="h-4 w-4" />
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-600">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải dữ liệu kết quả thi chính thức...
              </div>
            ) : filteredResults.length === 0 ? (
              <AdminEmptyState
                icon={XCircle}
                title="Không có kết quả phù hợp"
                description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <SharedTable>
                    <SharedTableHead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Học viên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Đề thi chính thức
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Điểm
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Thời gian nộp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Trạng thái
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Cờ gian lận
                        </th>
                      </tr>
                    </SharedTableHead>
                    <SharedTableBody>
                      {paginatedResults.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-semibold text-slate-800">{row.studentName}</p>
                            <p className="text-xs text-slate-500">{row.studentEmail}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-medium text-slate-800">{row.examName}</p>
                            <p className="text-xs text-slate-500">Bắt đầu: {formatDateTime(row.startedAt)}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="group relative inline-block">
                              <p className="text-sm font-bold text-blue-700">{formatNumber(row.totalScore)}</p>
                              <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden min-w-[150px] rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-lg group-hover:block">
                                <p className="font-semibold text-slate-700">Chi tiết điểm</p>
                                <p className="mt-1 text-slate-600">
                                  L: <span className="font-bold text-slate-900">{formatNumber(row.listeningScore)}</span>
                                </p>
                                <p className="text-slate-600">
                                  R: <span className="font-bold text-slate-900">{formatNumber(row.readingScore)}</span>
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500">Ngưỡng đạt: {row.passThreshold}</p>
                          </td>
                          <td className="px-4 py-3 align-top text-sm text-slate-600">
                            {formatDateTime(row.submittedAt)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge
                              toneClassName={getResultStatusClass(row.status)}
                              label={getResultStatusLabel(row.status)}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            {row.hasViolation ? (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/admin/proctoring?userId=${encodeURIComponent(
                                      row.userId,
                                    )}&examId=${encodeURIComponent(row.id)}`,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Dấu hiệu ({row.violationCount})
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                Bình thường
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </SharedTableBody>
                  </SharedTable>
                </div>
              </div>
            )}

            {!loading && filteredResults.length > 0 ? (
              <AdminPagination
                className="mt-4"
                page={resultsPage}
                totalPages={resultsTotalPages}
                total={filteredResults.length}
                limit={PAGE_SIZE}
                onPageChange={setResultsPage}
                itemLabel="kết quả"
              />
            ) : null}
          </AdminCard>
        </>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <EnhancedStatCard
              icon={Users}
              label="Học viên đủ điều kiện"
              value={formatNumber(stats.eligibleCount)}
              color="from-amber-500 to-orange-600"
              bgColor="bg-white"
              compact
              tone="yellow"
            />
            <EnhancedStatCard
              icon={Award}
              label="Đã cấp chứng chỉ"
              value={formatNumber(rows.filter((row) => row.issueStatus === "issued").length)}
              color="from-blue-500 to-indigo-600"
              bgColor="bg-white"
              compact
              tone="blue"
            />
            <EnhancedStatCard
              icon={Clock3}
              label="Chờ cấp chứng chỉ"
              value={formatNumber(rows.filter((row) => row.isEligible && row.issueStatus === "not_issued").length)}
              color="from-rose-500 to-pink-600"
              bgColor="bg-white"
              compact
              tone="red"
            />
            <EnhancedStatCard
              icon={CheckCircle2}
              label="Tỉ lệ hoàn tất"
              value={`${stats.issueRate}%`}
              color="from-emerald-500 to-teal-600"
              bgColor="bg-white"
              compact
              tone="green"
            />
          </motion.div>

          <AdminCard
            title="Cấp chứng chỉ cho học viên đủ điều kiện"
            rightSlot={
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleBulkIssue()}
                disabled={
                  bulkIssuing ||
                  issuingAttemptId !== null ||
                  filteredIssuanceRows.every((row) => row.issueStatus === "issued")
                }
              >
                <Send className="h-4 w-4" />
                {bulkIssuing ? "Đang cấp..." : "Cấp hàng loạt"}
              </button>
            }
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={issuanceSearchTerm}
                  onChange={(event) => setIssuanceSearchTerm(event.target.value)}
                  placeholder="Tìm học viên đủ điều kiện..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <SharedDropdown
                value={selectedIssuanceStatus}
                onChange={setSelectedIssuanceStatus}
                className="w-full min-w-[190px] lg:w-[220px]"
                options={[
                  { value: "all", label: "Tất cả trạng thái cấp" },
                  { value: "not_issued", label: "Chưa cấp" },
                  { value: "issued", label: "Đã cấp" },
                ]}
              />
              <SharedDropdown
                value={selectedIssuanceExamTemplate}
                onChange={setSelectedIssuanceExamTemplate}
                className="w-full min-w-[220px] lg:w-[320px]"
                options={[
                  { value: "all", label: "Tất cả đề thi chính thức" },
                  ...officialExamOptions,
                ]}
              />
            </div>

            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <Clock3 className="h-4 w-4" />
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-600">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải dữ liệu cấp chứng chỉ...
              </div>
            ) : filteredIssuanceRows.length === 0 ? (
              <AdminEmptyState
                icon={ShieldCheck}
                title="Chưa có học viên đủ điều kiện"
                description="Hệ thống sẽ hiển thị tại đây các bài thi chính thức đã đạt ngưỡng cấp chứng chỉ."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <SharedTable>
                    <SharedTableHead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Học viên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Đề thi chính thức
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Điểm đạt
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Trạng thái cấp
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Thao tác
                        </th>
                      </tr>
                    </SharedTableHead>
                    <SharedTableBody>
                      {paginatedIssuanceRows.map((row) => (
                        <tr key={`${row.id}-issuance`} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-semibold text-slate-800">{row.studentName}</p>
                            <p className="text-xs text-slate-500">{row.studentEmail}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-medium text-slate-800">{row.examName}</p>
                            <p className="text-xs text-slate-500">Nộp bài: {formatDateTime(row.submittedAt)}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-bold text-emerald-700">{formatNumber(row.totalScore)}</p>
                            <p className="text-xs text-slate-500">Đủ điều kiện cấp chứng chỉ</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge
                              toneClassName={getIssueStatusClass(row.issueStatus)}
                              label={getIssueStatusLabel(row.issueStatus)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            {row.issueStatus === "issued" ? (
                              <button
                                type="button"
                                className="btn-secondary text-sm"
                                onClick={() => setPreviewRow(row)}
                              >
                                <Eye className="h-4 w-4" />
                                Xem chứng chỉ
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-primary text-sm"
                                onClick={() => void handleIssueCertificate(row)}
                                disabled={issuingAttemptId !== null || bulkIssuing}
                              >
                                {issuingAttemptId === row.id ? "Đang cấp..." : "Cấp chứng chỉ"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </SharedTableBody>
                  </SharedTable>
                </div>
              </div>
            )}

            {!loading && filteredIssuanceRows.length > 0 ? (
              <AdminPagination
                className="mt-4"
                page={issuancePage}
                totalPages={issuanceTotalPages}
                total={filteredIssuanceRows.length}
                limit={PAGE_SIZE}
                onPageChange={setIssuancePage}
                itemLabel="học viên"
              />
            ) : null}
          </AdminCard>
        </>
      )}

      {previewRegistration ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={() => setPreviewRegistration(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewRegistration(null)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-700"
              aria-label="Đóng xem đăng ký"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-900">Chi tiết đăng ký thi chính thức</p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {previewRegistration.studentName} · {previewRegistration.studentEmail}
                  </p>
                </div>
                <StatusBadge
                  toneClassName={getRegStatusClass(previewRegistration.status)}
                  label={getRegStatusLabel(previewRegistration.status)}
                />
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
              {(() => {
                const meta: any = previewRegistration.metadata ?? {};
                const profile = meta?.certificateProfile ?? null;
                const confirmationEmailError =
                  typeof meta?.confirmationEmailError === "string" && meta.confirmationEmailError.trim() !== ""
                    ? meta.confirmationEmailError
                    : null;

                const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <div className="text-sm font-semibold text-slate-900">{value}</div>
                  </div>
                );

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                      <Field label="Đề thi" value={previewRegistration.examName} />
                      <Field label="Mã đề" value={previewRegistration.examCode ? previewRegistration.examCode : "—"} />
                      <Field label="Ngày thi" value={formatDateTime(previewRegistration.examDate)} />
                      <Field label="Đăng ký lúc" value={formatDateTime(previewRegistration.registeredAt)} />
                      <Field
                        label="Xác nhận email"
                        value={
                          previewRegistration.confirmationSentAt
                            ? formatDateTime(previewRegistration.confirmationSentAt)
                            : "Chưa gửi"
                        }
                      />
                      <Field
                        label="Nhắc lịch"
                        value={previewRegistration.reminderSentAt ? formatDateTime(previewRegistration.reminderSentAt) : "Chưa gửi"}
                      />
                    </div>

                    {confirmationEmailError ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">Lỗi gửi email xác nhận</p>
                        <p className="mt-1 break-words text-sm text-amber-800">{confirmationEmailError}</p>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-bold text-slate-900">Thông tin người đăng ký (snapshot)</p>
                      {profile ? (
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Họ tên" value={profile.fullName ?? "—"} />
                            <Field label="CCCD/CMND" value={profile.identityNumber ?? "—"} />
                            <Field label="Ngày sinh" value={profile.birthday ?? "—"} />
                            <Field label="SĐT" value={profile.phone ?? "—"} />
                            <div className="sm:col-span-2">
                              <Field label="Địa chỉ" value={profile.address ?? "—"} />
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">Ảnh đại diện</p>
                            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                              {previewRegistrationAvatarUrl ? (
                                <img
                                  src={previewRegistrationAvatarUrl}
                                  alt={`Avatar của ${profile.fullName ?? "học viên"}`}
                                  className="h-[220px] w-full object-cover"
                                  loading="lazy"
                                  onError={() => setPreviewRegistrationAvatarUrl("")}
                                />
                              ) : (
                                <div className="flex h-[220px] w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
                                  Chưa có ảnh
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">Không có dữ liệu snapshot trong metadata.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}

      {previewRow ? (() => {
        const credInfo = credentialInfoMap[previewRow.id] ?? null;
        const identificationNumber =
          previewRow.profileIdentityNumber ??
          (credInfo?.serialNumber
            ? credInfo.serialNumber
            : formatCertificateCode(previewRow.id).replace("TM-", "20"));
        const birthdayYmd =
          formatBirthdayYmd(previewRow.profileBirthday) ?? "----/--/--";
        return (
          <div
            className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
            onClick={() => setPreviewRow(null)}
          >
            <div
              className="relative my-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative overflow-hidden bg-[#eef4fb] p-5 md:p-7">
                <div
                  ref={certificateNodeRef}
                  className="relative overflow-hidden rounded-xl border-[3px] border-[#cf9f47] shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
                  style={{
                    backgroundColor: "#f8f4ea",
                    // Watermark "TOEIC MASTER" cheo xeo theo phong cach Word.
                    // Dung inline SVG -> html2canvas render duoc chinh xac, khong phu
                    // thuoc stacking context hay z-index.
                    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet"><g transform="translate(640 360) rotate(-22)"><text x="0" y="0" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="110" font-weight="900" letter-spacing="8" fill="rgba(207,159,71,0.13)" stroke="rgba(207,159,71,0.06)" stroke-width="1">TOEIC MASTER</text><text x="0" y="70" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="14" fill="rgba(207,159,71,0.10)">OFFICIAL CERTIFICATE</text></g></svg>`,
                    )}")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "70% auto",
                  }}
                >
                  <div className="border-b-2 border-[#d6b16f] px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <img
                        src="/logo/logo_website.svg"
                        alt="TOEIC MASTER logo"
                        className="h-14 w-auto object-contain"
                        crossOrigin="anonymous"
                      />
                      <div className="flex-1 rounded-full bg-[#d0a24d] px-5 py-1 text-center">
                        <p className="text-[11px] font-extrabold uppercase leading-4 tracking-[0.12em] text-[#1f2a44]">
                          Listening and Reading
                        </p>
                        <p className="text-[17px] font-black uppercase leading-6 tracking-[0.06em] text-[#1f2a44]">
                          Official Score Certificate
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1.55fr_1fr_160px] border-y-2 border-[#d6b16f]">
                    <div className="grid grid-cols-[116px_1fr] border-r-2 border-[#3f3f3f] p-3">
                      <div className="flex flex-col items-stretch gap-2">
                        <div className="flex h-[170px] items-center justify-center overflow-hidden border border-[#3f3f3f] bg-[#d6d6d6]">
                          {previewAvatarDataUrl || previewRow.profileAvatarUrl ? (
                            <img
                              src={previewAvatarDataUrl ?? previewRow.profileAvatarUrl ?? ""}
                              alt={`${previewRow.studentName} avatar`}
                              className="h-full w-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="flex h-[126px] w-[86px] items-center justify-center rounded-full bg-white/95 text-[10px] font-semibold uppercase tracking-wider text-[#5f5850]">
                              {previewAssetsLoading ? "..." : "No photo"}
                            </div>
                          )}
                        </div>
                        <div className="-mx-2 flex flex-1 items-center justify-center pt-1">
                          <img
                            src={ANTI_COUNTERFEIT_SEAL_SRC}
                            alt="Anti-counterfeit security seal"
                            className="h-[140px] w-[140px] select-none object-contain"
                            draggable={false}
                          />
                        </div>
                      </div>

                      <div className="ml-3 border border-[#3f3f3f]">
                        <div className="border-b border-[#3f3f3f] px-3 py-1.5">
                          <p className="text-[22px] font-semibold leading-7 text-black">
                            {previewRow.studentName}
                          </p>
                          <p className="text-[12px] text-black/85">Name</p>
                        </div>

                        <div className="grid grid-cols-2 border-b border-[#3f3f3f]">
                          <div className="border-r border-[#3f3f3f] px-3 py-1.5">
                            <p className="break-all text-[14px] font-semibold leading-5 text-black">
                              {identificationNumber}
                            </p>
                            <p className="text-[12px] leading-4 text-black/85">
                              Identification
                              <br />
                              Number
                            </p>
                          </div>
                          <div className="px-3 py-1.5">
                            <p className="text-[22px] font-semibold leading-7 text-black">
                              {birthdayYmd}
                            </p>
                            <p className="text-[12px] leading-4 text-black/85">
                              Date of Birth
                              <br />
                              (yyyy/mm/dd)
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2">
                          <div className="border-r border-[#3f3f3f] px-3 py-1.5">
                            <p className="text-[22px] font-semibold leading-7 text-black">
                              {formatDateYmd(previewRow.submittedAt)}
                            </p>
                            <p className="text-[12px] leading-4 text-black/85">
                              Test Date
                              <br />
                              (yyyy/mm/dd)
                            </p>
                          </div>
                          <div className="px-3 py-1.5">
                            <p className="text-[22px] font-semibold leading-7 text-black">
                              {addYearsToYmd(previewRow.submittedAt, 2)}
                            </p>
                            <p className="text-[12px] leading-4 text-black/85">
                              Valid Until
                              <br />
                              (yyyy/mm/dd)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-r-2 border-[#3f3f3f]">
                      {(() => {
                        const domain = estimateToeicDomainScores(previewRow.totalScore);
                        const listeningScore =
                          previewRow.listeningScore > 0
                            ? previewRow.listeningScore
                            : domain.listening;
                        const readingScore =
                          previewRow.readingScore > 0 ? previewRow.readingScore : domain.reading;
                        const renderDomain = (
                          title: "LISTENING" | "READING",
                          value: number,
                          withBottomBorder: boolean,
                        ) => (
                          <div
                            className={`px-4 py-3 ${withBottomBorder ? "border-b border-[#3f3f3f]" : ""}`}
                          >
                            <div className="inline-block bg-[#d0a24d] px-3 py-0.5 text-[22px] font-black leading-7 tracking-[0.04em] text-[#1f2a44]">
                              {title}
                            </div>
                            <div className="mt-3 flex items-end justify-between">
                              <p className="text-[24px] font-semibold leading-8 text-black">Your score</p>
                              <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-[3px] border-black bg-white text-[30px] font-black leading-none text-black">
                                {value}
                              </div>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[24px] font-semibold text-black">5</span>
                              <div className="h-3 flex-1 rounded-[2px] bg-[#d8d8d8]">
                                <div
                                  className="h-3 rounded-[2px] bg-[#232629]"
                                  style={{ width: `${Math.max(1, Math.min(100, (value / 495) * 100))}%` }}
                                />
                              </div>
                              <span className="text-[24px] font-semibold text-black">495</span>
                            </div>
                          </div>
                        );

                        return (
                          <>
                            {renderDomain("LISTENING", listeningScore, true)}
                            {renderDomain("READING", readingScore, false)}
                          </>
                        );
                      })()}
                    </div>

                    <div className="flex flex-col items-center justify-between p-3 text-center">
                      <div className="inline-block bg-[#d0a24d] px-3 py-0.5 text-[22px] font-black leading-7 tracking-[0.04em] text-[#1f2a44]">
                        TOTAL
                        <br />
                        SCORE
                      </div>
                      <div className="mt-2 flex h-[84px] w-[84px] items-center justify-center rounded-full border-[4px] border-black bg-white">
                        <span className="text-[34px] font-black leading-none text-black">
                          {formatNumber(previewRow.totalScore)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col items-center gap-1">
                        {previewQrDataUrl || credInfo?.qrImageUrl ? (
                          <img
                            src={previewQrDataUrl ?? credInfo?.qrImageUrl ?? ""}
                            alt="QR xác thực chứng chỉ"
                            className="h-[90px] w-[90px] rounded-md border border-[#3f3f3f] bg-white object-contain p-1"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="flex h-[90px] w-[90px] items-center justify-center rounded-md border border-dashed border-[#3f3f3f] bg-white/70 text-center text-[9px] font-semibold uppercase tracking-wider text-[#5f5850]">
                            {previewRow.issueStatus === "issued"
                              ? loadingCredentialFor === previewRow.id ||
                                previewAssetsLoading
                                ? "Loading QR..."
                                : "QR chưa sẵn sàng"
                              : "QR sẽ có sau khi cấp"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden px-4 py-2">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_8px_8px,_rgba(199,140,39,0.35)_2px,transparent_2.5px)] [background-size:16px_16px] opacity-45" />
                    <div className="relative flex items-center justify-between text-[11px] font-medium text-[#5f5850]">
                      <span>
                        Official Representatives of TOEIC MASTER · Vietnam · Lao · Cambodia · Myanmar
                      </span>
                      <span>{credInfo?.serialNumber ?? "VN2001"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-1 text-xs text-slate-600">
                    <p>
                      <span className="font-bold text-slate-800">Serial:</span>{" "}
                      <span className="break-all font-mono">
                        {credInfo?.serialNumber ?? "(chưa cấp)"}
                      </span>
                    </p>
                    {credInfo?.ipfsCid ? (
                      <p>
                        <span className="font-bold text-slate-800">IPFS:</span>{" "}
                        <span className="break-all font-mono text-[11px]">
                          {credInfo.ipfsCid}
                        </span>
                      </p>
                    ) : null}
                    {credInfo?.qrUrl ? (
                      <p>
                        <span className="font-bold text-slate-800">Verify URL:</span>{" "}
                        <a
                          href={credInfo.qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-blue-600 underline"
                        >
                          {credInfo.qrUrl}
                        </a>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {credInfo?.ipfsGatewayUrl ? (
                      <a
                        href={credInfo.ipfsGatewayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Xem trên IPFS
                      </a>
                    ) : null}
                    {credInfo?.qrUrl ? (
                      <a
                        href={credInfo.qrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Mở trang verify
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDownloadCertificate()}
                      disabled={downloadingCert}
                      className="btn-primary text-xs"
                    >
                      {downloadingCert ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {downloadingCert ? "Đang tải..." : "Tải xuống PNG"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {confirmIssueRow ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          onClick={() => setConfirmIssueRow(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận cấp chứng chỉ
                </h3>
              </div>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
              <p>Bạn có chắc chắn muốn cấp chứng chỉ cho học viên này?</p>
              <div className="rounded-lg bg-slate-50 p-3">
                <p>
                  <span className="font-bold">Học viên:</span>{" "}
                  {confirmIssueRow.studentName}
                </p>
                <p>
                  <span className="font-bold">Email:</span>{" "}
                  {confirmIssueRow.studentEmail}
                </p>
                <p>
                  <span className="font-bold">Đề thi:</span>{" "}
                  {confirmIssueRow.examName}
                </p>
                <p>
                  <span className="font-bold">Điểm:</span>{" "}
                  <span className="text-emerald-700">
                    {formatNumber(confirmIssueRow.totalScore)}
                  </span>
                </p>
              </div>
              <p className="text-xs italic text-slate-500">
                Khi cấp: hệ thống sẽ tạo W3C Verifiable Credential, hash SHA-256,
                pin payload lên IPFS (Pinata), sinh ảnh QR (chứa URL verify công khai)
                và lưu trên S3. Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setConfirmIssueRow(null)}
                className="btn-secondary text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmIssue()}
                className="btn-primary text-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Xác nhận cấp
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmBulkOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          onClick={() => setConfirmBulkOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Cấp chứng chỉ hàng loạt
                </h3>
              </div>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
              <p>
                Sẽ cấp chứng chỉ cho{" "}
                <span className="font-bold text-blue-700">
                  {
                    filteredIssuanceRows.filter(
                      (r) => r.issueStatus === "not_issued" && r.isEligible,
                    ).length
                  }
                </span>{" "}
                học viên đủ điều kiện. Mỗi học viên sẽ được tạo W3C VC + pin IPFS
                + sinh QR (có thể mất vài giây mỗi người).
              </p>
              <p className="text-xs italic text-slate-500">
                Thao tác không thể hoàn tác. Nếu có lỗi giữa chừng, những chứng chỉ
                đã cấp thành công vẫn được giữ.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setConfirmBulkOpen(false)}
                className="btn-secondary text-sm"
                disabled={bulkIssuing}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void performBulkIssue()}
                className="btn-primary text-sm"
                disabled={bulkIssuing}
              >
                {bulkIssuing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {bulkIssuing ? "Đang cấp..." : "Xác nhận cấp hàng loạt"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}