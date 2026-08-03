import type { SupabaseClient } from "@supabase/supabase-js"
import { renderToBuffer } from "@react-pdf/renderer"

import { CertificateDocument } from "@/components/certificates/CertificateDocument"

export type Certificate = {
  id: string
  enrollment_id: string
  serial: string
  issued_at: string
  pdf_url: string | null
}

type CheckAndIssueParams = {
  enrollmentId: string
  courseId: string
  learnerId: string
}

/**
 * Call this right after anything that can complete a lesson (toggleLessonComplete,
 * submitQuiz, finalizeAttempt). Once the course has every lesson done AND every
 * quiz-type lesson passed -- lesson_progress alone isn't a safe "quiz passed"
 * signal since the sidebar checkbox lets a learner manually flip any lesson,
 * quiz-type included, with no gate -- it flips enrollments.status to
 * 'completed' unconditionally. Certificate issuance itself stays gated by
 * course_certificate_settings.enabled/existing (most courses have no row
 * here), but the enrollment-status sync must not be, or it silently never
 * happens for any course without certificates configured. Idempotent: once
 * a certificate row exists for the enrollment it's returned as-is, never
 * regenerated.
 */
export async function checkAndIssueCertificate(
  supabase: SupabaseClient,
  { enrollmentId, courseId, learnerId }: CheckAndIssueParams
): Promise<Certificate | null> {
  const { data: settings } = await supabase
    .from("course_certificate_settings")
    .select("*")
    .eq("course_id", courseId)
    .maybeSingle()

  const { data: sections, error: sectionsError } = await supabase
    .from("course_sections")
    .select("lessons(id, quiz:quizzes(id))")
    .eq("course_id", courseId)

  if (sectionsError || !sections) {
    if (sectionsError) console.error("checkAndIssueCertificate: sections lookup failed", sectionsError.message)
    return null
  }

  const lessons = (sections as { lessons: { id: string; quiz: { id: string } | { id: string }[] | null }[] }[])
    .flatMap((s) => s.lessons ?? [])
    .map((l) => ({
      id: l.id,
      quizId: (Array.isArray(l.quiz) ? l.quiz[0] : l.quiz)?.id ?? null,
    }))

  if (lessons.length === 0) return null

  const { data: progressRows, error: progressError } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("enrollment_id", enrollmentId)
    .eq("completed", true)

  if (progressError) {
    console.error("checkAndIssueCertificate: progress lookup failed", progressError.message)
    return null
  }

  const completedLessonIds = new Set((progressRows ?? []).map((r) => r.lesson_id as string))
  const allLessonsComplete = lessons.every((l) => completedLessonIds.has(l.id))
  if (!allLessonsComplete) return null

  const quizIds = lessons.map((l) => l.quizId).filter((id): id is string => id !== null)
  if (quizIds.length > 0) {
    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("quiz_id")
      .eq("learner_id", learnerId)
      .eq("passed", true)
      .in("quiz_id", quizIds)

    if (attemptsError) {
      console.error("checkAndIssueCertificate: quiz attempts lookup failed", attemptsError.message)
      return null
    }

    const passedQuizIds = new Set((attempts ?? []).map((a) => a.quiz_id as string))
    const allQuizzesPassed = quizIds.every((id) => passedQuizIds.has(id))
    if (!allQuizzesPassed) return null
  }

  const { error: enrollmentUpdateError } = await supabase
    .from("enrollments")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", enrollmentId)

  if (enrollmentUpdateError) {
    console.error("checkAndIssueCertificate: enrollment update failed", enrollmentUpdateError.message)
  }

  if (!settings || !settings.enabled) return null

  const { data: existing, error: existingError } = await supabase
    .from("certificates")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .maybeSingle()

  if (existingError) {
    console.error("checkAndIssueCertificate: existing certificate lookup failed", existingError.message)
    return null
  }

  if (existing) return existing as Certificate

  let certificate = await insertCertificateWithUniqueSerial(supabase, enrollmentId)
  if (!certificate) return null

  const pdfUrl = await generateAndUploadPdf(supabase, {
    certificate,
    settings,
    courseId,
    learnerId,
  })

  if (pdfUrl) {
    const { data: updated } = await supabase
      .from("certificates")
      .update({ pdf_url: pdfUrl })
      .eq("id", certificate.id)
      .select("*")
      .single()

    if (updated) certificate = updated as Certificate
  }

  return certificate
}

async function insertCertificateWithUniqueSerial(
  supabase: SupabaseClient,
  enrollmentId: string
): Promise<Certificate | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const serial = generateSerial()
    const { data: inserted, error: insertError } = await supabase
      .from("certificates")
      .insert({ enrollment_id: enrollmentId, serial })
      .select("*")
      .single()

    if (!insertError && inserted) return inserted as Certificate
    // 23505 = unique_violation -- retry with a fresh serial. Any other error
    // (including a concurrent insert already covering enrollment_id, which
    // the unique constraint on that column would also raise as 23505) means
    // giving up and letting the caller fall back to a re-check later.
    if (insertError?.code !== "23505") {
      if (insertError) console.error("checkAndIssueCertificate: certificate insert failed", insertError.message)
      return null
    }
  }
  return null
}

function generateSerial(): string {
  const year = new Date().getFullYear()
  const random = crypto.randomUUID().slice(0, 8).toUpperCase()
  return `CERT-${year}-${random}`
}

async function generateAndUploadPdf(
  supabase: SupabaseClient,
  {
    certificate,
    settings,
    courseId,
    learnerId,
  }: {
    certificate: Certificate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings: any
    courseId: string
    learnerId: string
  }
): Promise<string | null> {
  try {
    const [{ data: course }, { data: profile }] = await Promise.all([
      supabase.from("courses").select("title").eq("id", courseId).single(),
      supabase.from("profiles").select("full_name, email").eq("id", learnerId).single(),
    ])

    const learnerName = profile?.full_name || profile?.email || "Learner"
    const courseTitle = course?.title ?? "Course"
    const description = (settings.description ?? "")
      .replaceAll("[Student Name]", learnerName)
      .replaceAll("[Course Name]", courseTitle)

    const pdfBuffer = await renderToBuffer(
      CertificateDocument({
        learnerName,
        courseTitle,
        certificateType: settings.certificate_type,
        customTitle: settings.custom_title,
        description,
        signerName: settings.signer_name,
        signerTitle: settings.signer_title,
        signatureUrl: settings.signature_url,
        templateUrl: settings.template_url,
        serial: certificate.serial,
        issuedAt: certificate.issued_at,
        additionalText: settings.additional_text,
      })
    )

    const path = `certificates/${learnerId}/${certificate.enrollment_id}.pdf`
    const { error: uploadError } = await supabase.storage
      .from("certificate-assets")
      .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true })

    if (uploadError) {
      console.error("checkAndIssueCertificate: upload failed", uploadError.message)
      return null
    }

    const { data: publicUrlData } = supabase.storage.from("certificate-assets").getPublicUrl(path)
    return publicUrlData.publicUrl
  } catch (err) {
    console.error("checkAndIssueCertificate: PDF generation failed", err)
    return null
  }
}
