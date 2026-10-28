/** Client-safe formatting shared by the notification dropdown and the full list page. */

/** "baru saja" / "3 jam lalu" / "2 hari lalu" -- enough precision for a notification list. */
export function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "baru saja"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}
