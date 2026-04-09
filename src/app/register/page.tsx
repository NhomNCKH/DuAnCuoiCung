import { redirect } from "next/navigation";
import {
  buildAuthRoute,
  getFirstQueryValue,
} from "@/lib/auth/routing";

interface RegisterPageProps {
  searchParams?: {
    redirect?: string | string[];
  };
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  redirect(
    buildAuthRoute({
      mode: "register",
      redirect: getFirstQueryValue(searchParams?.redirect),
    }),
  );
}
