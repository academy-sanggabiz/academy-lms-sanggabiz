"use client"

import { createContext, useContext, useMemo, useState } from "react"

type NavigationBlockerValue = {
  isBlocked: boolean
  setIsBlocked: (blocked: boolean) => void
}

const NavigationBlockerContext = createContext<NavigationBlockerValue | null>(null)

export function NavigationBlockerProvider({ children }: { children: React.ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false)
  const value = useMemo(() => ({ isBlocked, setIsBlocked }), [isBlocked])

  return (
    <NavigationBlockerContext.Provider value={value}>{children}</NavigationBlockerContext.Provider>
  )
}

export function useNavigationBlocker() {
  const context = useContext(NavigationBlockerContext)
  if (!context) {
    throw new Error("useNavigationBlocker must be used within a NavigationBlockerProvider")
  }
  return context
}
