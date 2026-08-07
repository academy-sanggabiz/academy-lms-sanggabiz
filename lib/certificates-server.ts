import { createClient } from "@/lib/supabase/server"

export type LearnerCertificateSummary = {
  id: string
  courseId: string
  courseTitle: string
  serial: string
  issuedAt: string
  pdfUrl: string | null
  feedbackGiven: boolean
}

export async function getLearnerCertificates(): Promise<LearnerCertificateSummary[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("certificates")
    .select(
      "id, serial, issued_at, pdf_url, enrollment:enrollments!inner(learner_id, course:courses(id, title), feedback:course_feedback(id))"
    )
    .eq("enrollment.learner_id", userId)
    .order("issued_at", { ascending: false })

  if (error) {
    console.error("getLearnerCertificates failed:", error.message)
    return []
  }

  return data
    .map((row) => {
      const enrollment = Array.isArray(row.enrollment) ? row.enrollment[0] : row.enrollment
      const course = enrollment ? (Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course) : null
      if (!course) return null
      const feedback = enrollment ? (Array.isArray(enrollment.feedback) ? enrollment.feedback : [enrollment.feedback]) : []
      return {
        id: row.id,
        courseId: course.id,
        courseTitle: course.title,
        serial: row.serial,
        issuedAt: row.issued_at,
        pdfUrl: row.pdf_url,
        feedbackGiven: feedback.filter(Boolean).length > 0,
      }
    })
    .filter((c): c is LearnerCertificateSummary => c !== null)
}
