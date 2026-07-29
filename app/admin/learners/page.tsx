import { BookOpen, Trophy, Users } from "lucide-react"

import { getAdminCourseList } from "@/lib/courses-admin"
import { getAdminLearnerList, getAdminLearnerStats } from "@/lib/learners-admin"
import { LearnerManagementClient } from "@/components/admin/learners/LearnerManagementClient"

export default async function AdminLearnersPage() {
  const [learners, stats, courses] = await Promise.all([
    getAdminLearnerList(),
    getAdminLearnerStats(),
    getAdminCourseList(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">Learner Management</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all learners enrolled in courses
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total Learners" value={stats.totalLearners} />
        <StatCard icon={BookOpen} label="Total Enrollments" value={stats.totalEnrollments} />
        <StatCard icon={Trophy} label="Completed Courses" value={stats.totalCompleted} />
      </div>

      <LearnerManagementClient learners={learners} courses={courses} />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number
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
