import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { isManuallyGraded } from "@/lib/grading-server"

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

type QuestionRow = { id: string; prompt: string; type: string; options: { is_correct: boolean }[] }

function resolveAnswerCell(response: unknown): string {
  return typeof response === "string" ? response : ""
}

async function loadQuizForExport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quizId: string,
  admin: Awaited<ReturnType<typeof requireAdmin>>
) {
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, lesson:lessons(section:course_sections(course:courses(created_by)))")
    .eq("id", quizId)
    .single()
  if (!quiz) return null

  // quizzes has no direct course_id -- ownership is checked by joining up to
  // the course, same app-layer guard as lib/grading-server.ts (RLS alone
  // can't be fully trusted here, see getOwnedCourseIdsOrNull in
  // lib/courses-admin.ts for why).
  const lesson = Array.isArray(quiz.lesson) ? quiz.lesson[0] : quiz.lesson
  const section = lesson ? (Array.isArray(lesson.section) ? lesson.section[0] : lesson.section) : null
  const course = section ? (Array.isArray(section.course) ? section.course[0] : section.course) : null

  if (admin.role !== "superadmin" && course?.created_by !== admin.userId) return null
  return quiz
}

async function buildQuizCsv(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quizId: string,
  manualQuestions: QuestionRow[]
): Promise<string[][]> {
  const { data: attempts, error } = await supabase
    .from("quiz_attempts")
    .select(
      `id, learner_id, submitted_at,
       learner:profiles!quiz_attempts_learner_id_fkey(full_name),
       responses:quiz_responses(question_id, response, points_awarded)`
    )
    .eq("quiz_id", quizId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })

  if (error || !attempts) return []

  const rows: string[][] = []
  for (const attempt of attempts) {
    const learner = Array.isArray(attempt.learner) ? attempt.learner[0] : attempt.learner
    const responseByQuestion = new Map((attempt.responses ?? []).map((r) => [r.question_id, r]))

    const row = [learner?.full_name ?? "Unknown learner", attempt.learner_id, attempt.id]
    for (const q of manualQuestions) {
      const response = responseByQuestion.get(q.id)
      const answer = resolveAnswerCell(response?.response)
      const score =
        response?.points_awarded !== null && response?.points_awarded !== undefined
          ? String(response.points_awarded)
          : ""
      row.push(answer, score)
    }
    rows.push(row)
  }
  return rows
}

