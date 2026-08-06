"use client"

import { memo, useCallback, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListToolbar } from "@/components/admin/ListToolbar"
import { ListPagination } from "@/components/admin/ListPagination"
import type { CourseGradingMatrix, GradingCell, GradingColumn, GradingMatrixRow } from "@/lib/grading-server"
import { gradeAttemptsAction, type BulkGradeEntry, type BulkGradeResult } from "@/app/admin/grading/actions"
import { AssignmentColumnHeader } from "@/components/admin/grading/AssignmentColumnHeader"
import { SubmissionPreviewDialog } from "@/components/admin/grading/SubmissionPreviewDialog"

type PreviewTarget = { attemptId: string; quizTitle: string; learnerName: string }

type PendingEdit = {
  attemptId: string
  questionId: string
  value: string
  maxPoints: number
}

/** Per-attempt slice of pendingEdits: { [questionId]: value }. */
type CellEdits = Record<string, string>

type GradingTableMeta = {
  editsByAttempt: Map<string, CellEdits>
  disabled: boolean
  onScoreChange: (attemptId: string, questionId: string, maxPoints: number, baseline: string, value: string) => void
  onPreview: (target: PreviewTarget) => void
}

const LEARNER_HEAD_CLASS = "sticky left-0 z-10 bg-muted whitespace-nowrap border-r border-border"
const LEARNER_CELL_CLASS = "sticky left-0 z-10 bg-card whitespace-nowrap border-r border-border"
const GRADE_HEAD_CLASS = "sticky right-0 z-10 bg-muted whitespace-nowrap border-l border-border"
const GRADE_CELL_CLASS = "sticky right-0 z-10 bg-card whitespace-nowrap border-l border-border"

const NO_EDITS: CellEdits = {}

function pendingKey(attemptId: string, questionId: string) {
  return `${attemptId}:${questionId}`
}

