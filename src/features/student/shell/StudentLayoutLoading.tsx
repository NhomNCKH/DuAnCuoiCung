"use client";

/** Spinner đồng bộ kiểu admin loading. */
export function StudentLayoutLoading() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
    </div>
  );
}
