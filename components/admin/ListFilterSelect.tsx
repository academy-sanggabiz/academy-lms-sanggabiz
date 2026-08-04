"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useListParams } from "@/hooks/use-list-params"

/** A <Select> bound to one URL filter param, for use inside <ListToolbar>. */
export function ListFilterSelect({
  paramKey,
  prefix,
  defaultValue,
  placeholder,
  className,
  options,
}: {
  paramKey: string
  prefix?: string
  defaultValue: string
  placeholder: string
  className?: string
  options: { value: string; label: string }[]
}) {
  const { get, setParams, isPending } = useListParams(prefix)
  const value = get(paramKey) || defaultValue

  return (
    <Select
      value={value}
      onValueChange={(next) => setParams({ [paramKey]: next === defaultValue ? null : next })}
      disabled={isPending}
    >
      <SelectTrigger className={className ?? "h-9 w-[160px] bg-card"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
