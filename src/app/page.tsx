"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { buildAuthRoute, resolvePostAuthRedirect } from "@/lib/auth/routing";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace(resolvePostAuthRedirect(user?.role ?? null, null));
      return;
    }

    router.replace(buildAuthRoute({ mode: "login" }));
  }, [isAuthenticated, isLoading, router, user?.role]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
    </div>
  );
}

