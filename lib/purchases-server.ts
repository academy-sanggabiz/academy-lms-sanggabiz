import { createClient } from "@/lib/supabase/server"

/**
 * Server-only data access for the learner Purchase History page -- never import
 * from a Client Component. Scoped to the current learner via `claims.sub`; RLS
 * on `transactions` ("own transactions readable") enforces the same ownership.
 */

export type TransactionStatus = "completed" | "pending" | "refunded" | "free"

export type LearnerPurchase = {
  id: string
  courseTitle: string
  amount: number
  currency: string
  status: TransactionStatus
  createdAt: string
}

export type LearnerPurchaseStats = {
  totalSpent: number
  totalPurchases: number
  paidPurchases: number
}

export async function getMyPurchases(): Promise<LearnerPurchase[]> {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("transactions")
    .select("id, amount, currency, status, created_at, course:courses(title)")
    .eq("learner_id", userId)
    .order("created_at", { ascending: false })

  if (error || !data) {
    console.error("getMyPurchases failed:", error?.message)
    return []
  }

  return data.map((row) => {
    const course = Array.isArray(row.course) ? row.course[0] : row.course
    return {
      id: row.id,
      courseTitle: course?.title ?? "Untitled course",
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
    }
  })
}

export async function getMyPurchaseStats(): Promise<LearnerPurchaseStats> {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { totalSpent: 0, totalPurchases: 0, paidPurchases: 0 }

  const [{ count: totalPurchases }, { data: completed }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("learner_id", userId),
    supabase
      .from("transactions")
      .select("amount")
      .eq("learner_id", userId)
      .eq("status", "completed"),
  ])

  const totalSpent = (completed ?? []).reduce((sum, t) => sum + t.amount, 0)

  return {
    totalSpent,
    totalPurchases: totalPurchases ?? 0,
    paidPurchases: completed?.length ?? 0,
  }
}
