import { Receipt, ShoppingCart, Wallet } from "lucide-react"

import { getAdminPurchaseList, getAdminPurchaseStats, type AdminPurchaseFilters } from "@/lib/purchases-admin"
import { formatPrice } from "@/lib/courses"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { PurchaseManagementClient } from "@/components/admin/purchases/PurchaseManagementClient"
import { StatCard } from "@/components/admin/StatCard"

export default async function AdminPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const raw = await searchParams
  const params = parseListParams<AdminPurchaseFilters>(raw, {
    sortable: ["created_at"],
    defaultSort: "created_at",
    defaultDir: "desc",
    filters: { status: ["all", "completed", "free", "pending", "refunded"] },
  })

  const [page, stats] = await Promise.all([getAdminPurchaseList(params), getAdminPurchaseStats()])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">Purchase Management</h1>
        <p className="text-sm text-muted-foreground">
          See who bought which course and track purchase status
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Total Revenue" value={formatPrice(stats.totalRevenue)} />
        <StatCard icon={ShoppingCart} label="Total Purchases" value={stats.totalPurchases} />
        <StatCard icon={Receipt} label="Paid Purchases" value={stats.paidPurchases} />
      </div>

      <PurchaseManagementClient page={page} />
    </div>
  )
}
