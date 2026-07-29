import { createClient } from "@/lib/supabase/server"

const ADMIN_ROLES = new Set(["admin", "superadmin"])

export type AdminProfile = {
  userId: string
  role: "admin" | "superadmin"
}

export type AdminProfileResult =
  | { status: "ok"; profile: AdminProfile }
  | { status: "unauthenticated" }
  | { status: "unauthorized" }

/**
 * Resolves the current session's admin identity. Falls back to a profiles
 * lookup when the role claim isn't in the JWT yet (the
 * custom_access_token_hook may not be enabled) rather than trusting the
 * claim alone -- this is the same fallback app/auth/admin/actions.ts uses.
 */
export async function resolveAdminProfile(): Promise<AdminProfileResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return { status: "unauthenticated" }

  const claimRole = claims.app_metadata?.role as string | undefined
  let role = claimRole
  if (!role) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", claims.sub)
      .single()
    role = profile?.role
  }

  if (!role || !ADMIN_ROLES.has(role)) return { status: "unauthorized" }

  return { status: "ok", profile: { userId: claims.sub, role: role as "admin" | "superadmin" } }
}

/** Returns null if the caller isn't authenticated / isn't admin-or-superadmin. */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  const result = await resolveAdminProfile()
  return result.status === "ok" ? result.profile : null
}

/** Throws if the current session isn't admin/superadmin. */
export async function requireAdmin(): Promise<AdminProfile> {
  const admin = await getAdminProfile()
  if (!admin) throw new Error("Not authorized for the admin area")
  return admin
}