export function GradingCourseMatrix({ matrix }: { matrix: CourseGradingMatrix }) {
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null)
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>({})
  const [saveSummary, setSaveSummary] = useState<BulkGradeResult | null>(null)
  const [isSaving, startSaving] = useTransition()

  const { rows: pageRows, ...pageMeta } = matrix.rows

  /**
   * Cells read their pending value from this per-attempt slice rather than
   * the flat pendingEdits object. Editing one score then only changes the
   * identity of that attempt's slice, so React.memo below can skip every
   * other cell -- with a flat object every cell in the table re-rendered on
   * every keystroke, which is what made typing a grade freeze the page.
   */
  const editsByAttempt = useMemo(() => {
    const map = new Map<string, CellEdits>()
    for (const edit of Object.values(pendingEdits)) {
      const slice = map.get(edit.attemptId) ?? {}
      slice[edit.questionId] = edit.value
      map.set(edit.attemptId, slice)
    }
    return map
  }, [pendingEdits])

  const handleScoreChange = useCallback(
    (attemptId: string, questionId: string, maxPoints: number, baseline: string, value: string) => {
      const key = pendingKey(attemptId, questionId)
      setPendingEdits((prev) => {
        const next = { ...prev }
        if (value === baseline) {
          delete next[key]
        } else {
          next[key] = { attemptId, questionId, value, maxPoints }
        }
        return next
      })
    },
    []
  )

  const handlePreview = useCallback((target: PreviewTarget) => setPreviewTarget(target), [])

  function handleSaveAll() {
    const edits = Object.values(pendingEdits)
    if (edits.length === 0) return

    for (const edit of edits) {
      const value = edit.value.trim() === "" ? 0 : Number(edit.value)
      if (!Number.isFinite(value) || value < 0 || value > edit.maxPoints) {
        toast.error(`Points must be between 0 and ${edit.maxPoints}`)
        return
      }
    }

    const entriesByAttempt = new Map<string, BulkGradeEntry>()
    for (const edit of edits) {
      const value = edit.value.trim() === "" ? 0 : Number(edit.value)
      const entry = entriesByAttempt.get(edit.attemptId) ?? { attemptId: edit.attemptId, grades: [] }
      entry.grades.push({ questionId: edit.questionId, points: value })
      entriesByAttempt.set(edit.attemptId, entry)
    }

    startSaving(async () => {
      const result = await gradeAttemptsAction(Array.from(entriesByAttempt.values()))
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      setSaveSummary(result.data)

      // No optimistic cell patching: gradeAttemptsAction revalidates this
      // route, so fresh scores stream back in on the same transition. The
      // previous version rebuilt the whole matrix in state first and then had
      // that work immediately overwritten by the revalidated payload.
      const succeededAttemptIds = new Set(result.data.succeeded.map((s) => s.attemptId))
      setPendingEdits((prev) => {
        const next: Record<string, PendingEdit> = {}
        for (const [key, edit] of Object.entries(prev)) {
          if (!succeededAttemptIds.has(edit.attemptId)) next[key] = edit
        }
        return next
      })

      if (result.data.failed.length === 0) {
        toast.success(`Graded ${result.data.succeeded.length} attempt${result.data.succeeded.length === 1 ? "" : "s"}`)
      }
    })
  }

  const isDirty = Object.keys(pendingEdits).length > 0

  const columns = useMemo<ColumnDef<GradingMatrixRow>[]>(() => {
    return [
      {
        id: "learner",
        header: "Learner",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link
              href={`/admin/learners/${row.original.learnerId}`}
              className="font-semibold hover:underline"
            >
              {row.original.learnerName}
            </Link>
            <span className="text-xs font-normal text-muted-foreground">{row.original.learnerEmail}</span>
          </div>
        ),
        meta: { headClassName: LEARNER_HEAD_CLASS, cellClassName: LEARNER_CELL_CLASS },
      },
      ...matrix.columns.map<ColumnDef<GradingMatrixRow>>((column) => ({
        id: column.quizId,
        header: () => <AssignmentColumnHeader column={column} />,
        cell: ({ row, table }) => {
          const cell = row.original.cells[column.quizId]
          const meta = table.options.meta as GradingTableMeta
          return (
            <CellView
              column={column}
              cell={cell}
              learnerName={row.original.learnerName}
              disabled={meta.disabled}
              edits={(cell.attemptId && meta.editsByAttempt.get(cell.attemptId)) || NO_EDITS}
              onPreview={meta.onPreview}
              onScoreChange={meta.onScoreChange}
            />
          )
        },
        meta: { headClassName: "min-w-[180px] align-middle font-normal", cellClassName: "" },
      })),
      {
        id: "courseGrade",
        header: "Course Grade",
        cell: ({ row }) => {
          const { grade, pendingCount } = row.original.courseGrade
          return (
            <div className="flex flex-col">
              <span className="font-semibold">{grade}%</span>
              {pendingCount > 0 && (
                <span className="text-xs text-muted-foreground">{pendingCount} pending</span>
              )}
            </div>
          )
        },
        meta: { headClassName: GRADE_HEAD_CLASS, cellClassName: GRADE_CELL_CLASS },
      },
    ]
    // Deliberately depends only on matrix.columns: pendingEdits/isSaving change on
    // every keystroke, and including them here would rebuild the whole column model (and
    // thus TanStack Table's internal state) on every keystroke instead of just the one
    // edited cell. Fast-changing values are threaded through table `meta` instead.
  }, [matrix.columns])

  const table = useReactTable({
    // pageRows is the server payload straight through -- no client-side
    // filtering, so its identity is stable across keystrokes and TanStack
    // keeps its memoized core row model instead of rebuilding every row.
    data: pageRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.learnerId,
    meta: {
      editsByAttempt,
      disabled: isSaving,
      onScoreChange: handleScoreChange,
      onPreview: handlePreview,
    } satisfies GradingTableMeta,
  })

  if (matrix.columns.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        This course has no quizzes yet.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ListToolbar placeholder="Search learner..." />
        <Button onClick={handleSaveAll} disabled={!isDirty || isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {saveSummary && (
        <div className="mb-4 rounded-lg bg-muted p-3 text-sm">
          <div>{saveSummary.succeeded.length} attempt(s) graded successfully.</div>
          {saveSummary.failed.length > 0 && (
            <div className="mt-2 text-destructive">
              {saveSummary.failed.length} attempt(s) failed:
              <ul className="mt-1 list-disc pl-4">
                {saveSummary.failed.map((f, i) => (
                  <li key={i}>
                    {f.attemptId}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={(header.column.columnDef.meta as { headClassName?: string } | undefined)?.headClassName}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                  No learners match your search.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={(cell.column.columnDef.meta as { cellClassName?: string } | undefined)?.cellClassName}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <ListPagination meta={pageMeta} />
      </div>

      {previewTarget && (
        <SubmissionPreviewDialog
          // Keyed so switching cells mounts a fresh dialog rather than
          // briefly showing the previous attempt's answers while loading.
          key={previewTarget.attemptId}
          open={!!previewTarget}
          onOpenChange={(open) => !open && setPreviewTarget(null)}
          attemptId={previewTarget.attemptId}
          quizTitle={previewTarget.quizTitle}
          learnerName={previewTarget.learnerName}
        />
      )}
    </div>
  )
}

/**
 * Memoized: one cell per learner per quiz means this renders in the hundreds,
 * so it must only re-render when its own inputs change. All of its props are
 * either stable server data or the useCallback'd handlers and the per-attempt
 * `edits` slice built above.
 */
const CellView = memo(function CellView({
  column,
  cell,
  learnerName,
  disabled,
  edits,
  onPreview,
  onScoreChange,
}: {
  column: GradingColumn
  cell: GradingCell
  learnerName: string
  disabled: boolean
  edits: CellEdits
  onPreview: (target: PreviewTarget) => void
  onScoreChange: (attemptId: string, questionId: string, maxPoints: number, baseline: string, value: string) => void
}) {
  const hasAttempt = cell.status !== "no_attempt"
  const scoreText = cell.score !== null ? String(cell.score) : "–"

  if (!hasAttempt) {
    return <span className="text-xs text-muted-foreground">No submission</span>
  }

  return (
    <div className="flex items-center gap-2">
      {/* The score always renders, for every quiz. It used to be an exclusive
          either/or with the manual inputs, which meant a mixed quiz (objective
          + essay) showed only the point boxes and never its actual score.
          cell.grades is server-scoped to essay/file_upload/unkeyed
          short_answer via isManuallyGraded -- a cell with none of those is
          read-only, which is the whole auto-graded case. */}
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "text-sm",
            cell.status === "pending_review" ? "text-muted-foreground italic" : "text-foreground"
          )}
          title={cell.status === "pending_review" ? "Provisional — auto-graded questions only" : undefined}
        >
          {scoreText}
          {cell.status === "pending_review" && <span className="ml-1 text-xs">pending</span>}
        </span>
        {cell.grades.map((grade, i) => {
          const baseline = String(grade.pointsAwarded ?? 0)
          const value = edits[grade.questionId] ?? baseline
          return (
            <div key={grade.questionId} className="flex items-center gap-1">
              {cell.grades.length > 1 && (
                <span className="w-6 shrink-0 text-xs font-medium text-muted-foreground">Q{i + 1}</span>
              )}
              <Input
                type="number"
                min={0}
                max={grade.points}
                disabled={disabled}
                value={value}
                onChange={(e) =>
                  onScoreChange(cell.attemptId as string, grade.questionId, grade.points, baseline, e.target.value)
                }
                className="h-7 w-16"
              />
              <span className="text-xs text-muted-foreground">/ {grade.points}</span>
            </div>
          )
        })}
      </div>
      {cell.attemptId && (
        <button
          type="button"
          onClick={() =>
            onPreview({ attemptId: cell.attemptId as string, quizTitle: column.quizTitle, learnerName })
          }
          className="text-muted-foreground hover:text-foreground"
          aria-label="Preview submission"
        >
          <Eye className="size-3.5" />
        </button>
      )}
    </div>
  )
})