export async function GET(request: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return new NextResponse("Not authorized", { status: 403 })
  }

  const url = new URL(request.url)
  const quizId = url.searchParams.get("quizId")
  const courseId = url.searchParams.get("courseId")
  if (!quizId && !courseId) return new NextResponse("Missing quizId or courseId", { status: 400 })

  const supabase = await createClient()

  if (quizId) {
    const quiz = await loadQuizForExport(supabase, quizId, admin)
    if (!quiz) return new NextResponse("Quiz not found", { status: 404 })

    const { data: allQuestions, error: questionsError } = await supabase
      .from("questions")
      .select("id, prompt, type, options:question_options(id, is_correct)")
      .eq("quiz_id", quizId)
      .order("position", { ascending: true })

    if (questionsError || !allQuestions) return new NextResponse("Could not load questions", { status: 500 })

    const manualQuestions = allQuestions.filter((q) => isManuallyGraded(q.type, q.options))
    if (manualQuestions.length === 0) {
      return new NextResponse("This quiz has no manually-graded questions", { status: 400 })
    }

    // Header cells encode each question's id in parentheses so the import path
    // can map "Q N Score (<question_id>)" columns back to the right question
    // without relying on column order staying stable.
    const header = ["Nama Peserta", "Learner ID", "Attempt ID"]
    manualQuestions.forEach((q, i) => header.push(`Q${i + 1} Answer (${q.id})`, `Q${i + 1} Score (${q.id})`))

    const rows = await buildQuizCsv(supabase, quizId, manualQuestions)

    let csv = csvRow(header)
    for (const row of rows) csv += csvRow(row)

    const filename = `${quiz.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-grading.csv`
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  // courseId scope: union of manually-graded questions across every quiz in
  // the course, one row per attempt, with a leading Quiz column. Rows for an
  // attempt of quiz A simply leave quiz B's answer/score cells blank -- the
  // import path already skips blank score cells, so no import-side change
  // is needed to round-trip this shape.
  const { data: course } = await supabase.from("courses").select("id, title, created_by").eq("id", courseId!).single()
  if (!course) return new NextResponse("Course not found", { status: 404 })
  if (admin.role !== "superadmin" && course.created_by !== admin.userId) {
    return new NextResponse("Course not found", { status: 404 })
  }

  // Scoped by the join rather than selecting every quiz on the platform and
  // post-filtering in JS -- same filter lib/grading-server.ts uses.
  const { data: courseQuizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("id, title, lesson:lessons!inner(section:course_sections!inner(course_id))")
    .eq("lesson.section.course_id", course.id)
    .order("title", { ascending: true })

  if (quizzesError || !courseQuizzes) return new NextResponse("Could not load quizzes", { status: 500 })

  // One questions query for the whole course instead of one per quiz.
  const { data: allQuestions, error: questionsError } = await supabase
    .from("questions")
    .select("id, quiz_id, prompt, type, options:question_options(id, is_correct)")
    .in(
      "quiz_id",
      courseQuizzes.map((quiz) => quiz.id)
    )
    .order("position", { ascending: true })

  if (questionsError || !allQuestions) return new NextResponse("Could not load questions", { status: 500 })

  const questionsByQuiz = new Map<string, QuestionRow[]>()
  for (const question of allQuestions) {
    if (!isManuallyGraded(question.type, question.options)) continue
    const bucket = questionsByQuiz.get(question.quiz_id) ?? []
    bucket.push(question)
    questionsByQuiz.set(question.quiz_id, bucket)
  }

  const perQuizQuestions: { quizId: string; quizTitle: string; questions: QuestionRow[] }[] = []
  for (const quiz of courseQuizzes) {
    const manualQuestions = questionsByQuiz.get(quiz.id)
    if (manualQuestions?.length) {
      perQuizQuestions.push({ quizId: quiz.id, quizTitle: quiz.title, questions: manualQuestions })
    }
  }

  if (perQuizQuestions.length === 0) {
    return new NextResponse("This course has no manually-graded questions", { status: 400 })
  }

  const header = ["Quiz", "Nama Peserta", "Learner ID", "Attempt ID"]
  const columnsByQuiz = new Map<string, { index: number; questionId: string; type: string }[]>()
  for (const { quizId: qId, questions } of perQuizQuestions) {
    const columns = questions.map((q, i) => {
      const answerIndex = header.length
      header.push(`Q${i + 1} Answer (${q.id})`, `Q${i + 1} Score (${q.id})`)
      return { index: answerIndex, questionId: q.id, type: q.type }
    })
    columnsByQuiz.set(qId, columns)
  }

  let csv = csvRow(header)
  for (const { quizId: qId, quizTitle } of perQuizQuestions) {
    const columns = columnsByQuiz.get(qId)!
    const rows = await buildQuizCsv(
      supabase,
      qId,
      columns.map((c) => ({ id: c.questionId, prompt: "", type: c.type, options: [] }))
    )
    for (const [learnerName, learnerId, attemptId, ...cells] of rows) {
      const fullRow = new Array(header.length).fill("")
      fullRow[0] = quizTitle
      fullRow[1] = learnerName
      fullRow[2] = learnerId
      fullRow[3] = attemptId
      columns.forEach((col, i) => {
        fullRow[col.index] = cells[i * 2]
        fullRow[col.index + 1] = cells[i * 2 + 1]
      })
      csv += csvRow(fullRow)
    }
  }

  const filename = `${course.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-grading.csv`
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
