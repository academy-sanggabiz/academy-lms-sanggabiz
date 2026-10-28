"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Toaster } from "sonner"

import { useMobileNav } from "@/hooks/use-mobile-nav"

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
  const mobileNav = useMobileNav()

  return (
    <NavigationBlockerProvider>
      <div className="flex min-h-screen">
        <AdminSidebar
          open={sidebarOpen}
          mobileOpen={mobileNav.open}
          onToggle={() => setSidebarOpen((v) => !v)}
          onCloseMobile={() => mobileNav.setOpen(false)}
          role={role}
        />
        {mobileNav.open && (
          <div
            className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
            onClick={() => mobileNav.setOpen(false)}
            aria-hidden
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-card px-4">
            <button
              type="button"
              onClick={() => mobileNav.setOpen(true)}
              aria-label="Buka menu"
              aria-controls="app-sidebar"
              aria-expanded={mobileNav.open}
              className="mr-2 flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Buka sidebar"
                className="mr-2 hidden size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
              >
                <img src="/logo.png" alt="" className="size-7 object-contain" />
              </button>
            )}
            <div className="flex-1" />
            <NotificationBell items={notifications} unreadCount={unreadCount} seeAllHref={null} />
            <AdminUserMenu name={name} role={role} />
          </header>

          <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl p-4 outline-none sm:p-6 lg:p-8">{children}</main>
        </div>

        <Toaster richColors position="top-right" />
      </div>
    </NavigationBlockerProvider>
  )
}
