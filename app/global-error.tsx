"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Poppins, Geist_Mono } from "next/font/google"

import "./globals.css"

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full items-center justify-center bg-background px-6 py-24 text-foreground">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. You can try again or reload the page.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => unstable_retry()}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium hover:bg-muted"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
