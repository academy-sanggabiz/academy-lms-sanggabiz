"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LearnerSearchResult } from "@/lib/learners-admin"
import { enrollLearnerAction, searchLearnersAction } from "@/app/admin/courses/roster-actions"

const MIN_QUERY_LENGTH = 2

export function InviteLearnerDialog({
  courseId,
  open,
  enrolledLearnerIds,
  onClose,
  onEnrolled,
}: {
  courseId: string
  open: boolean
  enrolledLearnerIds: string[]
  onClose: () => void
  onEnrolled: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[460px]">
        {/* Remount per open so the query/results don't persist between sessions */}
        {open && (
          <InviteLearnerDialogContent
            courseId={courseId}
            enrolledLearnerIds={enrolledLearnerIds}
            onClose={onClose}
            onEnrolled={onEnrolled}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function InviteLearnerDialogContent({
  courseId,
  enrolledLearnerIds,
  onClose,
  onEnrolled,
}: {
  courseId: string
  enrolledLearnerIds: string[]
  onClose: () => void
  onEnrolled: () => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LearnerSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  // Locally enrolled this session, so rows disappear without a round trip.
  const [justEnrolled, setJustEnrolled] = useState<Set<string>>(() => new Set())

  const trimmed = query.trim()

  useEffect(() => {
    // Below the threshold there's nothing to search and nothing to reset: the
    // render below branches on `trimmed` first, so any leftover results from a
    // previous query are already unreachable.
    if (trimmed.length < MIN_QUERY_LENGTH) return

    // Debounce: a search would otherwise fire per keystroke. `cancelled` guards
    // against an earlier slow request overwriting a later one's results. All
    // setState calls live inside the timeout rather than the effect body, so
    // they can't cascade renders synchronously.
    let cancelled = false
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const result = await searchLearnersAction(trimmed)
      if (cancelled) return
      setIsSearching(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setResults(result.data)
      setHasSearched(true)
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed])

  function handleEnroll(learner: LearnerSearchResult) {
    startTransition(async () => {
      const result = await enrollLearnerAction(courseId, learner.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setJustEnrolled((prev) => new Set(prev).add(learner.id))
      toast.success(`${learner.name} enrolled`)
      onEnrolled()
    })
  }

  const alreadyEnrolled = new Set([...enrolledLearnerIds, ...justEnrolled])
  const selectable = results.filter((r) => !alreadyEnrolled.has(r.id))

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invite learner</DialogTitle>
        <DialogDescription>
          Search registered learners by name or email, then enroll them in this course.
        </DialogDescription>
      </DialogHeader>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or email…"
          className="bg-card pl-9"
        />
      </div>

      <div className="flex max-h-[50vh] min-h-[120px] flex-col gap-2 overflow-auto">
        {trimmed.length < MIN_QUERY_LENGTH ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Type at least {MIN_QUERY_LENGTH} characters to search.
          </p>
        ) : isSearching ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching…
          </p>
        ) : selectable.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {hasSearched && results.length > 0
              ? "Everyone matching is already enrolled."
              : "No learners found."}
          </p>
        ) : (
          selectable.map((learner) => (
            <button
              key={learner.id}
              type="button"
              disabled={isPending}
              onClick={() => handleEnroll(learner)}
              className="flex items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-muted disabled:opacity-60"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-ring">
                {learner.initial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{learner.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{learner.email}</span>
              </span>
              <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold whitespace-nowrap">
                Enroll
              </span>
            </button>
          ))
        )}
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  )
}
