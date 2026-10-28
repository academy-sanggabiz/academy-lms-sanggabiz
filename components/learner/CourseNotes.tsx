import Link from "next/link"
import { ArrowRight, NotebookPen } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatNoteDateTime, noteExcerpt, type CourseNote } from "@/lib/notes"

/**
 * "Catatan saya" on the course page: the enrolled learner's own lesson
 * notes, in curriculum order, each linking back to its lesson in the player.
 * Server Component -- the notes are fetched by the page (lib/notes-server.ts).
 */
export function CourseNotes({ courseId, notes }: { courseId: string; notes: CourseNote[] }) {
  return (
    <Card>
      <CardContent>
        <h2 id="course-notes-heading" className="mb-1 text-lg font-bold">
          Catatan saya
        </h2>
        <p className="mb-4 text-[13px] text-muted-foreground">Hanya Anda yang dapat melihat catatan ini.</p>

        {notes.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground">
            <NotebookPen className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              Anda belum menulis catatan di kursus ini. Tulis catatan di bawah materi pelajaran, dan catatan itu
              akan muncul di sini.
            </p>
          </div>
        ) : (
          <ul aria-labelledby="course-notes-heading" className="flex flex-col divide-y divide-border">
            {notes.map((note) => (
              <li key={note.lessonId} className="flex flex-col gap-1.5 py-3.5 first:pt-0 last:pb-0">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {note.sectionTitle}
                </div>
                <h3 className="text-[15px] font-semibold">{note.lessonTitle}</h3>
                <p className="text-sm leading-relaxed break-words text-muted-foreground">{noteExcerpt(note.content)}</p>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="text-xs text-muted-foreground">
                    Diperbarui {formatNoteDateTime(note.updatedAt)}
                  </span>
                  <Link
                    href={`/learn/${courseId}?lesson=${note.lessonId}`}
                    className="inline-flex min-h-6 items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4 hover:no-underline"
                  >
                    Buka pelajaran<span className="sr-only">: {note.lessonTitle}</span>
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
