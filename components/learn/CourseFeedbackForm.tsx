"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StarRating } from "@/components/learner/StarRating"
import { submitCourseFeedback } from "@/app/learner/courses/feedback-actions"

const MIN_COMMENT_LENGTH = 10

export function CourseFeedbackForm({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isPending, startTransition] = useTransition()

  const canSubmit = rating > 0 && comment.trim().length >= MIN_COMMENT_LENGTH && !isPending

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitCourseFeedback({ courseId, rating, comment })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Thanks for your feedback!")
      router.refresh()
    })
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3.5 text-left">
      <StarRating value={rating} onChange={setRating} size="md" />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you think of this course?"
        className="min-h-[90px] bg-card"
        disabled={isPending}
      />
      <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
        <span>Minimum {MIN_COMMENT_LENGTH} characters</span>
        <span>{comment.trim().length}/{MIN_COMMENT_LENGTH}</span>
      </div>
      <Button
        className="w-full bg-brand-gradient text-white hover:brightness-105"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {isPending ? "Submitting..." : "Submit feedback & unlock certificate"}
      </Button>
    </div>
  )
}
