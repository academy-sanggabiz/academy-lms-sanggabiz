"use client"

import { useState } from "react"
import { Toaster } from "sonner"

import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminUserMenu } from "@/components/admin/AdminUserMenu"
import { NavigationBlockerProvider } from "@/components/admin/NavigationBlockerContext"
import { NotificationBell } from "@/components/learner/NotificationBell"
import type { Notification } from "@/lib/notifications-server"

export function AdminShell({
  name,
  role,
  notifications,
  unreadCount,
  children,
}: {
  name: string
  role: "admin" | "superadmin"
  notifications: Notification[]
  unreadCount: number
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <NavigationBlockerProvider>
      <div className="flex min-h-screen">
        <AdminSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} role={role} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-card px-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="mr-2 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Open sidebar"
              >
                <img src="/logo.png" alt="Sanggabiz" className="size-7 object-contain" />
              </button>
            )}
            <div className="flex-1" />
            <NotificationBell items={notifications} unreadCount={unreadCount} seeAllHref={null} />
            <AdminUserMenu name={name} role={role} />
          </header>

          <main className="mx-auto w-full max-w-6xl p-8">{children}</main>
        </div>

        <Toaster richColors position="top-right" />
      </div>
    </NavigationBlockerProvider>
  )
}
