"use client"

import { useState } from "react"

import { Sidebar } from "@/components/learner/Sidebar"
import { UserMenu } from "@/components/learner/UserMenu"

export function LearnerShell({
  name,
  email,
  children,
}: {
  name: string
  email: string
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />

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
          <UserMenu name={name} email={email} />
        </header>

        <main className="mx-auto w-full max-w-6xl p-8">{children}</main>
      </div>
    </div>
  )
}
