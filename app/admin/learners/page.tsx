import { BookOpen, Trophy, Users } from "lucide-react"

import { getAdminCourseList } from "@/lib/courses-admin"
import { getAdminLearnerList, getAdminLearnerStats } from "@/lib/learners-admin"
import { LearnerManagementClient } from "@/components/admin/learners/LearnerManagementClient"
import { StatCard } from "@/components/admin/StatCard"

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
