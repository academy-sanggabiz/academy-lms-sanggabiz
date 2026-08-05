"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { CourseCurriculum } from "@/components/learner/CourseCurriculum"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { enroll } from "@/app/learner/courses/actions"
import type { CourseSection } from "@/lib/courses"

export function CourseCurriculumGate({
  sections,
  courseId,
  enrolled,
  initialOpen,
}: {
  sections: CourseSection[]
  courseId: string
  enrolled: boolean
  initialOpen: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(initialOpen)

  useEffect(() => {
    if (initialOpen) {
      router.replace(`/learner/courses/${courseId}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <CourseCurriculum
        sections={sections}
        courseId={courseId}
        enrolled={enrolled}
        onLockedLessonClick={() => setOpen(true)}
      />
      <Dialog open={open && !enrolled} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enrollment required</DialogTitle>
            <DialogDescription>
              You need to enroll in this course before you can start learning.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <form action={enroll}>
              <input type="hidden" name="courseId" value={courseId} />
              <Button
                type="submit"
                className="w-full bg-brand-gradient text-white hover:brightness-105"
              >
                Enroll Now
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
