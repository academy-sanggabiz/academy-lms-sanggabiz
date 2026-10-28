/**
 * Client-safe lesson-note helpers (types + limits). The fetches live in
 * lib/notes-server.ts, which must never be imported by a Client Component.
 */

/** Mirrors the `char_length(content) <= 20000` check on public.lesson_notes. */
export const NOTE_MAX_LENGTH = 20000

export type LessonNote = {
  content: string
  updatedAt: string
}

export type CourseNote = {
  lessonId: string
  lessonTitle: string
  sectionTitle: string
  content: string
  updatedAt: string
}

/** First ~n characters of a note on one line, cut at a word boundary. */
export function noteExcerpt(content: string, max = 160): string {
  const flat = content.replace(/\s+/g, " ").trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** "14.05" -- Indonesian time format, in the viewer's local time zone. */
export function formatNoteTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}

/** "28 Okt 2026, 14.05" */
export function formatNoteDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}
