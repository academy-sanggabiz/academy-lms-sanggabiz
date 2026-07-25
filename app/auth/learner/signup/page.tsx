import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { signup } from "../actions"

export default async function LearnerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-background to-secondary px-6 py-16">
      <div className="text-2xl font-bold text-ring">sanggabiz</div>
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground">Start learning with Sanggabiz.</p>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <form action={signup} className="space-y-3">
          <Input type="text" name="fullName" placeholder="Full name" required />
          <Input type="email" name="email" placeholder="Email" required />
          <Input type="password" name="password" placeholder="Password" required minLength={6} />
          <Button type="submit" className="w-full">
            Sign up
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/learner/login" className="text-ring hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
