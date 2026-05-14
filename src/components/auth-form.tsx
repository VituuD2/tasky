"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { signIn, signUp } from "@/app/auth/actions";

type AuthFormProps = {
  mode: "login" | "signup";
  action: typeof signIn | typeof signUp;
  notice?: string;
};

const initialState = { message: "" };

export function AuthForm({ mode, action, notice }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="space-y-4">
      {isSignup ? (
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Nome
          </span>
          <input
            name="full_name"
            autoComplete="name"
            className="h-11 w-full border border-white/10 bg-white/[0.035] px-3 text-sm text-stone-100 outline-none transition focus:border-stone-300/40 focus:bg-white/[0.06]"
            placeholder="Nome completo"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 w-full border border-white/10 bg-white/[0.035] px-3 text-sm text-stone-100 outline-none transition focus:border-stone-300/40 focus:bg-white/[0.06]"
          placeholder="nome@empresa.com"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          Senha
        </span>
        <input
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={6}
          className="h-11 w-full border border-white/10 bg-white/[0.035] px-3 text-sm text-stone-100 outline-none transition focus:border-stone-300/40 focus:bg-white/[0.06]"
          placeholder="Minimo de 6 caracteres"
        />
      </label>

      {isSignup ? (
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Confirmar senha
          </span>
          <input
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="h-11 w-full border border-white/10 bg-white/[0.035] px-3 text-sm text-stone-100 outline-none transition focus:border-stone-300/40 focus:bg-white/[0.06]"
            placeholder="Repita a senha"
          />
        </label>
      ) : null}

      {notice ? (
        <p className="border border-stone-300/20 bg-white/[0.045] px-3 py-2 text-sm text-stone-200">
          {notice}
        </p>
      ) : null}

      {state.message ? (
        <p className="border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-stone-100 px-4 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Processando" : isSignup ? "Criar conta" : "Entrar"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        {isSignup ? "Ja tem conta?" : "Ainda nao tem conta?"}{" "}
        <Link className="text-stone-200 underline-offset-4 hover:underline" href={isSignup ? "/login" : "/signup"}>
          {isSignup ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}
