"use client"

import { ListFilterSelect } from "@/components/admin/ListFilterSelect"
import { ListToolbar } from "@/components/admin/ListToolbar"

export function PurchaseListToolbar() {
  return (
    <ListToolbar placeholder="Cari peserta atau kursus...">
      <ListFilterSelect
        paramKey="status"
        defaultValue="all"
        placeholder="Status"
        options={[
          { value: "all", label: "Semua Status" },
          { value: "completed", label: "Berbayar" },
          { value: "free", label: "Publik" },
          { value: "pending", label: "Tertunda" },
          { value: "refunded", label: "Dikembalikan" },
        ]}
      />
    </ListToolbar>
  )
}
