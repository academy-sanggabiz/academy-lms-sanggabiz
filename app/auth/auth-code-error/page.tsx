import Link from "next/link"

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-background to-secondary px-6 text-center">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Sanggabiz" className="size-10 object-contain" />
        <span className="text-2xl font-bold text-ring">sanggabiz</span>
      </div>
      <p className="text-muted-foreground">
        {message ?? "We couldn't complete your sign-in. The link may have expired or already been used."}
      </p>
      <Link href="/auth/login" className="text-ring hover:underline">
        Back to login
      </Link>
    </div>
  )
}
