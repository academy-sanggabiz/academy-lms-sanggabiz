"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function relativeTime(ms: number): string {
  const diffMinutes = Math.round((Date.now() - ms) / 60_000)
  if (diffMinutes < 1) return "just now"
  if (diffMinutes === 1) return "1 minute ago"
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours === 1) return "1 hour ago"
  if (diffHours < 24) return `${diffHours} hours ago`
  const diffDays = Math.round(diffHours / 24)
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`
}

// No onOpenChange -- deliberately not light-dismissable. The admin must
// pick Restore or Discard rather than losing the choice to a stray Escape.
export function RestoreDraftDialog({
  updatedAt,
  isStale,
  onRestore,
  onDiscard,
}: {
  updatedAt: number
  isStale: boolean
  onRestore: () => void
  onDiscard: () => void
}) {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes found</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes from {relativeTime(updatedAt)} that were never saved. Restore
            them, or discard and use the saved version?
            {isStale && (
              <span className="mt-2 block">
                This course has also changed on the server since then — restoring will overwrite
                those changes the next time you save.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Discard</AlertDialogCancel>
          <AlertDialogAction onClick={onRestore}>Restore</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
