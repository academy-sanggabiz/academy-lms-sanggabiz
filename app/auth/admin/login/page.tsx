import { redirect } from "next/navigation"

// The learner/admin login pages were consolidated into a single role-routing
// page at /auth/login. This route is kept as a redirect so old links/bookmarks
// still work.
export default function AdminLoginRedirect() {
  redirect("/auth/login")
}
