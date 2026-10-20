import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const user = await getCurrentUser();
  if (user) redirect(next);
  return <AuthForm mode="sign-up" next={next} />;
}
