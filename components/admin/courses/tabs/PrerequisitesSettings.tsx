"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { CoursePrerequisite } from "@/lib/courses-admin"
import {
  addPrerequisiteAction,
  removePrerequisiteAction,
  setRequirePrerequisitesAction,
} from "@/app/admin/courses/settings-actions"

export function PrerequisitesSettings({
  courseId,
  requirePrerequisites,
  prerequisites,
  availableCourses,
}: {
  courseId: string
  requirePrerequisites: boolean
  prerequisites: CoursePrerequisite[]
  availableCourses: CoursePrerequisite[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [required, setRequired] = useState(requirePrerequisites)
  const [pickerValue, setPickerValue] = useState<string>("")

  const pickableCourses = availableCourses.filter((c) => !prerequisites.some((p) => p.id === c.id))

  function handleToggle(checked: boolean) {
    setRequired(checked)
    startTransition(async () => {
      const result = await setRequirePrerequisitesAction(courseId, checked)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleAdd() {
    if (!pickerValue) return
    startTransition(async () => {
      const result = await addPrerequisiteAction(courseId, pickerValue)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPickerValue("")
      router.refresh()
    })
  }

  function handleRemove(prerequisiteCourseId: string) {
    startTransition(async () => {
      const result = await removePrerequisiteAction(courseId, prerequisiteCourseId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <section className="space-y-3">
      <h3 className="text-[17px] font-bold">Prerequisites Settings</h3>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="text-sm font-medium">Require Prerequisites</div>
          <div className="text-xs text-muted-foreground">
            Require learners to complete other courses before enrolling in this course
          </div>
        </div>
        <Switch checked={required} onCheckedChange={handleToggle} disabled={isPending} />
      </div>

      {required && (
        <div className="space-y-3 border-t border-border pt-3.5">
          <div>
            <div className="mb-2.5 text-xs font-semibold">Prerequisite Courses</div>
            <div className="flex gap-2.5">
              <Select value={pickerValue} onValueChange={(v) => v && setPickerValue(v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {pickableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleAdd} disabled={!pickerValue || isPending}>
                Add
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Select courses that must be completed before learners can enroll in this course
            </p>
          </div>

          {prerequisites.length > 0 && (
            <div className="flex flex-col gap-2">
              {prerequisites.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{course.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(course.id)}
                    disabled={isPending}
                    className="shrink-0 text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
