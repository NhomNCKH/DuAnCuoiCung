import React from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({ title, subtitle, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={`surface flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between ${className ?? ""}`}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle != null && subtitle !== "" ? (
          <div className="mt-1.5 text-sm text-slate-500">{subtitle}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">{actions}</div>
      ) : null}
    </div>
  );
}

