import Link from "next/link"
import { FileQuestion } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function NotFoundState({
  title = "Page not found",
  description = "The page you're looking for doesn't exist or may have been moved.",
  homeHref = "/",
}: {
  title?: string
  description?: string
  homeHref?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-24">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileQuestion className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button
            variant="outline"
            render={<Link href={homeHref} />}
            nativeButton={false}
            className="mt-2"
          >
            Go home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
