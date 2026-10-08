import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <PageHeader title="Sign in" description="Optional. Signing in keeps your bets in sync across devices." backHref="/profile" />
      <Suspense fallback={null}>
        <LoginWithParams searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  return <LoginForm errorCode={error} />;
}
