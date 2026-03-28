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
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-semibold text-slate-900">{title}</h2> : <div />}
          {rightSlot}
        </div>
      ) : null}
      {children}
    </section>
  );
}

