import { notFound } from "next/navigation"

import { getTrackingDetail } from "@/lib/tracking-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { TrackingBreadcrumb } from "@/components/admin/tracking/TrackingBreadcrumb"
import { TrackingDetailView } from "@/components/admin/tracking/TrackingDetailView"

export default async function AdminTrackingDetailPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>
}) {
  await requireAdmin()
  const { enrollmentId } = await params
  const detail = await getTrackingDetail(enrollmentId)
  if (!detail) notFound()

  return (
    <div>
      <TrackingBreadcrumb learnerName={detail.learnerName} courseTitle={detail.courseTitle} />
      <TrackingDetailView detail={detail} />
    </div>
  )
}
