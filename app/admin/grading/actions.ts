"use server"

import { revalidatePath } from "next/cache"
import Papa from "papaparse"

import { gradeAttempt, type EssayGrade } from "@/lib/grading-admin"
import { getAttemptSubmission, type AttemptSubmissionResponse } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

export type BulkGradeEntry = { attemptId: string; grades: EssayGrade[] }
export type BulkGradeResult = {
  succeeded: { attemptId: string; score: number; status: string }[]
  failed: { attemptId: string; error: string }[]
}

/**
 * Each gradeAttempt() is itself a chain of ~8 dependent Supabase round trips
 * (finalizeAttempt re-reads the attempt, its questions and responses, then
 * writes progress), so grading a screenful of cells serially took tens of
 * seconds. Attempts are independent of each other, but they're not free
 * either -- a bounded window keeps the connection pool out of trouble.
 */
const GRADE_CONCURRENCY = 5

/**
 * Grades many attempts (across many learners/quizzes) in one request, so the
 * matrix's top Save button issues a single round trip instead of one per
 * edited cell -- see gradeAttempt's doc comment in lib/grading-admin.ts.
 */
export async function gradeAttemptsAction(entries: BulkGradeEntry[]): Promise<ActionResult<BulkGradeResult>> {
  let graderId: string
  try {
    graderId = (await requireAdmin()).userId
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const succeeded: BulkGradeResult["succeeded"] = []
  const failed: BulkGradeResult["failed"] = []

  for (let i = 0; i < entries.length; i += GRADE_CONCURRENCY) {
    const chunk = entries.slice(i, i + GRADE_CONCURRENCY)
    const results = await Promise.all(chunk.map((entry) => gradeAttempt(entry.attemptId, graderId, entry.grades)))

    results.forEach((result, index) => {
      const { attemptId } = chunk[index]
      if ("error" in result) {
        failed.push({ attemptId, error: result.error })
      } else {
        succeeded.push({ attemptId, score: result.score, status: result.status })
      }
    })
  }

  revalidatePath("/admin/grading")
  revalidatePath("/admin/grading/course/[courseId]", "page")
  return { ok: true, data: { succeeded, failed } }
}

/** Backs the matrix's preview dialog -- see getAttemptSubmission for why answer bodies aren't in the matrix payload. */
export async function getAttemptSubmissionAction(
  attemptId: string
): Promise<ActionResult<AttemptSubmissionResponse[]>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const responses = await getAttemptSubmission(attemptId)
  if (!responses) return { ok: false, error: "Could not load submission" }

  return { ok: true, data: responses }
}

export type ImportGradesSummary = { gradedCount: number; failedRows: { attemptId: string; error: string }[] }

const SCORE_HEADER_RE = /^Q\d+ Score \(([^)]+)\)$/

/**
 * Re-imports the CSV produced by /admin/grading/export: each "Q N Score
 * (<question_id>)" column maps directly back to a question, so grading
 * doesn't depend on column order or question count staying the same as when
 * the CSV was exported. Reuses gradeAttempt so scoring stays in one place.
 */
export async function importGradesAction(csvText: string): Promise<ActionResult<ImportGradesSummary>> {
  let graderId: string
  try {
    graderId = (await requireAdmin()).userId
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const parsed = Papa.parse<string[]>(csvText.trim(), { skipEmptyLines: true })
  if (parsed.errors.length > 0) return { ok: false, error: parsed.errors[0].message }

  const [header, ...rows] = parsed.data
  if (!header) return { ok: false, error: "Empty CSV" }

  const attemptIdIndex = header.indexOf("Attempt ID")
  if (attemptIdIndex === -1) return { ok: false, error: "Missing Attempt ID column" }

  const scoreColumns: { index: number; questionId: string }[] = []
  header.forEach((cell, index) => {
    const match = SCORE_HEADER_RE.exec(cell)
    if (match) scoreColumns.push({ index, questionId: match[1] })
  })
  if (scoreColumns.length === 0) return { ok: false, error: "No essay score columns found" }

  const failedRows: { attemptId: string; error: string }[] = []
  let gradedCount = 0

  for (const row of rows) {
    const attemptId = row[attemptIdIndex]
    if (!attemptId) continue

    const grades: EssayGrade[] = []
    let rowError: string | null = null
    for (const { index, questionId } of scoreColumns) {
      const raw = row[index]?.trim()
      if (!raw) continue
      const points = Number(raw)
      if (!Number.isFinite(points)) {
        rowError = `Invalid score "${raw}"`
        break
      }
      grades.push({ questionId, points })
    }

    if (rowError) {
      failedRows.push({ attemptId, error: rowError })
      continue
    }
    if (grades.length === 0) continue

    const result = await gradeAttempt(attemptId, graderId, grades)
    if ("error" in result) {
      failedRows.push({ attemptId, error: result.error })
    } else {
      gradedCount += 1
    }
  }

  revalidatePath("/admin/grading")
  return { ok: true, data: { gradedCount, failedRows } }
}
