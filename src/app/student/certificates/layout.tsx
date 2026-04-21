"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CalendarCheck2 } from "lucide-react";

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-gray-50"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

export default function CertificatesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const active = (href: string) => pathname === href;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Sidebar */}
      <aside className="surface h-fit p-4 lg:sticky lg:top-[88px]">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Thi chứng chỉ</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Quản lý đăng ký</p>
        </div>

        <div className="space-y-1">
          <NavItem
            href="/student/certificates/register"
            label="Đăng ký"
            active={active("/student/certificates/register")}
            icon={<CalendarCheck2 className="h-4 w-4" />}
          />
          <NavItem
            href="/student/certificates/history"
            label="Lịch sử đăng ký"
            active={active("/student/certificates/history")}
            icon={<ClipboardList className="h-4 w-4" />}
          />
        </div>

        <div className="mt-4 surface-soft rounded-xl p-3 text-xs text-slate-600">
          Email xác nhận sẽ được gửi ngay sau khi đăng ký. Đến đúng ngày thi, hệ thống sẽ nhắc thi lúc <strong>07:00</strong>.
        </div>
      </aside>

      {/* Content */}
      <section className="min-w-0">{children}</section>
    </div>
  );
}

