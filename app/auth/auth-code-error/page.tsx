import Link from "next/link"

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-background to-secondary px-6 text-center">
      <div className="text-2xl font-bold text-ring">sanggabiz</div>
      <p className="text-muted-foreground">
        We couldn&apos;t complete your sign-in. The link may have expired or already been used.
      </p>
      <Link href="/auth/learner/login" className="text-ring hover:underline">
        Back to login
      </Link>
    </div>
  )
}
