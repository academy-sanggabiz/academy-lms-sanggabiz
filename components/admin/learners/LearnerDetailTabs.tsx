"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import type { AdminLearnerCourseProgress } from "@/lib/learners-admin"

type Tab = "enrollments" | "progress" | "purchases"

const TABS: { id: Tab; label: string }[] = [
  { id: "enrollments", label: "Enrollments" },
  { id: "progress", label: "Progress" },
  { id: "purchases", label: "Purchases" },
]

export function LearnerDetailTabs({
  courseProgress,
}: {
  courseProgress: AdminLearnerCourseProgress[]
}) {
  const [tab, setTab] = useState<Tab>("enrollments")

  return (
    <div>
      <div className="mb-5 flex max-w-[420px] gap-1 rounded-xl bg-secondary p-1.5">
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

      {tab === "purchases" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-bold">Purchases</h3>
          <p className="py-5 text-center text-sm text-muted-foreground">No purchases yet.</p>
        </div>
      )}
    </div>
  )
}
