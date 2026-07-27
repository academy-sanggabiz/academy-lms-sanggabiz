export type Course = {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  price: number
  level: string | null
  lesson_count: number
  duration_hours: number
  status: "draft" | "published"
  created_by: string | null
  created_at: string
  updated_at: string
}

export function formatPrice(price: number): string {
  if (price <= 0) return "Free"
  return `Rp ${price.toLocaleString("id-ID")}`
}
