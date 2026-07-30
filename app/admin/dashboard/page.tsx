import { BookOpen, GraduationCap, Trophy, Users } from "lucide-react"

import { getAdminCourseList, getAdminCourseStats } from "@/lib/courses-admin"
import { getRecentEnrollments } from "@/lib/dashboard-admin"
import { getAdminLearnerStats } from "@/lib/learners-admin"
import { StatCard } from "@/components/admin/StatCard"
import { Badge } from "@/components/ui/badge"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function AdminDashboardPage() {
  const [learnerStats, courseStats, recentEnrollments, courses] = await Promise.all([
    getAdminLearnerStats(),
    getAdminCourseStats(),
    getRecentEnrollments(5),
    getAdminCourseList(),
  ])
  const recentCourses = courses.slice(0, 5)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of learners, courses, and recent activity
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Learners" value={learnerStats.totalLearners} />
        <StatCard
          icon={BookOpen}
          label="Total Courses"
          value={courseStats.totalCourses}
          hint={`${courseStats.publishedCourses} published`}
        />
        <StatCard icon={GraduationCap} label="Total Enrollments" value={learnerStats.totalEnrollments} />
        <StatCard icon={Trophy} label="Completed Courses" value={learnerStats.totalCompleted} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Recent Enrollments</h2>
          {recentEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments yet</p>
          ) : (
            <ul className="space-y-3">
              {recentEnrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.learnerName}</div>
                    <div className="truncate text-xs text-muted-foreground">{e.courseTitle}</div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(e.enrolledAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Recent Courses</h2>
          {recentCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses yet</p>
          ) : (
            <ul className="space-y-3">
              {recentCourses.map((c) => {
                const isPublished = c.status === "published"
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 truncate font-medium">{c.title}</div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant={isPublished ? "default" : "outline"}
                        className={
                          isPublished
                            ? "bg-success text-success-foreground"
                            : "border-pill-border bg-draft-background text-destructive"
                        }
                      >
                        {isPublished ? "Published" : "Draft"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
