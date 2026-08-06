"use client"

import { ListFilterSelect } from "@/components/admin/ListFilterSelect"
import { ListToolbar } from "@/components/admin/ListToolbar"

export function CourseListToolbar() {
  return (
    <div className="mb-6">
      <ListToolbar placeholder="Search by course title...">
        <ListFilterSelect
          paramKey="status"
          defaultValue="all"
          placeholder="Status"
          options={[
            { value: "all", label: "All statuses" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
          ]}
        />
        <ListFilterSelect
          paramKey="price"
          defaultValue="all"
          placeholder="Price"
          options={[
            { value: "all", label: "All prices" },
            { value: "free", label: "Public" },
            { value: "paid", label: "Paid" },
          ]}
        />
      </ListToolbar>
    </div>
  )
}
