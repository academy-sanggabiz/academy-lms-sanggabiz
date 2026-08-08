"use client"

import { useEffect, useRef, useState } from "react"

const DEBOUNCE_MS = 400

/**
 * Local input state that also debounce-dispatches into the course draft as
 * the user types, not just on blur -- so isDirty (and therefore autosave and
 * the beforeunload guard, both of which key off it) see an in-progress edit
 * instead of only catching it once the field loses focus. `flush` (wired to
 * onBlur) commits immediately and cancels the pending debounce; unmounting
 * mid-debounce (e.g. collapsing the section this field lives in) also
 * flushes rather than dropping the edit, mirroring RichTextEditor's own
 * schedule/flush pattern.
 */
export function useDebouncedField(initialValue: string, onCommit: (value: string) => void) {
  const [value, setValue] = useState(initialValue)
  const latestRef = useRef(initialValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])

  function onChange(next: string) {
    setValue(next)
    latestRef.current = next
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      onCommitRef.current(next)
    }, DEBOUNCE_MS)
  }

  function flush() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    onCommitRef.current(latestRef.current)
  }

  // Silent reseed -- sets the visible value without scheduling a commit.
  // For fields that toggle between a display view and an edit view (e.g. a
  // click-to-rename control): reseeding on entering edit mode means a prior
  // aborted edit (blurred without committing) doesn't reappear next time the
  // field is reopened.
  function reset(next: string) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setValue(next)
    latestRef.current = next
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
        onCommitRef.current(latestRef.current)
      }
    }
    // Intentionally mount-only: this is a flush-on-unmount, not a resync
    // effect -- same "run once" contract as RichTextEditor's unmount cleanup.
  }, [])

  return { value, onChange, flush, reset }
}
