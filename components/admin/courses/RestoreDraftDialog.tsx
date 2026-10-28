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
  if (diffMinutes < 1) return "baru saja"
  if (diffMinutes === 1) return "1 menit lalu"
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours === 1) return "1 jam lalu"
  if (diffHours < 24) return `${diffHours} jam lalu`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} hari lalu`
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
          <AlertDialogTitle>Ditemukan perubahan yang belum disimpan</AlertDialogTitle>
          <AlertDialogDescription>
            Ada perubahan dari {relativeTime(updatedAt)} yang belum pernah disimpan. Pulihkan
            perubahan tersebut, atau buang dan gunakan versi tersimpan?
            {isStale && (
              <span className="mt-2 block">
                Kursus ini juga sudah berubah di server sejak saat itu. Jika dipulihkan, perubahan
                di server akan tertimpa saat Anda menyimpan.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Buang</AlertDialogCancel>
          <AlertDialogAction onClick={onRestore}>Pulihkan</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
