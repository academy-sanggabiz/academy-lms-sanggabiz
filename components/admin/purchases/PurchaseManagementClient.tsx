"use client"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-ring text-sm font-semibold text-primary-foreground uppercase">
                        {p.initial}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[14.5px] font-semibold">{p.learnerName}</div>
                        <div className="truncate text-[12.5px] text-muted-foreground">{p.learnerEmail}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-0 truncate text-[13.5px]">{p.courseTitle}</TableCell>
                  <TableCell className="text-[13.5px] font-medium whitespace-nowrap">{formatPrice(p.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-[13px] whitespace-nowrap text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ListPagination meta={page} />
    </div>
  )
}
