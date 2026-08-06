"use client"

import { useState } from "react"
import { Award, Download } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type {
  AdminLearnerCertificate,
  AdminLearnerCourseProgress,
  AdminLearnerQuizScore,
} from "@/lib/learners-admin"

type Tab = "enrollments" | "progress" | "certificates" | "grades" | "purchases"

const TABS: { id: Tab; label: string }[] = [
  { id: "enrollments", label: "Enrollments" },
  { id: "progress", label: "Progress" },
  { id: "certificates", label: "Certificates" },
  { id: "grades", label: "Grades" },
  { id: "purchases", label: "Purchases" },
]

export function LearnerDetailTabs({
  courseProgress,
  certificates,
  quizScores,
}: {
  courseProgress: AdminLearnerCourseProgress[]
  certificates: AdminLearnerCertificate[]
  quizScores: AdminLearnerQuizScore[]
}) {
  const [tab, setTab] = useState<Tab>("enrollments")

  return (
    <div>
      <div className="mb-5 flex max-w-[640px] flex-wrap gap-1 rounded-xl bg-secondary p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "enrollments" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-bold">Enrolled Courses</h3>
          {courseProgress.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">No enrolled courses</p>
          ) : (
            <div className="flex flex-col gap-3">
              {courseProgress.map((c) => (
                <div
                  key={c.enrollmentId}
                  className="flex items-center gap-3.5 rounded-xl border border-border p-3"
                >
                  <div className="h-[52px] w-[72px] shrink-0 rounded-lg bg-secondary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold">{c.title}</div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{c.pct}% complete</div>
                  </div>
                  {c.completed && (
                    <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      Completed
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "progress" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-bold">Course Progress</h3>
          {courseProgress.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">No progress to show</p>
          ) : (
            <div className="flex flex-col gap-4">
              {courseProgress.map((c) => (
                <div key={c.enrollmentId}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 text-ring">{c.pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-ring"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "certificates" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-bold">Certificates</h3>
          {certificates.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">No certificates yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center gap-3.5 rounded-xl border border-border p-3.5"
                >
                  <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-brand-gradient text-white">
                    <Award className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[13.5px] leading-snug font-semibold">
                      {cert.courseTitle}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Certificate No. {cert.serial} · Issued{" "}
                      {new Date(cert.issuedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  {cert.pdfUrl ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<a href={cert.pdfUrl} download target="_blank" rel="noopener noreferrer" />}
                      nativeButton={false}
                    >
                      <Download className="size-3.5" />
                      Download
                    </Button>
                  ) : (
                    <span className="flex-none text-xs text-muted-foreground">Generating…</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "grades" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-bold">Grades</h3>
          {quizScores.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">No quiz attempts yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {quizScores.map((q) => (
                <div
                  key={q.attemptId}
                  className="flex items-center gap-3.5 rounded-xl border border-border p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-[13.5px] leading-snug font-semibold">{q.quizTitle}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {q.courseTitle}
                      {q.submittedAt &&
                        ` · Submitted ${new Date(q.submittedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm font-semibold">
                    {q.score !== null ? `${q.score}%` : "—"}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                      q.status === "pending_review"
                        ? "bg-amber-100 text-amber-700"
                        : q.passed
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    )}
                  >
                    {q.status === "pending_review" ? "Pending Review" : q.passed ? "Passed" : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "purchases" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-bold">Purchases</h3>
          <p className="py-5 text-center text-sm text-muted-foreground">No purchases yet.</p>
        </div>
      )}
    </div>
  )
}
