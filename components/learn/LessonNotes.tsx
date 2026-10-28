"use client"

import { useEffect, useId, useRef, useState } from "react"
import { AlertCircle, Check, Loader2, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { NOTE_MAX_LENGTH, formatNoteDateTime, formatNoteTime, type LessonNote } from "@/lib/notes"
import { saveLessonNote } from "@/app/learn/[courseId]/notes-actions"

const AUTOSAVE_DELAY_MS = 800
/** Show the character counter once the note passes this share of the limit. */
const COUNTER_THRESHOLD = 0.9

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "deleted" }
  | { kind: "error"; message: string }

/**
 * "Catatan saya": the learner's private note for one lesson. Autosaves
 * ~800 ms after typing stops and on blur; the typed text stays in the
 * textarea whatever the server answers, so an error never loses work.
 * Saves run one at a time (a promise chain), so an older write can never
 * land after a newer one. Rendered only in learner mode -- admin preview
 * has no enrollment to attach a note to.
 */
export function LessonNotes({ lessonId, initialNote }: { lessonId: string; initialNote: LessonNote | null }) {
  const [value, setValue] = useState(initialNote?.content ?? "")
  const [state, setState] = useState<SaveState>({ kind: "idle" })
  const textareaId = useId()
  const hintId = useId()
  const counterId = useId()

  const latestRef = useRef(initialNote?.content ?? "")
  const savedRef = useRef(initialNote?.content ?? "")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chainRef = useRef<Promise<void>>(Promise.resolve())

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function save() {
    clearTimer()
    chainRef.current = chainRef.current.then(async () => {
      const content = latestRef.current
      if (content === savedRef.current) return
      setState({ kind: "saving" })
      try {
        const res = await saveLessonNote({ lessonId, content })
        if (!res.ok) {
          setState({ kind: "error", message: res.error })
          return
        }
        savedRef.current = content
        // A newer edit arrived while this one was in flight: its own save
        // is already queued, so leave the status on "saving".
        if (latestRef.current !== content) return
        setState(res.updatedAt ? { kind: "saved", at: res.updatedAt } : { kind: "deleted" })
      } catch {
        setState({
          kind: "error",
          message: "Catatan belum tersimpan. Periksa koneksi Anda, lalu coba lagi.",
        })
      }
    })
  }

  function handleChange(next: string) {
    setValue(next)
    latestRef.current = next
    clearTimer()
    timerRef.current = setTimeout(save, AUTOSAVE_DELAY_MS)
  }

  // Leaving the lesson (Next/Previous, sidebar) unmounts this component:
  // flush a pending edit instead of dropping it, and warn on tab close while
  // something is still unsaved.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (latestRef.current !== savedRef.current) e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (latestRef.current !== savedRef.current) {
        void saveLessonNote({ lessonId, content: latestRef.current })
      }
    }
  }, [lessonId])

  const showCounter = value.length >= NOTE_MAX_LENGTH * COUNTER_THRESHOLD
  const describedBy = [hintId, showCounter ? counterId : null].filter(Boolean).join(" ")

  return (
    <section aria-labelledby={`${textareaId}-heading`} className="border-t border-border bg-card">
      <div className="max-w-[840px] p-5 sm:p-7">
        <h2 id={`${textareaId}-heading`} className="mb-1 text-lg font-bold">
          Catatan saya
        </h2>
        <p id={hintId} className="mb-3 flex items-start gap-1.5 text-[13px] text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Hanya Anda yang dapat melihat catatan ini. Catatan tersimpan otomatis saat Anda berhenti mengetik.
        </p>

        <label htmlFor={textareaId} className="mb-1.5 block text-sm font-semibold">
          Catatan untuk pelajaran ini
        </label>
        <Textarea
          id={textareaId}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={save}
          maxLength={NOTE_MAX_LENGTH}
          rows={5}
          aria-describedby={describedBy}
          aria-invalid={state.kind === "error" || undefined}
          placeholder="Tulis poin penting, pertanyaan, atau ide Anda dari pelajaran ini."
          className="max-h-[60vh] min-h-32 bg-card text-[15px] leading-relaxed md:text-[15px]"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div aria-live="polite" role="status" className="min-h-6 text-[13px]">
            <StatusText state={state} initialNote={initialNote} />
          </div>
          {state.kind === "error" && (
            <Button type="button" variant="outline" size="sm" onClick={save}>
              Coba lagi
            </Button>
          )}
          {showCounter && (
            <span
              id={counterId}
              className={cn(
                "ml-auto text-[13px] tabular-nums",
                value.length >= NOTE_MAX_LENGTH ? "font-semibold text-destructive" : "text-muted-foreground"
              )}
            >
              {value.length.toLocaleString("id-ID")} dari {NOTE_MAX_LENGTH.toLocaleString("id-ID")} karakter
              {value.length >= NOTE_MAX_LENGTH ? " (batas tercapai)" : ""}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

function StatusText({ state, initialNote }: { state: SaveState; initialNote: LessonNote | null }) {
  switch (state.kind) {
    case "saving":
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Menyimpan…
        </span>
      )
    case "saved":
      return (
        <span className="flex items-center gap-1.5 font-medium text-success-foreground">
          <Check className="size-3.5" aria-hidden />
          Tersimpan pukul {formatNoteTime(state.at)}
        </span>
      )
    case "deleted":
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Check className="size-3.5" aria-hidden />
          Catatan dihapus.
        </span>
      )
    case "error":
      return (
        <span className="flex items-start gap-1.5 font-medium text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {state.message} Teks Anda masih ada di kotak ini.
        </span>
      )
    case "idle":
      return initialNote ? (
        // Server and browser may sit in different time zones; the browser's
        // rendering of the time is the one that counts.
        <span className="text-muted-foreground" suppressHydrationWarning>
          Terakhir disimpan {formatNoteDateTime(initialNote.updatedAt)}
        </span>
      ) : null
  }
}
