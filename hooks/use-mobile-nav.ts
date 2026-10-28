"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * Open/closed state of the off-canvas navigation used below `lg` by the
 * learner and admin shells. Closes on navigation and on Escape, so a phone
 * user never lands on a new page behind an open drawer.
 */
export function useMobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [seenPath, setSeenPath] = useState(pathname)

  // Adjusting state during render (not in an effect): the React Compiler lint
  // rejects setState inside useEffect.
  if (pathname !== seenPath) {
    setSeenPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return { open, setOpen }
}

/**
 * Shared classes for a sidebar that is a collapsible column from `lg` up and
 * an off-canvas drawer below it (WCAG 1.4.10 reflow: at 390px the page must
 * not be squeezed next to a fixed 250px column).
 */
export function sidebarClasses(desktopOpen: boolean, mobileOpen: boolean) {
  return [
    "flex h-dvh flex-col overflow-hidden border-r border-border bg-card",
    // phone/tablet: drawer
    "fixed inset-y-0 left-0 z-50 w-[260px] shadow-xl transition-transform duration-200",
    mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full",
    // desktop: in-flow column that collapses to zero width
    "lg:visible lg:sticky lg:top-0 lg:z-auto lg:flex-none lg:translate-x-0 lg:shadow-none lg:transition-[width]",
    desktopOpen ? "lg:w-[250px]" : "lg:w-0 lg:border-r-0",
  ].join(" ")
}
