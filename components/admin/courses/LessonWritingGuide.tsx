"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Typical silent reading speed for instructional text; deliberately on the
// slow side because learners also study figures and re-read key sentences.
const WORDS_PER_MINUTE = 180

function countWords(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim()
  return text ? text.split(/\s+/).length : 0
}

/**
 * Live authoring guidance under a text lesson (docs/STANDAR-DIGITAL-LEARNING.md
 * §4): estimated reading time against the 5-7 minute, one-goal unit size,
 * plus the content checklist every lesson should pass. Advice only -- it
 * never blocks saving.
 */
export function LessonWritingGuide({
  html,
  onUseAsDuration,
}: {
  html: string
  onUseAsDuration: (minutes: number) => void
}) {
  const words = countWords(html)
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  const tooLong = words > 0 && minutes > 10

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-semibold text-foreground">
          {words} words · about {words === 0 ? 0 : minutes} min to read
        </span>
        <span className={cn(tooLong && "font-semibold text-destructive")}>
          {tooLong
            ? "Longer than 10 minutes: consider splitting this into two lessons with one goal each."
            : "Aim for 5–7 minutes and one learning goal per lesson."}
        </span>
        {words > 0 && (
          <Button type="button" variant="outline" size="xs" onClick={() => onUseAsDuration(minutes)}>
            Use {minutes} min as duration
          </Button>
        )}
      </div>
      <ul className="mt-2 list-disc space-y-0.5 pl-4">
        <li>Start with one sentence that says what the learner will be able to do.</li>
        <li>Headings and short paragraphs: most readers scan before they read.</li>
        <li>Explain every technical term where it first appears.</li>
        <li>Give an example from real work before the rule.</li>
        <li>End with a short check (a quiz lesson) so learners retrieve what they read.</li>
      </ul>
    </div>
  )
}
