"use client"

import { useState, useTransition } from "react"
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
import { toggleLearnerEnrollmentAction } from "@/app/admin/learners/actions"

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
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(
    () => new Set(learner.enrolledCourseIds)
  )

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

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  )
}
