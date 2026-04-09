"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginRequiredModal } from "@/components/auth/LoginRequiredModal";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
  /** if true, always require auth (default) */
  requireAuth?: boolean;
};

export function ProtectedLink({
  href,
  className,
  children,
  requireAuth = true,
}: Props) {
  const { isAuthenticated, isLoading } = useAuth();
  const [open, setOpen] = useState(false);

  const shouldBlock = requireAuth && !isLoading && !isAuthenticated;

  return (
    <>
      <Link
        href={href}
        className={className}
        onClick={(e) => {
          if (!shouldBlock) return;
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Link>
      <LoginRequiredModal
        open={open}
        onClose={() => setOpen(false)}
        redirectTo={href}
      />
    </>
  );
}

