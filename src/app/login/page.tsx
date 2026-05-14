import { redirect } from "next/navigation";
import { signIn } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentProfile } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { user } = await getCurrentProfile();
  const params = await searchParams;

  if (user) {
    redirect("/");
  }

  return (
    <AuthShell title="Acesso" description="Entre com email e senha da empresa.">
      <AuthForm mode="login" action={signIn} notice={params.message} />
    </AuthShell>
  );
}
