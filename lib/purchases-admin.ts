import { createClient } from "@/lib/supabase/server"
import { getAdminProfile } from "@/lib/auth/require-admin"
import { paginated, rangeFor, type ListParams, type Paginated } from "@/lib/pagination"

/** Server-only admin data access for Purchase Management -- never import from a Client Component. */

export type TransactionStatus = "completed" | "pending" | "refunded" | "free"

export type AdminPurchase = {
  id: string
  learnerName: string
  learnerEmail: string
  initial: string
  courseTitle: string
  amount: number
  currency: string
  status: TransactionStatus
  createdAt: string
}

export type AdminPurchaseStats = {
  totalRevenue: number
  totalPurchases: number
  paidPurchases: number
}

export type AdminPurchaseFilters = { status: "all" | TransactionStatus }

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

/**
 * Reads the admin_transactions_list view (pagination migration), which
 * flattens learner name/email + course title onto each transaction row so a
 * single .or() can search across both -- PostgREST can't OR-filter across
 * two different embedded relations. course_created_by on the view replaces
 * the getOwnedCourseIdsOrNull() id-list filter used elsewhere in this file.
 */
export async function getAdminPurchaseList(p: ListParams<AdminPurchaseFilters>): Promise<Paginated<AdminPurchase>> {
  const supabase = await createClient()
  const admin = await getAdminProfile()

  let query = supabase.from("admin_transactions_list").select("*", { count: "exact" })
  if (admin && admin.role !== "superadmin") {
    query = query.eq("course_created_by", admin.userId)
  }
  if (p.q) {
    query = query.or(`learner_name.ilike.%${p.q}%,learner_email.ilike.%${p.q}%,course_title.ilike.%${p.q}%`)
  }
  if (p.filters.status !== "all") {
    query = query.eq("status", p.filters.status)
  }

  const [from, to] = rangeFor(p.page, p.pageSize)
  query = query.order("created_at", { ascending: p.dir === "asc" }).range(from, to)

  const { data, error, count } = await query

  if (error || !data) {
    console.error("getAdminPurchaseList failed:", error?.message)
    return paginated([], 0, p)
  }

  const rows = data.map((row) => {
    const name = row.learner_name
    return {
      id: row.id,
      learnerName: name,
      learnerEmail: row.learner_email,
      initial: initialOf(name),
      courseTitle: row.course_title,
      amount: row.amount,
      currency: row.currency,
      status: row.status as TransactionStatus,
      createdAt: row.created_at,
    }
  })

  return paginated(rows, count, p)
}

/** RPC-backed -- see admin_purchase_stats() (pagination migration). Replaces the previous JS reduce() over every completed row's amount. */
type AdminPurchaseStatsRow = {
  total_revenue: number
  total_purchases: number
  paid_purchases: number
}

export async function getAdminPurchaseStats(): Promise<AdminPurchaseStats> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc("admin_purchase_stats")
    .single<AdminPurchaseStatsRow>()

  if (error || !data) {
    console.error("getAdminPurchaseStats failed:", error?.message)
    return { totalRevenue: 0, totalPurchases: 0, paidPurchases: 0 }
  }

  return {
    totalRevenue: data.total_revenue,
    totalPurchases: data.total_purchases,
    paidPurchases: data.paid_purchases,
  }
}
