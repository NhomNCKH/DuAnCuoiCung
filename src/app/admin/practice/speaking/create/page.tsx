"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPracticeSpeakingCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/practice/speaking");
  }, [router]);

  return null;
}

