import { redirect } from "next/navigation";
import { signUp } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentProfile } from "@/lib/auth";

export default async function SignupPage() {
  const { user } = await getCurrentProfile();

  if (user) {
    redirect("/");
  }

  return (
    <AuthShell title="Criar conta" description="Cadastro simples com email e senha.">
      <AuthForm mode="signup" action={signUp} />
    </AuthShell>
  );
}
