import { createClient } from "@/lib/supabase/client"

async function uploadToBucket(
  bucket: string,
  file: File,
  maxBytes: number
): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: "Please choose an image file" }
  }
  if (file.size > maxBytes) {
    return { error: `Image must be under ${Math.round(maxBytes / (1024 * 1024))}MB` }
  }

  const supabase = createClient()
  const extension = file.name.split(".").pop() || "jpg"
  const path = `${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
  if (uploadError) return { error: uploadError.message }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl }
}

export function uploadCourseThumbnail(file: File) {
  return uploadToBucket("course-thumbnails", file, 5 * 1024 * 1024)
}

export function uploadCertificateTemplate(file: File) {
  return uploadToBucket("certificate-assets", file, 5 * 1024 * 1024)
}

export function uploadSignatureImage(file: File) {
  return uploadToBucket("certificate-assets", file, 1 * 1024 * 1024)
}

export function uploadLessonImage(file: File) {
  return uploadToBucket("lesson-content", file, 5 * 1024 * 1024)
}

// Study-case file_upload question answers. The quiz-submissions bucket is
// private (unlike the public buckets above), so the stored "answer" is the
// object path, not a URL -- signed URLs expire and can't be persisted as the
// long-lived quiz_responses.response value. The path is learner-owned
// (prefixed with the caller's own auth.uid()) to satisfy the bucket's RLS --
// see 20260803010000_quiz_file_upload_question.sql. Use
// getQuizSubmissionUrl() to resolve a viewable link when displaying it.
export async function uploadQuizSubmission(
  file: File,
  attemptId: string,
  questionId: string
): Promise<{ path: string } | { error: string }> {
  if (file.type !== "application/pdf") {
    return { error: "Please choose a PDF file" }
  }
  const maxBytes = 10 * 1024 * 1024
  if (file.size > maxBytes) {
    return { error: `PDF must be under ${Math.round(maxBytes / (1024 * 1024))}MB` }
  }

  const supabase = createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: "Not signed in." }

  const path = `${userId}/${attemptId}/${questionId}.pdf`

  const { error: uploadError } = await supabase.storage
    .from("quiz-submissions")
    .upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  return { path }
}

export async function getQuizSubmissionUrl(path: string): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from("quiz-submissions").createSignedUrl(path, 60 * 60)
  if (error || !data) return { error: error?.message ?? "Failed to get file URL" }
  return { url: data.signedUrl }
}
