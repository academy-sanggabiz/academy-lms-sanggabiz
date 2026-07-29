import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BookOpen, Mail, Trophy } from "lucide-react"

import { getAdminLearnerCourseProgress, getAdminLearnerDetail } from "@/lib/learners-admin"
import { LearnerDetailTabs } from "@/components/admin/learners/LearnerDetailTabs"

export default async function AdminLearnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [learner, courseProgress] = await Promise.all([
    getAdminLearnerDetail(id),
    getAdminLearnerCourseProgress(id),
  ])

  if (!learner) notFound()

  const enrolledCount = courseProgress.length
  const completedCount = courseProgress.filter((c) => c.completed).length
  const avgProgress =
    enrolledCount > 0
      ? Math.round(courseProgress.reduce((sum, c) => sum + c.pct, 0) / enrolledCount)
      : 0

  return (
    <div>
      <Link
        href="/admin/learners"
        className="mb-5 flex items-center gap-2 text-sm font-semibold hover:text-ring"
      >
        <ArrowLeft className="size-4" />
        Back to Learners
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-6">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-ring text-2xl font-semibold text-primary-foreground uppercase">
          {learner.initial}
        </span>
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            <span className="text-2xl font-bold">{learner.name}</span>
            <span className="rounded-full border border-ring/30 bg-secondary px-3 py-1 text-xs font-semibold text-ring">
              Learner
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-[15px]" />
            {learner.email}
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Enrolled Courses" value={String(enrolledCount)} />
        <StatCard icon={Trophy} label="Completed" value={String(completedCount)} />
        <StatCard icon={BookOpen} label="Avg Progress" value={`${avgProgress}%`} />
      </div>

      <LearnerDetailTabs courseProgress={courseProgress} />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="text-[28px] font-bold">{value}</div>
    </div>
  )
}
