"use client"

import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/courses"
import type { Paginated } from "@/lib/pagination"
import type { AdminPurchase, TransactionStatus } from "@/lib/purchases-admin"
import { ListPagination } from "@/components/admin/ListPagination"

import { PurchaseListToolbar } from "./PurchaseListToolbar"

const STATUS_LABEL: Record<TransactionStatus, string> = {
  completed: "Paid",
  free: "Public",
  pending: "Pending",
  refunded: "Refunded",
}

const STATUS_VARIANT: Record<TransactionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  free: "secondary",
  pending: "outline",
  refunded: "destructive",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function PurchaseManagementClient({ page }: { page: Paginated<AdminPurchase> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">All Purchases</h2>
        <PurchaseListToolbar />
      </div>

      {page.rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {page.total === 0 ? "No purchases yet." : "No purchases match your search."}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-[2fr_1.6fr_1fr_1fr_1fr] gap-3 border-b border-border px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Learner</div>
            <div>Course</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          {page.rows.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[2fr_1.6fr_1fr_1fr_1fr] items-center gap-3 border-b border-border px-3 py-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-ring text-sm font-semibold text-primary-foreground uppercase">
                  {p.initial}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold">{p.learnerName}</div>
                  <div className="truncate text-[12.5px] text-muted-foreground">{p.learnerEmail}</div>
                </div>
              </div>
              <div className="truncate text-[13.5px]">{p.courseTitle}</div>
              <div className="text-[13.5px] font-medium">{formatPrice(p.amount)}</div>
              <div>
                <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
              </div>
              <div className="text-[13px] text-muted-foreground">{formatDate(p.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      <ListPagination meta={page} />
    </div>
  )
}
