"use client"

import { Pagination } from "@/components/ui/pagination"
import { useListParams } from "@/hooks/use-list-params"
import type { Paginated } from "@/lib/pagination"

/** Wires the presentational <Pagination> to the URL via useListParams. */
export function ListPagination({
  meta,
  prefix,
  hidePageSize,
}: {
  meta: Omit<Paginated<unknown>, "rows">
  prefix?: string
  hidePageSize?: boolean
}) {
  const { setParams, isPending } = useListParams(prefix)

  return (
    <Pagination
      page={meta.page}
      pageSize={meta.pageSize}
      total={meta.total}
      totalPages={meta.totalPages}
      disabled={isPending}
      hidePageSize={hidePageSize}
      onPageChange={(page) => setParams({ page }, { resetPage: false })}
      onPageSizeChange={(pageSize) => setParams({ pageSize })}
    />
  )
}
