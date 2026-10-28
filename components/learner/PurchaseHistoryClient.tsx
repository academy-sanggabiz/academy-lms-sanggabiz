"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  completed: "Berbayar",
  free: "Publik",
  pending: "Tertunda",
  refunded: "Dikembalikan",
}

const STATUS_VARIANT: Record<TransactionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  free: "secondary",
  pending: "outline",
  refunded: "destructive",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
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
        <h2 className="text-lg font-bold">Semua Pembelian</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kursus..."
              aria-label="Cari berdasarkan kursus"
              className="h-9 pl-8"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger aria-label="Filter berdasarkan status" className="h-9 w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="completed">Berbayar</SelectItem>
              <SelectItem value="free">Publik</SelectItem>
              <SelectItem value="pending">Tertunda</SelectItem>
              <SelectItem value="refunded">Dikembalikan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {purchases.length === 0 ? "Belum ada pembelian." : "Tidak ada pembelian yang cocok dengan pencarian Anda."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Kursus</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-0 truncate text-[13.5px] font-medium">{p.courseTitle}</TableCell>
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
    </div>
  )
}
