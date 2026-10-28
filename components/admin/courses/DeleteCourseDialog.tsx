"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteCourseAction } from "@/app/admin/courses/actions"

export function DeleteCourseDialog({
  courseId,
  courseTitle,
  className,
}: {
  courseId: string
  courseTitle: string
  className?: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourseAction(courseId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Kursus dihapus")
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="destructive" className={className} aria-label="Hapus kursus" />}
      >
        <Trash2 className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus &quot;{courseTitle}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Kursus beserta seluruh modul, pelajaran, dan sumber belajarnya akan dihapus permanen.
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Menghapus…" : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
