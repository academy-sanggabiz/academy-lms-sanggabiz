"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ListTree, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Layout of the full-screen player: header, lesson pane and the course-content
 * sidebar. On wide screens the sidebar sits beside the lesson; below `lg` it
 * becomes a drawer opened from the header, so the lesson reflows to the full
 * width of a phone instead of being squeezed next to a 360px column
 * (WCAG 1.4.10 reflow, DL standard "mobile is not a smaller desktop").
 */
export function LearnShell({
  header,
  pane,
  sidebar,
}: {
  header: ReactNode
  pane: ReactNode
  sidebar: ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!drawerOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawerOpen])

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-2 sm:px-5">
        {header}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-controls="course-content"
          aria-expanded={drawerOpen}
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted lg:hidden"
        >
          <ListTree className="size-4" aria-hidden />
          <span className="hidden sm:inline">Isi kursus</span>
          <span className="sr-only sm:hidden">Isi kursus</span>
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 outline-none">
          {pane}
        </main>

        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
        )}
        <div
          id="course-content"
          className={cn(
            "z-50 flex flex-col bg-card",
            "fixed inset-y-0 right-0 w-[min(360px,90vw)] shadow-xl transition-transform lg:static lg:w-[360px] lg:translate-x-0 lg:shadow-none",
            // `invisible` keeps the closed drawer out of the tab order on small
            // screens; lg:visible restores the always-open column.
            drawerOpen ? "visible translate-x-0" : "invisible translate-x-full lg:visible"
          )}
        >
          <div className="flex items-center justify-end border-b border-muted p-2 lg:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="flex size-10 items-center justify-center rounded-lg hover:bg-muted"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Tutup isi kursus</span>
            </button>
          </div>
          {sidebar}
        </div>
      </div>
    </div>
  )
}
