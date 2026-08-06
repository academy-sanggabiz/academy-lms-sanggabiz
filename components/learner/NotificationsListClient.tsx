"use client"

import Link from "next/link"

import { ListPagination } from "@/components/admin/ListPagination"
import type { Notification } from "@/lib/notifications-server"
import type { Paginated } from "@/lib/pagination"
import { relativeTime } from "@/lib/notification-format"

export function NotificationsListClient({ page }: { page: Paginated<Notification> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">All notifications</h2>
      </div>

      {page.rows.length === 0 ? (
        <p className="px-2 py-12 text-center text-sm text-muted-foreground">
          No notifications yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {page.rows.map((n, i) => {
            const content = (
              <span className="flex w-full flex-col gap-1 px-4 py-3">
                <span className="flex items-start gap-2">
                  {!n.readAt && (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ring" />
                  )}
                  <span className="text-sm font-medium">{n.title}</span>
                </span>
                {n.body && <span className="text-sm text-muted-foreground">{n.body}</span>}
                <span className="text-xs text-muted-foreground/70">
                  {relativeTime(n.createdAt)}
                </span>
              </span>
            )

            const rowClassName = `flex w-full items-start hover:bg-muted/50 ${
              i > 0 ? "border-t border-border" : ""
            }`

            return n.link ? (
              <Link key={n.id} href={n.link} className={rowClassName}>
                {content}
              </Link>
            ) : (
              <div key={n.id} className={rowClassName}>
                {content}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4">
        <ListPagination meta={page} />
      </div>
    </div>
  )
}
