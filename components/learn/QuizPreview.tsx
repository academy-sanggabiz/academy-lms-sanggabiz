import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AdminQuiz } from "@/lib/courses-admin"

export function QuizPreview({ quiz }: { quiz: AdminQuiz }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-10">
      <div className="rounded-2xl border border-border bg-card p-7">
        <div className="text-2xl font-bold">{quiz.title}</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {quiz.questions.length} questions · read-only preview, answers shown
        </p>
      </div>

      {quiz.questions.map((question, index) => {
        const keywordOptions = question.type === "short_answer" ? question.options.filter((o) => o.is_correct) : []

        return (
          <div key={question.id} className="rounded-2xl border border-border bg-card p-6">
            <div className="text-[13px] font-semibold text-muted-foreground">
              Question {index + 1} · {question.points} {question.points === 1 ? "point" : "points"}
            </div>
            {question.type === "essay" ? (
              <div className="lesson-prose mt-1.5" dangerouslySetInnerHTML={{ __html: question.prompt }} />
            ) : (
              <div className="mt-1.5 text-[17px] font-semibold">{question.prompt}</div>
            )}

            {(question.type === "multiple_choice" || question.type === "true_false") && (
              <div className="mt-4 flex flex-col gap-2.5">
                {question.options.map((option) => (
                  <div
                    key={option.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3",
                      option.is_correct ? "border-emerald-500/60 bg-emerald-500/10" : "border-input"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                        option.is_correct ? "border-emerald-600 bg-emerald-600" : "border-input"
                      )}
                    >
                      {option.is_correct && <Check className="size-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className="text-[15px]">{option.text}</div>
                  </div>
                ))}
              </div>
            )}

            {question.type === "short_answer" && (
              <div className="mt-4 rounded-xl border border-input bg-muted/40 p-4">
                <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Accepted answers{question.case_sensitive ? " (case sensitive)" : ""}
                </div>
                {keywordOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keywordOptions.map((option) => (
                      <span
                        key={option.id}
                        className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[13px]"
                      >
                        {option.text}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No accepted answers set — not auto-graded.</p>
                )}
              </div>
            )}

            {question.type === "essay" && (
              <p className="mt-4 text-sm text-muted-foreground">Essay response — graded manually, no answer key.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
