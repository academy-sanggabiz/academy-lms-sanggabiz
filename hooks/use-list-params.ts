"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * Reads/writes the URL searchParams that drive a server-paginated admin
 * list (page, pageSize, q, sort, dir, filters). `prefix` namespaces keys for
 * pages that host more than one paginated list (e.g. the course editor's
 * Learners tab already owns ?tab= / ?new=1, so its roster uses
 * ?rosterPage=/?rosterQ=…).
 *
 * router.replace runs inside startTransition rather than a plain call: this
 * keeps the current Server Component tree mounted while the new one streams
 * in, so a focused search input doesn't lose focus on every keystroke's
 * eventual param update. isPending drives a dimmed-rows loading affordance
 * instead of a skeleton swap for the same reason.
 */
export function useListParams(prefix?: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const keyFor = useCallback(
    (key: string) => (prefix ? `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key),
    [prefix]
  )

  const get = useCallback((key: string) => searchParams.get(keyFor(key)) ?? "", [searchParams, keyFor])

  const setParams = useCallback(
    (patch: Record<string, string | number | null>, opts?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(patch)) {
        const fullKey = keyFor(key)
        if (value === null || value === "") {
          next.delete(fullKey)
        } else {
          next.set(fullKey, String(value))
        }
      }

      if (opts?.resetPage !== false && !("page" in patch)) {
        next.delete(keyFor("page"))
      }

      const query = next.toString()
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      })
    },
    [searchParams, pathname, router, keyFor]
  )

  return { searchParams, setParams, isPending, get }
}

/**
 * Debounced text input bound to one URL param. Mirrors the debounce shape
 * already proven in components/admin/courses/InviteLearnerDialog.tsx
 * (setTimeout + cleanup), but also re-syncs from the URL when it changes
 * from outside the input itself (browser back/forward, a filter reset).
 */
export function useDebouncedParam(key: string, prefix?: string, delayMs = 300) {
  const { get, setParams, isPending } = useListParams(prefix)
  const urlValue = get(key)
  const [value, setValue] = useState(urlValue)
  const lastPushed = useRef(urlValue)

  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue
      setValue(urlValue)
    }
  }, [urlValue])

  useEffect(() => {
    if (value === lastPushed.current) return
    const timer = setTimeout(() => {
      lastPushed.current = value
      setParams({ [key]: value || null })
    }, delayMs)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key, delayMs])

  return { value, setValue, isPending }
}
