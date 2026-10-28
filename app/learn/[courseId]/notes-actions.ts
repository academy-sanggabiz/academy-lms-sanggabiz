"use server"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { NOTE_MAX_LENGTH } from "@/lib/notes"

export type SaveLessonNoteResult = { ok: true; updatedAt: string | null } | { ok: false; error: string }

const saveLessonNoteSchema = z.object({
  lessonId: z.guid(),
  content: z.string().max(NOTE_MAX_LENGTH),
})

/**
 * Autosave target for the player's "Catatan saya" box. Upserts the learner's
 * note for a lesson; an empty (whitespace-only) note deletes the row instead,
 * so a cleared note leaves nothing behind. RLS does the real gating: own row
 * only, and insert/update require an enrollment in the lesson's course.
 * No revalidatePath: the textarea is the source of truth while typing, and
 * the course page reads fresh on its next render.
 */
export async function saveLessonNote(input: { lessonId: string; content: string }): Promise<SaveLessonNoteResult> {
  const parsed = saveLessonNoteSchema.safeParse(input)
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((i) => i.path[0] === "content")
    return {
      ok: false,
      error: tooLong
        ? `Catatan terlalu panjang. Batasnya ${NOTE_MAX_LENGTH.toLocaleString("id-ID")} karakter.`
        : "Pelajaran tidak dikenali. Muat ulang halaman, lalu coba lagi.",
    }
  }
  const { lessonId, content } = parsed.data

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    return { ok: false, error: "Sesi Anda berakhir. Masuk lagi, lalu coba simpan." }
  }

  if (content.trim() === "") {
    const { error } = await supabase
      .from("lesson_notes")
      .delete()
      .eq("learner_id", userId)
      .eq("lesson_id", lessonId)
    if (error) {
      console.error("saveLessonNote delete failed:", error.message)
      return { ok: false, error: "Catatan belum terhapus. Periksa koneksi Anda, lalu coba lagi." }
    }
    return { ok: true, updatedAt: null }
  }

  const { data, error } = await supabase
    .from("lesson_notes")
    .upsert({ learner_id: userId, lesson_id: lessonId, content }, { onConflict: "learner_id,lesson_id" })
    .select("updated_at")
    .single()

  if (error) {
    console.error("saveLessonNote upsert failed:", error.message)
    // 42501 = RLS refused the row: the learner is not enrolled in this course.
    if (error.code === "42501") {
      return { ok: false, error: "Catatan hanya bisa disimpan untuk kursus yang Anda ikuti." }
    }
    return { ok: false, error: "Catatan belum tersimpan. Periksa koneksi Anda, lalu coba lagi." }
  }

  return { ok: true, updatedAt: data.updated_at }
}
