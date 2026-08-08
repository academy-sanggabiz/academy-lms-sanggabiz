"use client"

import { useEffect } from "react"

import { ErrorState } from "@/components/errors/ErrorState"

export default function LearnerError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <ErrorState retry={unstable_retry} homeHref="/learner/dashboard" />
}
