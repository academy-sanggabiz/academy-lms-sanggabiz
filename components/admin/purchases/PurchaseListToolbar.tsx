"use client"

import { ListFilterSelect } from "@/components/admin/ListFilterSelect"
import { ListToolbar } from "@/components/admin/ListToolbar"

export function PurchaseListToolbar() {
  return (
    <ListToolbar placeholder="Search by learner or course...">
      <ListFilterSelect
        paramKey="status"
        defaultValue="all"
        placeholder="Status"
        options={[
          { value: "all", label: "All Status" },
          { value: "completed", label: "Paid" },
          { value: "free", label: "Public" },
          { value: "pending", label: "Pending" },
          { value: "refunded", label: "Refunded" },
        ]}
      />
    </ListToolbar>
  )
}
