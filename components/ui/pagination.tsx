"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PAGE_SIZES, pageWindow } from "@/lib/pagination"

/**
 * Presentational only -- no router access, so it composes with either the
 * shared useListParams hook (see components/admin/ListPagination.tsx) or any
 * other paging mechanism. Hand-rolled rather than shadcn's <a>-based
 * pagination primitive, which would force a full navigation and lose the
 * useTransition-driven focus-preserving behaviour every admin list here
 * relies on.
 */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  disabled,
  hidePageSize,
}: {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  disabled?: boolean
  hidePageSize?: boolean
}) {
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3">
      <p className="text-[13px] text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>

        {pageWindow(page, totalPages).map((entry, i) =>
          entry === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-[13px] text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={entry}
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onPageChange(entry)}
              className={cn(
                "min-w-7",
                entry === page && "bg-brand-gradient border-transparent text-white hover:brightness-105"
              )}
            >
              {entry}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>

      {onPageSizeChange && !hidePageSize && (
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-[110px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
