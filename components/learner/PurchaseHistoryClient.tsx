"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPrice } from "@/lib/courses"
import type { LearnerPurchase, TransactionStatus } from "@/lib/purchases-server"

type StatusFilter = "all" | TransactionStatus

const STATUS_LABEL: Record<TransactionStatus, string> = {
  completed: "Completed",
  free: "Free",
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

export function PurchaseHistoryClient({ purchases }: { purchases: LearnerPurchase[] }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (query && !p.courseTitle.toLowerCase().includes(query.toLowerCase())) return false
      if (status !== "all" && p.status !== status) return false
      return true
    })
  }, [purchases, query, status])

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">All Purchases</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by course..."
              className="h-9 pl-8"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {purchases.length === 0 ? "No purchases yet." : "No purchases match your search."}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 border-b border-border px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Course</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          {filtered.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-3 border-b border-border px-3 py-3.5"
            >
              <div className="truncate text-[13.5px] font-medium">{p.courseTitle}</div>
              <div className="text-[13.5px] font-medium">{formatPrice(p.amount)}</div>
              <div>
                <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
              </div>
              <div className="text-[13px] text-muted-foreground">{formatDate(p.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
