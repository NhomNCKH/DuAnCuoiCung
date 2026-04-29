"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPracticeWritingCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/practice/writing");
  }, [router]);

  return null;
}

