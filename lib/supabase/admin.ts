import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client for operations RLS can't allow (e.g. deleting an
 * auth.users row). Server-only — never import from a Client Component.
 * Requires SUPABASE_SERVICE_ROLE_KEY (never NEXT_PUBLIC_*) in .env.local.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
