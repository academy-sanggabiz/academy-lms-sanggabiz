"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Bell } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Notification } from "@/lib/notifications-server"
import { markNotificationsReadAction } from "@/app/learner/notifications-actions"
import { relativeTime } from "@/lib/notification-format"

export function NotificationBell({
  items,
  unreadCount,
  seeAllHref = "/learner/notifications",
}: {
  items: Notification[]
  unreadCount: number
  seeAllHref?: string | null
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function handleOpenChange(open: boolean) {
    // Mark everything read on open. Fire-and-forget: the badge clears via the
    // action's revalidate, and a failure just leaves the badge up.
    if (!open || unreadCount === 0) return
    startTransition(async () => {
      await markNotificationsReadAction()
      router.refresh()
    })
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        aria-label={
          unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
        }
        className="relative mr-1 flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">
            Notifications
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          items.map((n) => {
            const content = (
              <span className="flex w-full flex-col gap-0.5">
                <span className="flex items-start gap-2">
                  {!n.readAt && (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ring" />
                  )}
                  <span className="text-sm font-medium">{n.title}</span>
                </span>
                {n.body && (
                  <span className="truncate text-xs text-muted-foreground">{n.body}</span>
                )}
                <span className="text-[11px] text-muted-foreground/70">
                  {relativeTime(n.createdAt)}
                </span>
              </span>
            )

            return (
              <DropdownMenuItem
                key={n.id}
                className="items-start whitespace-normal"
                {...(n.link ? { render: <Link href={n.link} /> } : {})}
              >
                {content}
              </DropdownMenuItem>
            )
          })
        )}

        {items.length > 0 && seeAllHref && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-sm font-medium text-ring"
              render={<Link href={seeAllHref} />}
            >
              See all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
