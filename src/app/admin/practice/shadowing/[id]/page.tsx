"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Headphones, Loader2, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { AdminCard, AdminEmptyState } from "@/components/admin";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

type ShadowingContent = {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl?: string | null;
  level: string;
  topics: string[];
  status: "draft" | "published" | "archived";
};

type ShadowingSegment = {
  order: number;
  startSec: number;
  endSec: number;
  textEn: string;
  textVi?: string | null;
};

function unwrap(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function statusBadge(status?: ShadowingContent["status"]) {
  if (!status) return { label: "Draft", className: "bg-amber-500/90 text-white" };
  if (status === "published") return { label: "Published", className: "bg-emerald-500/90 text-white" };
  if (status === "archived") return { label: "Archived", className: "bg-slate-900/55 text-white" };
  return { label: "Draft", className: "bg-amber-500/90 text-white" };
}

export default function AdminShadowingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id ?? "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState<ShadowingContent | null>(null);
  const [segments, setSegments] = useState<ShadowingSegment[]>([]);

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("A1");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [topicsText, setTopicsText] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [segmentPage, setSegmentPage] = useState(1);
  const segmentPageSize = 5;

  const embedUrl = useMemo(() => {
    const yid = content?.youtubeId;
    if (!yid) return "";
    return `https://www.youtube.com/embed/${encodeURIComponent(yid)}`;
  }, [content?.youtubeId]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.admin.shadowing.getDetail(id);
      const data = unwrap(res);
      const c = data?.content as ShadowingContent;
      const segs = (data?.segments ?? []) as any[];
      setContent(c);
      setTitle(c?.title ?? "");
      setLevel(c?.level ?? "A1");
      setStatus((c?.status ?? "draft") as any);
      setTopicsText(Array.isArray(c?.topics) ? c.topics.join(", ") : "");
      setSegments(
        segs
          .map((s) => ({
            order: Number(s.order) || 0,
            startSec: Number(s.startSec) || 0,
            endSec: Number(s.endSec) || 0,
            textEn: String(s.textEn ?? ""),
            textVi: s.textVi == null ? null : String(s.textVi),
          }))
          .filter((x) => x.order > 0)
          .sort((a, b) => a.order - b.order),
      );
    } catch (e: any) {
      setError(e?.message ?? "Không tải được chi tiết Shadowing.");
      setContent(null);
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setSegmentPage(1);
  }, [id]);

  const topics = useMemo(() => {
    return Array.from(
      new Set(
        topicsText
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ).slice(0, 10);
  }, [topicsText]);

  const segmentsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil((segments?.length ?? 0) / segmentPageSize));
  }, [segments?.length]);

  const safeSegmentPage = Math.min(Math.max(1, segmentPage), segmentsTotalPages);

  const pageSegments = useMemo(() => {
    const start = (safeSegmentPage - 1) * segmentPageSize;
    return segments.slice(start, start + segmentPageSize);
  }, [safeSegmentPage, segments]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/practice/shadowing"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-blue-800 admin-dark:text-[#7aa2ff] admin-dark:hover:text-[#9bb8ff]"
          >
            <ArrowLeft className="h-4 w-4" />
            Danh sách
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="heading-lg truncate">{content?.title ?? "Shadowing"}</h1>
            {content ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-extrabold tracking-wide shadow-sm ${statusBadge(
                  content.status,
                ).className}`}
              >
                {statusBadge(content.status).label}
              </span>
            ) : null}
          </div>
          {content?.youtubeId ? (
            <p className="mt-1 text-sm text-slate-500 admin-dark:text-[var(--admin-muted)]">
              YouTube ID: <span className="font-semibold text-slate-700 admin-dark:text-[var(--admin-text)]">{content.youtubeId}</span>
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* actions removed as requested */}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            disabled={saving || loading || !content}
            onClick={async () => {
              if (!content) return;
              setSaving(true);
              setError(null);
              try {
                await apiClient.admin.shadowing.publish(content.id);
                await load();
              } catch (e: any) {
                setError(e?.message ?? "Publish thất bại.");
              } finally {
                setSaving(false);
              }
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Publish
          </button>
        </div>
      </div>

      {/* delete dialog removed as requested */}

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600 admin-dark:text-[var(--admin-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải...
        </div>
      ) : !content ? (
        <AdminEmptyState
          icon={Headphones}
          title="Không tìm thấy nội dung"
          description="Nội dung Shadowing này không tồn tại hoặc bạn không có quyền truy cập."
          action={
            <button type="button" className="btn-secondary" onClick={() => router.push("/admin/practice/shadowing")}>
              Quay lại danh sách
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(420px,1fr)_minmax(420px,1fr)]">
          <div className="space-y-4">
            <AdminCard>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">Tiêu đề</p>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-modern w-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">Level</p>
                    <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-modern w-full">
                      <option value="A1">A1</option>
                      <option value="A2">A2</option>
                      <option value="B1">B1</option>
                      <option value="B2">B2</option>
                    </select>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">Trạng thái</p>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="input-modern w-full"
                    >
                      <option value="draft">Chưa publish</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-600 admin-dark:text-[var(--admin-muted)]">
                    Topics (phân tách bằng dấu phẩy)
                  </p>
                  <input
                    value={topicsText}
                    onChange={(e) => setTopicsText(e.target.value)}
                    className="input-modern w-full"
                    placeholder="daily, toeic, work..."
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {(topics ?? []).length ? (
                      topics.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 admin-dark:border-[var(--admin-border)] admin-dark:bg-[#15213b] admin-dark:text-[var(--admin-muted)]"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">Chưa có topics</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      await apiClient.admin.shadowing.update(content.id, {
                        title: title.trim() || undefined,
                        level,
                        status,
                        topics,
                      });
                      await load();
                    } catch (e: any) {
                      setError(e?.message ?? "Không lưu được metadata.");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                  Lưu
                </button>
              </div>
            </AdminCard>

            <AdminCard>
              <p className="text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">YouTube</p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title="YouTube"
                  />
                ) : null}
              </div>
            </AdminCard>
          </div>

          <div className="space-y-4">
            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900 admin-dark:text-[var(--admin-text)]">Segments</p>
                  <p className="mt-1 text-xs text-slate-500 admin-dark:text-[var(--admin-muted)]">
                    Chỉnh sửa EN/VI và timestamp. Sau đó bấm “Lưu segments”.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2"
                  disabled={saving || segments.length === 0}
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      await apiClient.admin.shadowing.replaceSegments(content.id, {
                        segments: segments.map((s) => ({
                          order: s.order,
                          startSec: s.startSec,
                          endSec: s.endSec,
                          textEn: s.textEn,
                          textVi: s.textVi ?? null,
                        })),
                      });
                      await load();
                    } catch (e: any) {
                      setError(e?.message ?? "Không lưu được segments.");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                  Lưu segments
                </button>
              </div>

              <div className="mt-3 overflow-auto rounded-2xl border border-slate-200 admin-dark:border-[var(--admin-border)]">
                <table className="min-w-[780px] w-full border-collapse bg-white text-sm admin-dark:bg-[var(--admin-surface)]">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-600 admin-dark:bg-[var(--admin-surface-2)] admin-dark:text-[var(--admin-muted)]">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-left">Time</th>
                      <th className="px-2 py-2 text-left">EN</th>
                      <th className="px-2 py-2 text-left">VI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSegments.map((s, localIdx) => {
                      const idx = (safeSegmentPage - 1) * segmentPageSize + localIdx;
                      return (
                      <tr
                        key={`${s.order}-${idx}`}
                        className="border-t border-slate-200 transition hover:bg-slate-50 admin-dark:border-[var(--admin-border)] admin-dark:hover:bg-[#15213b]"
                      >
                        <td className="px-2 py-2 align-top font-bold text-slate-700 admin-dark:text-[var(--admin-text)]">
                          {s.order}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <div className="flex items-center gap-1.5">
                            <input
                              value={s.startSec}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setSegments((prev) => {
                                  const next = prev.slice();
                                  next[idx] = { ...next[idx], startSec: Number.isFinite(v) ? v : 0 };
                                  return next;
                                });
                              }}
                              className="input-modern w-[78px]"
                              type="number"
                              min={0}
                            />
                            <span className="text-xs text-slate-400">→</span>
                            <input
                              value={s.endSec}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setSegments((prev) => {
                                  const next = prev.slice();
                                  next[idx] = { ...next[idx], endSec: Number.isFinite(v) ? v : 0 };
                                  return next;
                                });
                              }}
                              className="input-modern w-[78px]"
                              type="number"
                              min={0}
                            />
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {fmtTime(s.startSec)} → {fmtTime(s.endSec)}
                          </div>
                        </td>
                        <td className="px-2 py-2 align-top">
                          <textarea
                            value={s.textEn}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSegments((prev) => {
                                const next = prev.slice();
                                next[idx] = { ...next[idx], textEn: v };
                                return next;
                              });
                            }}
                            rows={3}
                            className="input-modern w-full min-h-[80px] resize-y px-2.5 py-2 text-[0.92rem] leading-[1.35]"
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <textarea
                            value={s.textVi ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSegments((prev) => {
                                const next = prev.slice();
                                next[idx] = { ...next[idx], textVi: v };
                                return next;
                              });
                            }}
                            rows={3}
                            className="input-modern w-full min-h-[80px] resize-y px-2.5 py-2 text-[0.92rem] leading-[1.35]"
                          />
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-500 admin-dark:text-[var(--admin-muted)]">
                <span>
                  Hiển thị{" "}
                  {segments.length === 0 ? 0 : (safeSegmentPage - 1) * segmentPageSize + 1}-
                  {Math.min(safeSegmentPage * segmentPageSize, segments.length)} / {segments.length}
                </span>
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 admin-dark:border-[var(--admin-border)] admin-dark:bg-[var(--admin-surface)]">
                  <button
                    type="button"
                    className="btn-secondary h-9 w-9 px-0"
                    onClick={() => setSegmentPage((p) => Math.max(1, p - 1))}
                    disabled={safeSegmentPage <= 1}
                    aria-label="Trang trước"
                    title="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-700 admin-dark:text-[var(--admin-text)]">
                    {safeSegmentPage}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary h-9 w-9 px-0"
                    onClick={() => setSegmentPage((p) => Math.min(segmentsTotalPages, p + 1))}
                    disabled={safeSegmentPage >= segmentsTotalPages}
                    aria-label="Trang sau"
                    title="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
      )}
    </div>
  );
}

