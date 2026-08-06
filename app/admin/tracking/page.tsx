import { Activity, GraduationCap } from "lucide-react"

import { getTrackingStats, listTrackingEnrollments } from "@/lib/tracking-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { StatCard } from "@/components/admin/StatCard"
import { TrackingListClient } from "@/components/admin/tracking/TrackingListClient"

export default async function AdminTrackingPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  await requireAdmin()

  const raw = await searchParams
  const params = parseListParams<Record<string, never>>(raw, {
    sortable: ["enrolled_at"],
    defaultSort: "enrolled_at",
    defaultDir: "desc",
  })

  const [page, stats] = await Promise.all([listTrackingEnrollments(params), getTrackingStats()])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">Online Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Track each learner&apos;s module and assignment completion per course
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={GraduationCap} label="Tracked Enrollments" value={stats.totalEnrollments} />
        <StatCard icon={Activity} label="Avg Module Completion" value={`${stats.avgModulePct}%`} />
      </div>

      <TrackingListClient page={page} />
    </div>
  )
}
