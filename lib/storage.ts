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
