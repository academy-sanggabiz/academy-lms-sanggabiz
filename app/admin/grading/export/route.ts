import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/require-admin"

// Spreadsheet apps (Excel/Sheets) treat a cell starting with = + - @ as a
// formula, so learner-controlled text (essay answers, full_name) could
// otherwise execute arbitrary formulas/DDE payloads when an admin opens the
// export -- prefix with a neutralizing quote before the normal CSV quoting.
function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

function csvRow(values: string[]): string {
  return values.map(csvField).join(",") + "\r\n"
}

export async function GET(request: Request) {
  try {
    await requireAdmin()
  } catch {
    return new NextResponse("Not authorized", { status: 403 })
  }

  const quizId = new URL(request.url).searchParams.get("quizId")
  if (!quizId) return new NextResponse("Missing quizId", { status: 400 })

  const supabase = await createClient()

  const { data: quiz } = await supabase.from("quizzes").select("title").eq("id", quizId).single()
  if (!quiz) return new NextResponse("Quiz not found", { status: 404 })

  const { data: allQuestions, error: questionsError } = await supabase
    .from("questions")
    .select("id, prompt, type, options:question_options(id, is_correct)")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true })

  if (questionsError || !allQuestions) return new NextResponse("Could not load questions", { status: 500 })

  // Same "needs manual grading" definition grade_attempt() uses when it
  // writes is_correct = null: essays, plus short_answer questions authored
  // with no accepted-keyword option. Keeping these in sync means an attempt
  // that grade_attempt sent to pending_review always gets a score column
  // here, so it can actually be finalized via this CSV round trip.
  const manualQuestions = allQuestions.filter(
    (q) => q.type === "essay" || (q.type === "short_answer" && !q.options.some((o) => o.is_correct))
  )

  if (manualQuestions.length === 0) {
    return new NextResponse("This quiz has no manually-graded questions", { status: 400 })
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from("quiz_attempts")
    .select(
      `id, learner_id, submitted_at,
       learner:profiles!quiz_attempts_learner_id_fkey(full_name),
       responses:quiz_responses(question_id, response, points_awarded)`
    )
    .eq("quiz_id", quizId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })

  if (attemptsError || !attempts) return new NextResponse("Could not load attempts", { status: 500 })

  // Header cells encode each question's id in parentheses so the import path
  // can map "Q N Score (<question_id>)" columns back to the right question
  // without relying on column order staying stable.
  const header = ["Nama Peserta", "Learner ID", "Attempt ID"]
  manualQuestions.forEach((q, i) => {
    header.push(`Q${i + 1} Answer (${q.id})`, `Q${i + 1} Score (${q.id})`)
  })

  let csv = csvRow(header)

  for (const attempt of attempts) {
    const learner = Array.isArray(attempt.learner) ? attempt.learner[0] : attempt.learner
    const responseByQuestion = new Map((attempt.responses ?? []).map((r) => [r.question_id, r]))

    const row = [learner?.full_name ?? "Unknown learner", attempt.learner_id, attempt.id]
    for (const q of manualQuestions) {
      const response = responseByQuestion.get(q.id)
      const answer = typeof response?.response === "string" ? response.response : ""
      const score = response?.points_awarded !== null && response?.points_awarded !== undefined
        ? String(response.points_awarded)
        : ""
      row.push(answer, score)
    }
    csv += csvRow(row)
  }

  const filename = `${quiz.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-essays.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
