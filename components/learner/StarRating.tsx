"use client"

import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

const RATINGS = [1, 2, 3, 4, 5] as const

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false,
}: {
  value: number
  onChange?: (rating: number) => void
  size?: "sm" | "md"
  readOnly?: boolean
}) {
  const starSize = size === "sm" ? "size-4" : "size-6"

  return (
    <div className="flex items-center gap-1" role={readOnly ? undefined : "radiogroup"} aria-label="Rating">
      {RATINGS.map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={!readOnly ? value === n : undefined}
          className={cn(
            "text-muted-foreground/40 disabled:cursor-default",
            !readOnly && "cursor-pointer transition-transform hover:scale-110"
          )}
        >
          <Star className={cn(starSize, n <= value && "fill-[#f5a623] text-[#f5a623]")} />
        </button>
      ))}
    </div>
  )
}
