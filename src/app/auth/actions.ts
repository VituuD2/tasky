"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type AuthState = {
  message: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv()) {
    return { message: "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY." };
  }

  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    return { message: "Informe email e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { message: "Confirme seu email antes de entrar." };
    }

    return { message: "Email ou senha incorretos." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv()) {
    return { message: "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY." };
  }

  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const passwordConfirmation = getString(formData, "password_confirmation");
  const fullName = getString(formData, "full_name");

  if (!email || !password || !passwordConfirmation) {
    return { message: "Informe email, senha e confirmacao de senha." };
  }

  if (password.length < 6) {
    return { message: "A senha precisa ter pelo menos 6 caracteres." };
  }

  if (password !== passwordConfirmation) {
    return { message: "As senhas nao conferem." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
      },
    },
  });

  if (error) {
    return { message: error.message };
  }

  if (!data.session) {
    redirect(
      "/login?message=Conta criada. Confirme seu email no Supabase Auth e depois entre com sua senha.",
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
