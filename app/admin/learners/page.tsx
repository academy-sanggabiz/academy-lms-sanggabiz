import { BookOpen, Trophy, Users } from "lucide-react"

import { getAllAdminCourses } from "@/lib/courses-admin"
import { getAdminLearnerList, getAdminLearnerStats, type AdminLearnerFilters } from "@/lib/learners-admin"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { LearnerManagementClient } from "@/components/admin/learners/LearnerManagementClient"
import { StatCard } from "@/components/admin/StatCard"

export default async function AdminLearnersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const raw = await searchParams
  const params = parseListParams<AdminLearnerFilters>(raw, {
    sortable: ["name", "enrolled"],
    defaultSort: "name",
    defaultDir: "asc",
    filters: { filter: ["all", "enrolled", "completed"] },
  })

  const [page, stats, courses] = await Promise.all([
    getAdminLearnerList(params),
    getAdminLearnerStats(),
    getAllAdminCourses(),
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

      <LearnerManagementClient page={page} courses={courses} />
    </div>
  )
}
