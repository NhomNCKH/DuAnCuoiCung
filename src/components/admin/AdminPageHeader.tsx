import React from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({ title, subtitle, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={`surface flex items-center justify-between gap-4 p-5 ${className ?? ""}`}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

