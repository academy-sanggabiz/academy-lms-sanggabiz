"use client"

import { useEffect, useState } from "react"
import DOMPurify from "dompurify"
import { LinkIcon } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getAttemptSubmissionAction } from "@/app/admin/grading/actions"
import type { AttemptSubmissionResponse } from "@/lib/grading-server"

/**
 * Essay answers are learner-authored HTML. The repo's standing exception for
 * dangerouslySetInnerHTML covers *admin*-authored lesson content (see
 * CLAUDE.md); learner input rendered into an admin's session is stored XSS,
 * so it gets sanitized here. DOMPurify runs in the browser rather than in
 * getAttemptSubmission because the server-side build would need jsdom, which
 * doesn't run on the Cloudflare Workers runtime this app deploys to.
 */
function sanitize(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

export function SubmissionPreviewDialog({
  open,
  onOpenChange,
  attemptId,
  quizTitle,
  learnerName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  attemptId: string
  quizTitle: string
  learnerName: string
}) {
  const [responses, setResponses] = useState<AttemptSubmissionResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Answer bodies are loaded per-attempt on open instead of shipped with
  // every cell of the matrix -- see getCourseGradingMatrix's doc comment.
  // No state reset here: the caller keys this component by attemptId, so a
  // different cell mounts a fresh dialog rather than reusing stale answers.
  useEffect(() => {
    let active = true

    getAttemptSubmissionAction(attemptId).then((result) => {
      if (!active) return
      if (result.ok) setResponses(result.data)
      else setError(result.error)
    })

    return () => {
      active = false
    }
  }, [attemptId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{quizTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{learnerName}</p>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !responses ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : responses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submission</p>
          ) : (
            responses.map((response) => (
              <div key={response.questionId} className="flex flex-col gap-1.5">
                {responses.length > 1 && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {response.prompt.replace(/<[^>]+>/g, " ").trim()}
                  </p>
                )}
                {response.type === "file_upload" ? (
                  response.response ? (
                    <a
                      href={response.response}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-sm font-medium text-ring hover:underline"
                    >
                      <LinkIcon className="size-4 shrink-0" />
                      Open submitted link
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No submission</p>
                  )
                ) : response.response ? (
                  <div
                    className="lesson-prose rounded-lg bg-muted p-3.5 text-sm"
                    dangerouslySetInnerHTML={{ __html: sanitize(response.response) }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No submission</p>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
