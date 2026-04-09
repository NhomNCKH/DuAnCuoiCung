import { redirect } from "next/navigation";
import {
  buildAuthRoute,
  getFirstQueryValue,
} from "@/lib/auth/routing";

interface LoginPageProps {
  searchParams?: {
    redirect?: string | string[];
  };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  redirect(
    buildAuthRoute({
      mode: "login",
      redirect: getFirstQueryValue(searchParams?.redirect),
    }),
  );
}
