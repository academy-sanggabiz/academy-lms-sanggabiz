import { BookOpen, GraduationCap, Trophy, Users } from "lucide-react"

import { getAdminCourseStats, getRecentCourses } from "@/lib/courses-admin"
import { getRecentEnrollments } from "@/lib/dashboard-admin"
import { getAdminLearnerStats } from "@/lib/learners-admin"
import { listTrackingEnrollments } from "@/lib/tracking-server"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { StatCard } from "@/components/admin/StatCard"
import { RecentEnrollmentsCard } from "@/components/admin/dashboard/RecentEnrollmentsCard"
import { RecentCoursesCard } from "@/components/admin/dashboard/RecentCoursesCard"
import { OnlineTrackingCard } from "@/components/admin/dashboard/OnlineTrackingCard"

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const raw = await searchParams
  const enrollParams = parseListParams<Record<string, never>>(raw, {
    prefix: "enroll",
    sortable: [],
    defaultSort: "enrolled_at",
    defaultPageSize: 5,
  })
  const courseParams = parseListParams<Record<string, never>>(raw, {
    prefix: "course",
    sortable: [],
    defaultSort: "created_at",
    defaultPageSize: 5,
  })
  const trackParams = parseListParams<Record<string, never>>(raw, {
    prefix: "track",
    sortable: ["enrolled_at"],
    defaultSort: "enrolled_at",
    defaultPageSize: 5,
  })

  const [learnerStats, courseStats, recentEnrollments, recentCourses, recentTracking] = await Promise.all([
    getAdminLearnerStats(),
    getAdminCourseStats(),
    getRecentEnrollments(enrollParams),
    getRecentCourses(courseParams),
    listTrackingEnrollments(trackParams),
  ])

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
        <RecentEnrollmentsCard enrollments={recentEnrollments} />
        <RecentCoursesCard courses={recentCourses} />
      </div>

      <div className="mt-6">
        <OnlineTrackingCard rows={recentTracking} />
      </div>
    </div>
  )
}
