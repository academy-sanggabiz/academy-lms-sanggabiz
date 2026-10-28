import { getNotificationsPaginated } from "@/lib/notifications-server"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { NotificationsListClient } from "@/components/learner/NotificationsListClient"

export default async function LearnerNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const raw = await searchParams
  const params = parseListParams<Record<string, never>>(raw, {
    sortable: ["created_at"],
    defaultSort: "created_at",
    defaultDir: "desc",
    defaultPageSize: 10,
  })

  const page = await getNotificationsPaginated(params)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">Notifikasi</h1>
        <p className="text-sm text-muted-foreground">
          Semua notifikasi Anda, dari yang terbaru
        </p>
      </div>

      <NotificationsListClient page={page} />
    </div>
  )
}
