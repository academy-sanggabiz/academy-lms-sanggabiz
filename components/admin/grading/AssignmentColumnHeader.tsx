"use client"

import { Info } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { GradingColumn } from "@/lib/grading-server"

export function AssignmentColumnHeader({ column }: { column: GradingColumn }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] font-semibold text-foreground">{column.quizTitle}</span>
      <Popover>
        <PopoverTrigger className="text-muted-foreground hover:text-foreground">
          <Info className="size-3.5" />
          <span className="sr-only">Assignment info</span>
        </PopoverTrigger>
        <PopoverContent align="start">
          <div className="flex flex-col gap-1.5">
            <p className="font-semibold text-foreground">{column.quizTitle}</p>
            <p className="text-xs text-muted-foreground">
              {column.sectionTitle} · {column.lessonTitle}
            </p>
            <p className="text-xs text-muted-foreground">Pass score: {column.passScore}%</p>
            {/* Derived from is_assessment, not authored -- see quizGradeWeight. */}
            <p className="text-xs text-muted-foreground">
              Counts {column.weight}× toward the course grade
            </p>
            {column.questionPrompts.length > 0 && (
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {/* Already sliced server-side -- see COLUMN_PROMPT_PREVIEW in lib/grading-server.ts. */}
                {column.questionPrompts.map((prompt, i) => (
                  <li key={i} className="line-clamp-2">
                    {prompt.replace(/<[^>]+>/g, " ").trim() || "Untitled question"}
                  </li>
                ))}
                {column.extraPromptCount > 0 && <li>+{column.extraPromptCount} more</li>}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
