"use client"

import { useEffect, useRef, useState, type Dispatch } from "react"
import { toast } from "sonner"

import { courseDraftSchema, serializeDraft, type CourseDraft } from "@/lib/course-draft"
import type { CourseDraftAction } from "./CourseDraftContext"

const STORAGE_VERSION = 1 as const
const DEBOUNCE_MS = 800

function storageKey(courseId: string): string {
  return `sanggabiz:course-draft:v${STORAGE_VERSION}:${courseId}`
}

// FNV-1a 32-bit -- fast, dependency-free, good enough to flag "the server
// baseline changed since this draft was stored locally" for the restore
// prompt. Not a security or integrity check.
function hashString(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

type StoredDraft = {
  v: typeof STORAGE_VERSION
  courseId: string
  updatedAt: number
  baselineHash: string
  draft: CourseDraft
}

// Module-level, not state: once a write fails (quota exceeded), stop trying
// for the rest of the session rather than re-throwing on every debounce
// tick. Autosave failing must never block editing.
let autosaveDisabled = false

function readStored(courseId: string): StoredDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storageKey(courseId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredDraft> | null
    if (!parsed || parsed.v !== STORAGE_VERSION || parsed.courseId !== courseId) return null
    const draftResult = courseDraftSchema.safeParse(parsed.draft)
    if (!draftResult.success) return null
    if (typeof parsed.updatedAt !== "number" || typeof parsed.baselineHash !== "string") return null
    return { v: STORAGE_VERSION, courseId, updatedAt: parsed.updatedAt, baselineHash: parsed.baselineHash, draft: draftResult.data }
  } catch {
    return null
  }
}

function clearStored(courseId: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(storageKey(courseId))
  } catch {
    // Ignore -- nothing to clean up if storage itself is unavailable.
  }
}

/**
 * Debounced localStorage mirror of the course draft, plus the one-time
 * "restore unsaved changes?" check on mount. See lib/course-draft.ts /
 * CourseDraftContext for the draft shape and dispatch actions this drives.
 */
export function useDraftAutosave({
  courseId,
  draft,
  baseline,
  isDirty,
  dispatch,
}: {
  courseId: string
  draft: CourseDraft
  baseline: CourseDraft
  isDirty: boolean
  dispatch: Dispatch<CourseDraftAction>
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mountState, setMountState] = useState<{ checked: boolean; pendingRestore: StoredDraft | null }>(
    { checked: false, pendingRestore: null }
  )
  const { checked, pendingRestore } = mountState

  // Runs once, before any autosave write, so we never race reading a
  // leftover draft against overwriting it with the fresh baseline.
  // localStorage only exists client-side, so this can't move into a lazy
  // useState initializer without a server/client hydration mismatch --
  // this is the documented exception to "avoid setState in effects"
  // (syncing from a browser-only external store on mount).
  useEffect(() => {
    const stored = readStored(courseId)
    const hasChanges = stored != null && serializeDraft(stored.draft) !== serializeDraft(baseline)
    if (stored && !hasChanges) {
      // Identical to what's already on the server -- stale leftover, drop it.
      clearStored(courseId)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMountState({ checked: true, pendingRestore: hasChanges ? stored : null })
    // Deliberately courseId-only: baseline is captured once at mount via the
    // CourseDraftProvider's own "seeded once" contract (see its comment).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  useEffect(() => {
    if (!checked) return

    if (!isDirty) {
      clearStored(courseId)
      return
    }
    if (autosaveDisabled) return

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      const stored: StoredDraft = {
        v: STORAGE_VERSION,
        courseId,
        updatedAt: Date.now(),
        baselineHash: hashString(serializeDraft(baseline)),
        draft,
      }
      try {
        window.localStorage.setItem(storageKey(courseId), JSON.stringify(stored))
      } catch {
        autosaveDisabled = true
        toast.error("Couldn't save a local backup of your edits (storage full) — save often.")
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [checked, isDirty, draft, baseline, courseId])

  function restore() {
    if (!pendingRestore) return
    dispatch({ type: "replaceDraft", draft: pendingRestore.draft })
    setMountState((s) => ({ ...s, pendingRestore: null }))
  }

  function discard() {
    clearStored(courseId)
    setMountState((s) => ({ ...s, pendingRestore: null }))
  }

  return {
    pendingRestore,
    isStale: pendingRestore ? pendingRestore.baselineHash !== hashString(serializeDraft(baseline)) : false,
    restore,
    discard,
  }
}
