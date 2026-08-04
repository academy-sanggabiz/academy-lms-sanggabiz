"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Course } from "@/lib/courses"
import type { AdminLearner } from "@/lib/learners-admin"
import { getLearnerEnrolledCourseIdsAction, toggleLearnerEnrollmentAction } from "@/app/admin/learners/actions"

export function EnrollModal({
  learner,
  courses,
  onClose,
}: {
  learner: AdminLearner | null
  courses: Course[]
  onClose: () => void
}) {
  return (
    <Dialog open={!!learner} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[460px]">
        {learner && (
          <EnrollModalContent
            key={learner.id}
            learner={learner}
            courses={courses}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EnrollModalContent({
  learner,
  courses,
  onClose,
}: {
  learner: AdminLearner
  courses: Course[]
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [enrolledIds, setEnrolledIds] = useState<Set<string> | null>(null)

  // The paginated learner list no longer carries each row's enrolled course
  // ids, so fetch them for this one learner when the modal opens.
  useEffect(() => {
    let cancelled = false
    getLearnerEnrolledCourseIdsAction(learner.id).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        toast.error(result.error)
        setEnrolledIds(new Set())
        return
      }
      setEnrolledIds(new Set(result.data))
    })
    return () => {
      cancelled = true
    }
  }, [learner.id])

  function toggle(courseId: string, currentlyEnrolled: boolean) {
    startTransition(async () => {
      const result = await toggleLearnerEnrollmentAction(learner.id, courseId, !currentlyEnrolled)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setEnrolledIds((prev) => {
        const next = new Set(prev)
        if (currentlyEnrolled) next.delete(courseId)
        else next.add(courseId)
        return next
      })
      toast.success(currentlyEnrolled ? "Unenrolled" : "Enrolled")
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enroll {learner.name}</DialogTitle>
        <DialogDescription>Toggle courses to enroll or unenroll this learner</DialogDescription>
      </DialogHeader>

      {enrolledIds === null ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="flex max-h-[50vh] flex-col gap-2 overflow-auto">
          {courses.map((course) => {
            const enrolled = enrolledIds.has(course.id)
            return (
              <button
                key={course.id}
                type="button"
                disabled={isPending}
                onClick={() => toggle(course.id, enrolled)}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-left hover:bg-muted"
              >
                <span className="truncate text-sm font-semibold">{course.title}</span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                    enrolled ? "bg-secondary text-ring" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {enrolled ? "Enrolled ✓" : "Enroll"}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  )
}
