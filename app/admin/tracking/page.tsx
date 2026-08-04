import { Activity, GraduationCap } from "lucide-react"

import { listTrackingEnrollments } from "@/lib/tracking-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { StatCard } from "@/components/admin/StatCard"
import { TrackingListClient } from "@/components/admin/tracking/TrackingListClient"

export default async function AdminTrackingPage() {
  await requireAdmin()
  const enrollments = await listTrackingEnrollments()

  const avgModulePct = enrollments.length
    ? Math.round(enrollments.reduce((sum, e) => sum + e.modulePct, 0) / enrollments.length)
    : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">Online Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Track each learner&apos;s module and assignment completion per course
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={GraduationCap} label="Tracked Enrollments" value={enrollments.length} />
        <StatCard icon={Activity} label="Avg Module Completion" value={`${avgModulePct}%`} />
      </div>

      <TrackingListClient enrollments={enrollments} />
    </div>
  )
}
