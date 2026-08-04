import { BookOpen, GraduationCap, Trophy, Users } from "lucide-react"

import { getAdminCourseList, getAdminCourseStats } from "@/lib/courses-admin"
import { getRecentEnrollments } from "@/lib/dashboard-admin"
import { getAdminLearnerStats } from "@/lib/learners-admin"
import { listTrackingEnrollments } from "@/lib/tracking-server"
import { StatCard } from "@/components/admin/StatCard"
import { RecentEnrollmentsCard } from "@/components/admin/dashboard/RecentEnrollmentsCard"
import { RecentCoursesCard } from "@/components/admin/dashboard/RecentCoursesCard"
import { OnlineTrackingCard } from "@/components/admin/dashboard/OnlineTrackingCard"

export default async function AdminDashboardPage() {
  const [learnerStats, courseStats, recentEnrollments, courses, tracking] = await Promise.all([
    getAdminLearnerStats(),
    getAdminCourseStats(),
    getRecentEnrollments(5),
    getAdminCourseList(),
    listTrackingEnrollments(),
  ])
  const recentCourses = courses.slice(0, 5)
  const recentTracking = tracking.slice(0, 5)

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
