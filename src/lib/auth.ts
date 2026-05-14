import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { isAdmin, type Profile } from "@/lib/permissions";

type CurrentProfile = {
  user: User | null;
  profile: Profile | null;
};

type AuthenticatedProfile = {
  user: User;
  profile: Profile | null;
};

export async function getCurrentProfile(): Promise<CurrentProfile> {
  if (!hasSupabaseEnv()) {
    return { user: null, profile: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile ?? null };
}

export async function requireUser(): Promise<AuthenticatedProfile> {
  const current = await getCurrentProfile();

  if (!current.user) {
    redirect("/login");
  }

  return {
    user: current.user,
    profile: current.profile,
  };
}

export async function requireAdmin(): Promise<AuthenticatedProfile> {
  const current = await requireUser();

  if (!isAdmin(current.profile)) {
    redirect("/");
  }

  return current;
}
