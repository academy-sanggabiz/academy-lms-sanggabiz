"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Lock, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Paginated } from "@/lib/pagination"
import type { CourseRosterEntry } from "@/lib/learners-admin"
import { unenrollLearnerAction } from "@/app/admin/courses/roster-actions"
import { ListPagination } from "@/components/admin/ListPagination"
import { ListToolbar } from "@/components/admin/ListToolbar"

import { InviteLearnerDialog } from "../InviteLearnerDialog"
import { useCourseDraft } from "../CourseDraftContext"

const ROSTER_PREFIX = "roster"

function formatEnrolledAt(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function LearnersTab({
  courseId,
  roster,
}: {
  courseId: string
  roster: Paginated<CourseRosterEntry>
}) {
  // Enrollment itself saves immediately (it isn't part of the draft), but the
  // private/public copy below tracks the *unsaved* toggle so it matches what
  // the admin is currently looking at on the Settings tab.
  const { draft } = useCourseDraft()
  const isPrivate = draft.isPrivate
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [inviteOpen, setInviteOpen] = useState(false)

  function handleUnenroll(entry: CourseRosterEntry) {
    startTransition(async () => {
      const result = await unenrollLearnerAction(courseId, entry.learnerId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`${entry.name} dikeluarkan`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-bold">
            Peserta Terdaftar {roster.total > 0 && `(${roster.total})`}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isPrivate
              ? "Kursus ini privat, jadi peserta hanya dapat masuk jika didaftarkan di sini."
              : "Kursus ini publik, jadi peserta juga dapat mendaftar sendiri."}
          </p>
        </div>
        <Button variant="outline" onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" />
          Undang peserta
        </Button>
      </div>

      {roster.total > 0 && (
        <ListToolbar placeholder="Cari peserta terdaftar..." prefix={ROSTER_PREFIX} />
      )}

      {roster.rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <Lock className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {roster.total === 0 ? "Belum ada peserta terdaftar" : "Tidak ada peserta yang cocok dengan pencarian Anda"}
          </p>
          {roster.total === 0 && (
            <p className="max-w-[320px] text-xs text-muted-foreground">
              Gunakan <span className="font-medium">Undang peserta</span> untuk mencari peserta yang
              sudah terdaftar di platform dan mendaftarkannya ke kursus ini.
            </p>
          )}
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {roster.rows.map((entry) => (
              <li
                key={entry.learnerId}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-ring">
                  {entry.initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{entry.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{entry.email}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    entry.status === "completed"
                      ? "bg-success text-success-foreground"
                      : "border-pill-border bg-muted text-muted-foreground"
                  }
                >
                  {entry.status === "completed" ? "Selesai" : "Aktif"}
                </Badge>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {formatEnrolledAt(entry.enrolledAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  aria-label={`Keluarkan ${entry.name}`}
                  onClick={() => handleUnenroll(entry)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <ListPagination meta={roster} prefix={ROSTER_PREFIX} />
        </>
      )}

      <InviteLearnerDialog
        courseId={courseId}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onEnrolled={() => router.refresh()}
      />
    </div>
  )
}
