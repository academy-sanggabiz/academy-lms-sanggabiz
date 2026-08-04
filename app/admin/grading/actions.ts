"use server"

import { revalidatePath } from "next/cache"
import Papa from "papaparse"

import { gradeAttempt, type EssayGrade } from "@/lib/grading-admin"
import { requireAdmin } from "@/lib/auth/require-admin"

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

export async function gradeAttemptAction(attemptId: string, grades: EssayGrade[]): Promise<ActionResult<undefined>> {
  let graderId: string
  try {
    graderId = (await requireAdmin()).userId
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await gradeAttempt(attemptId, graderId, grades)
  if ("error" in result) return { ok: false, error: result.error }

  revalidatePath("/admin/grading")
  revalidatePath("/admin/grading/course/[courseId]", "page")
  revalidatePath("/admin/grading/quiz/[quizId]", "page")
  revalidatePath("/admin/grading/attempt/[attemptId]", "page")
  return { ok: true, data: undefined }
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
