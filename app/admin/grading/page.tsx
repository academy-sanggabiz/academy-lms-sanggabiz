import { ClipboardCheck } from "lucide-react"

import { listPendingAttempts } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { StatCard } from "@/components/admin/StatCard"
import { GradingListClient } from "@/components/admin/grading/GradingListClient"

export default async function AdminGradingPage() {
  await requireAdmin()
  const attempts = await listPendingAttempts()
  const quizIds = new Set(attempts.map((a) => a.quizId))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">Grading</h1>
        <p className="text-sm text-muted-foreground">
          Review and score essay questions that can&apos;t be graded automatically
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={ClipboardCheck} label="Attempts Pending Review" value={attempts.length} />
        <StatCard icon={ClipboardCheck} label="Quizzes Affected" value={quizIds.size} />
      </div>

      <GradingListClient attempts={attempts} />
    </div>
  )
}
