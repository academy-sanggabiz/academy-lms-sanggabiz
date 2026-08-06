"use client"

import { useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { enroll } from "@/app/learner/courses/actions"
import { cn } from "@/lib/utils"

export type EnrollState = "not_enrolled" | "not_started" | "in_progress"

/**
 * Shared enroll/start/continue button for the course-detail sidebar,
 * catalog grid card, and the curriculum-locked "enrollment required" dialog
 * -- the only place `enroll()` is called from, so the toast fires exactly
 * once per real enroll click no matter which surface triggered it.
 */
export function EnrollButton({
  courseId,
  state,
  size = "default",
  className,
  onEnrolled,
}: {
  courseId: string
  state: EnrollState
  size?: "default" | "xl"
  className?: string
  onEnrolled?: () => void
}) {
  const [pending, startTransition] = useTransition()

  if (state !== "not_enrolled") {
    // The full "Enrolled ✓" prefix only fits the wide xl sidebar button; the
    // compact grid-card size sits next to a Preview button in the same row.
    const label =
      state === "in_progress" ? "Continue Learning" : size === "xl" ? "Enrolled ✓ Start Learning" : "Start Learning"
    return (
      <Button
        size={size}
        variant="outline"
        className={cn("border-ring bg-secondary text-primary hover:bg-secondary/80 hover:text-primary", className)}
        render={<Link href={`/learn/${courseId}`} />}
        nativeButton={false}
      >
        {label}
      </Button>
    )
  }

  function handleEnroll() {
    startTransition(async () => {
      const result = await enroll(courseId)
      if (result.ok) {
        toast.success("You're enrolled! You can start learning now.")
        onEnrolled?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Button
      size={size}
      className={cn("bg-brand-gradient text-white hover:brightness-105", className)}
      onClick={handleEnroll}
      disabled={pending}
    >
      {pending ? "Enrolling…" : "Enroll Now"}
    </Button>
  )
}
