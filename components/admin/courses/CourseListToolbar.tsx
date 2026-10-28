"use client"

import { ListFilterSelect } from "@/components/admin/ListFilterSelect"
import { ListToolbar } from "@/components/admin/ListToolbar"

export function CourseListToolbar() {
  return (
    <div className="mb-6">
      <ListToolbar placeholder="Cari judul kursus...">
        <ListFilterSelect
          paramKey="status"
          defaultValue="all"
          placeholder="Status"
          options={[
            { value: "all", label: "Semua status" },
            { value: "published", label: "Terbit" },
            { value: "draft", label: "Draf" },
          ]}
        />
        <ListFilterSelect
          paramKey="price"
          defaultValue="all"
          placeholder="Harga"
          options={[
            { value: "all", label: "Semua harga" },
            { value: "free", label: "Publik" },
            { value: "paid", label: "Berbayar" },
          ]}
        />
      </ListToolbar>
    </div>
  )
}
