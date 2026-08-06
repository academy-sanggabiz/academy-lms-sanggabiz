"use client"

import type { ReactNode } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useDebouncedParam } from "@/hooks/use-list-params"

/** Debounced search box (URL-bound via useDebouncedParam) plus a slot for per-surface filter <Select>s. */
export function ListToolbar({
  placeholder,
  prefix,
  children,
}: {
  placeholder: string
  prefix?: string
  children?: ReactNode
}) {
  const { value, setValue } = useDebouncedParam("q", prefix)

  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-[240px]">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-9 bg-card pl-8"
        />
      </div>
      {children}
    </div>
  )
}
