import type { Database, ProfileRole } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type NullableProfile = Pick<Profile, "role"> | null | undefined;

export function isAdmin(profile: NullableProfile) {
  return profile?.role === "admin";
}

export function isUser(profile: NullableProfile) {
  return profile?.role === "user";
}

export function canManageGlobalSettings(role: ProfileRole | null | undefined) {
  return role === "admin";
}

export function canExportData(role: ProfileRole | null | undefined) {
  return role === "admin";
}
