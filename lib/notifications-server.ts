import { createClient } from "@/lib/supabase/server"
import { paginated, rangeFor, type ListParams, type Paginated } from "@/lib/pagination"

/** Server-only data access for in-app notifications -- never import from a Client Component. */

export type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationFeed = {
  items: Notification[]
  unreadCount: number
}

/**
 * Recent notifications for the current user, plus the unread count for the
 * bell badge. RLS restricts this to the caller's own rows, so there's no
 * learner_id filter to add.
 *
 * unreadCount is counted separately rather than derived from `items`, so the
 * badge stays correct when there are more unread rows than `limit`.
 */
export async function getNotifications(limit = 10): Promise<NotificationFeed> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { items: [], unreadCount: 0 }

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .is("read_at", null),
  ])

  if (error || !data) {
    console.error("getNotifications failed:", error?.message)
    return { items: [], unreadCount: 0 }
  }
  if (countError) console.error("getNotifications unread count failed:", countError.message)

  return {
    items: data.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      readAt: row.read_at,
      createdAt: row.created_at,
    })),
    unreadCount: count ?? 0,
  }
}

/**
 * Full notification history for the current user, server-paginated for the
 * /learner/notifications "see all" page. Same RLS scoping as getNotifications.
 */
export async function getNotificationsPaginated(
  params: ListParams
): Promise<Paginated<Notification>> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return paginated([], 0, params)

  const { data, error, count } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at", { count: "exact" })
    .order(params.sort, { ascending: params.dir === "asc" })
    .range(...rangeFor(params.page, params.pageSize))

  if (error || !data) {
    console.error("getNotificationsPaginated failed:", error?.message)
    return paginated([], 0, params)
  }

  const rows: Notification[] = data.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  }))

  return paginated(rows, count, params)
}
