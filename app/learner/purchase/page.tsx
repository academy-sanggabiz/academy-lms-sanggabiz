import { Wallet, ShoppingCart, Receipt } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/courses"
import { getMyPurchases, getMyPurchaseStats } from "@/lib/purchases-server"
import { PurchaseHistoryClient } from "@/components/learner/PurchaseHistoryClient"

export default async function LearnerPurchasePage() {
  const [purchases, stats] = await Promise.all([getMyPurchases(), getMyPurchaseStats()])

  const tiles = [
    { icon: Wallet, label: "Total Spent", value: formatPrice(stats.totalSpent) },
    { icon: ShoppingCart, label: "Purchases", value: stats.totalPurchases },
    { icon: Receipt, label: "Paid", value: stats.paidPurchases },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase History</h1>
        <p className="text-sm text-muted-foreground">Your course purchases and enrollments</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiles.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="transition-shadow hover:shadow-[0_8px_24px_rgba(20,55,64,0.08)]">
            <CardContent>
              <div className="flex items-center gap-2.5 text-sm font-semibold text-ring">
                <Icon className="size-[18px]" />
                {label}
              </div>
              <div className="mt-4 text-3xl leading-none font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PurchaseHistoryClient purchases={purchases} />
    </div>
  )
}
