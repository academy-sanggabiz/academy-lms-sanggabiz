import { NotFoundState } from "@/components/errors/NotFoundState"

export default function LearnCourseNotFound() {
  return (
    <NotFoundState
      title="Course not found"
      description="This course doesn't exist, or you don't have access to it."
      homeHref="/learner/dashboard"
    />
  )
}
