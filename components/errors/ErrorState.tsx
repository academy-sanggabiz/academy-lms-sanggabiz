import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again or head back home.",
  retry,
  retryLabel = "Try again",
  homeHref = "/",
}: {
  title?: string
  description?: string
  retry?: () => void
  retryLabel?: string
  homeHref?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-24">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {retry ? (
              <Button onClick={retry}>{retryLabel}</Button>
            ) : null}
            <Button
              variant="outline"
              render={<Link href={homeHref} />}
              nativeButton={false}
            >
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
