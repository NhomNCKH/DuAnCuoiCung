import React from "react";

interface AdminCardProps {
  title?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AdminCard({ title, rightSlot, children, className }: AdminCardProps) {
  return (
    <section className={`surface p-4 ${className ?? ""}`}>
      {title || rightSlot ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title ? <h2 className="text-base font-semibold text-slate-900">{title}</h2> : <div />}
          {rightSlot ? <div className="flex flex-wrap items-center gap-2">{rightSlot}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

