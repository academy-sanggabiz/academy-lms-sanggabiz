import { SignupForm } from "@/components/auth/SignupForm"

export default function LearnerSignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-background to-secondary px-6 py-16">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Sanggabiz" className="size-10 object-contain" />
        <span className="text-2xl font-bold text-ring">sanggabiz</span>
      </div>
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-8">
        <SignupForm />
      </div>
    </div>
  )
}
