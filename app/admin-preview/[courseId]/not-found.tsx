import { NotFoundState } from "@/components/errors/NotFoundState"

export default function AdminPreviewNotFound() {
  return (
    <NotFoundState
      title="Course not found"
      description="This course doesn't exist or is no longer available."
      homeHref="/admin/dashboard"
    />
  )
}
