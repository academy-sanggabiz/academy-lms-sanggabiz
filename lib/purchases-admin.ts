import { createClient } from "@/lib/supabase/server"

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

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

export async function getAdminPurchaseList(): Promise<AdminPurchase[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, amount, currency, status, created_at, learner:profiles(full_name, email), course:courses(title)"
    )
    .order("created_at", { ascending: false })

  if (error || !data) {
    console.error("getAdminPurchaseList failed:", error?.message)
    return []
  }

  return data.map((row) => {
    const learner = Array.isArray(row.learner) ? row.learner[0] : row.learner
    const course = Array.isArray(row.course) ? row.course[0] : row.course
    const name = learner?.full_name || learner?.email || "Unnamed learner"
    return {
      id: row.id,
      learnerName: name,
      learnerEmail: learner?.email ?? "",
      initial: initialOf(name),
      courseTitle: course?.title ?? "Untitled course",
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
    }
  })
}

export async function getAdminPurchaseStats(): Promise<AdminPurchaseStats> {
  const supabase = await createClient()

  const [{ count: totalPurchases }, { data: completed }] = await Promise.all([
    supabase.from("transactions").select("*", { count: "exact", head: true }),
    supabase.from("transactions").select("amount").eq("status", "completed"),
  ])

  const totalRevenue = (completed ?? []).reduce((sum, t) => sum + t.amount, 0)

  return {
    totalRevenue,
    totalPurchases: totalPurchases ?? 0,
    paidPurchases: completed?.length ?? 0,
  }
}
