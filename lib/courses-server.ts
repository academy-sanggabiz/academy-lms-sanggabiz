import { createClient } from "@/lib/supabase/server"
import type { Course } from "@/lib/courses"

export async function getPublishedCourses(): Promise<Course[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("created_at")

  if (error) {
    console.error("getPublishedCourses failed:", error.message)
    return []
  }

  return data
}
